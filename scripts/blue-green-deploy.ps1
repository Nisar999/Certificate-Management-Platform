# Certificate Management Platform Blue-Green Deployment Script
param(
    [Parameter(Position=0)]
    [ValidateSet("production", "staging", "development")]
    [string]$Environment = "production",
    
    [string]$AwsRegion = "us-east-1",
    
    [switch]$Rollback,
    
    [switch]$Help
)

# Configuration
$StackName = "certificate-management-$Environment"
$EcrRepository = "certificate-management-platform"
$CodeDeployAppName = "$Environment-certificate-management-app"
$CodeDeployDgName = "$Environment-certificate-management-dg"

# Helper functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Debug {
    param([string]$Message)
    Write-Host "[DEBUG] $Message" -ForegroundColor Blue
}

# Show usage
function Show-Usage {
    Write-Host "Usage: .\blue-green-deploy.ps1 [Environment] [Options]"
    Write-Host "  Environment: production, staging, or development (default: production)"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Rollback     Rollback the last deployment"
    Write-Host "  -Help         Show this help message"
    Write-Host "  -AwsRegion    AWS region (default: us-east-1)"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\blue-green-deploy.ps1 production"
    Write-Host "  .\blue-green-deploy.ps1 staging -AwsRegion us-west-2"
    Write-Host "  .\blue-green-deploy.ps1 production -Rollback"
}

# Check prerequisites
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check AWS CLI
    if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
        Write-Error "AWS CLI is not installed"
        exit 1
    }
    
    # Check Docker
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker is not installed"
        exit 1
    }
    
    # Check AWS credentials
    try {
        aws sts get-caller-identity --output json | Out-Null
    }
    catch {
        Write-Error "AWS credentials not configured"
        exit 1
    }
    
    Write-Info "Prerequisites check passed"
}

# Create ECR repository if it doesn't exist
function New-EcrRepository {
    Write-Info "Creating ECR repository if it doesn't exist..."
    
    try {
        aws ecr describe-repositories --repository-names $EcrRepository --region $AwsRegion --output json | Out-Null
        Write-Info "ECR repository already exists: $EcrRepository"
    }
    catch {
        # Deploy ECR repository stack
        aws cloudformation deploy --template-file infrastructure/cloudformation/ecr-repository.yml --stack-name "$StackName-ecr" --parameter-overrides RepositoryName=$EcrRepository --region $AwsRegion
        Write-Info "ECR repository stack deployed"
    }
}

# Build and push Docker image
function Build-AndPushImage {
    Write-Info "Building and pushing Docker image..."
    
    # Get ECR login token
    $LoginCommand = aws ecr get-login-password --region $AwsRegion
    $AccountId = (aws sts get-caller-identity --query Account --output text)
    $EcrUri = "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com"
    
    echo $LoginCommand | docker login --username AWS --password-stdin $EcrUri
    
    # Build image with multiple tags
    $ImageTag = (git rev-parse --short HEAD)
    $Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $FullEcrUri = "$EcrUri/$EcrRepository"
    
    Write-Info "Building image with tag: $ImageTag"
    docker build -t "$EcrRepository`:$ImageTag" .
    
    # Tag with multiple tags for better tracking
    docker tag "$EcrRepository`:$ImageTag" "$FullEcrUri`:$ImageTag"
    docker tag "$EcrRepository`:$ImageTag" "$FullEcrUri`:$Environment-$Timestamp"
    docker tag "$EcrRepository`:$ImageTag" "$FullEcrUri`:$Environment-latest"
    
    # Push all tags
    Write-Info "Pushing images to ECR"
    docker push "$FullEcrUri`:$ImageTag"
    docker push "$FullEcrUri`:$Environment-$Timestamp"
    docker push "$FullEcrUri`:$Environment-latest"
    
    return "$FullEcrUri`:$ImageTag"
}

# Create task definition revision
function New-TaskDefinitionRevision {
    param([string]$ImageUri)
    
    Write-Info "Creating new task definition revision..."
    
    # Get current task definition
    $TaskDefArn = aws ecs describe-services --cluster "$Environment-certificate-management-cluster" --services "$Environment-certificate-management-service" --region $AwsRegion --query 'services[0].taskDefinition' --output text
    
    # Download current task definition
    aws ecs describe-task-definition --task-definition $TaskDefArn --region $AwsRegion --query 'taskDefinition' | Out-File -FilePath "current-task-def.json" -Encoding UTF8
    
    # Update image URI in task definition using PowerShell JSON manipulation
    $TaskDef = Get-Content "current-task-def.json" | ConvertFrom-Json
    $TaskDef.containerDefinitions[0].image = $ImageUri
    
    # Remove read-only properties
    $TaskDef.PSObject.Properties.Remove('taskDefinitionArn')
    $TaskDef.PSObject.Properties.Remove('revision')
    $TaskDef.PSObject.Properties.Remove('status')
    $TaskDef.PSObject.Properties.Remove('requiresAttributes')
    $TaskDef.PSObject.Properties.Remove('placementConstraints')
    $TaskDef.PSObject.Properties.Remove('compatibilities')
    $TaskDef.PSObject.Properties.Remove('registeredAt')
    $TaskDef.PSObject.Properties.Remove('registeredBy')
    
    # Save updated task definition
    $TaskDef | ConvertTo-Json -Depth 10 | Out-File -FilePath "new-task-def.json" -Encoding UTF8
    
    # Register new task definition
    $NewTaskDefArn = aws ecs register-task-definition --cli-input-json file://new-task-def.json --region $AwsRegion --query 'taskDefinition.taskDefinitionArn' --output text
    
    Write-Info "New task definition created: $NewTaskDefArn"
    return $NewTaskDefArn
}

# Create CodeDeploy deployment
function New-BlueGreenDeployment {
    param([string]$TaskDefArn)
    
    Write-Info "Starting blue-green deployment..."
    
    # Create appspec.yaml for CodeDeploy
    $AppSpecContent = @"
version: 0.0
Resources:
  - TargetService:
      Type: AWS::ECS::Service
      Properties:
        TaskDefinition: "$TaskDefArn"
        LoadBalancerInfo:
          ContainerName: "certificate-management-container"
          ContainerPort: 5000
Hooks:
  - BeforeInstall: "LambdaFunctionToValidateBeforeInstall"
  - AfterInstall: "LambdaFunctionToValidateAfterTraffic"
  - AfterAllowTestTraffic: "LambdaFunctionToValidateAfterTestTrafficStarts"
  - BeforeAllowTraffic: "LambdaFunctionToValidateBeforeAllowingProductionTraffic"
  - AfterAllowTraffic: "LambdaFunctionToValidateAfterAllowingProductionTraffic"
"@
    
    $AppSpecContent | Out-File -FilePath "appspec.yaml" -Encoding UTF8
    
    # Encode appspec content to base64
    $AppSpecBytes = [System.Text.Encoding]::UTF8.GetBytes($AppSpecContent)
    $AppSpecBase64 = [System.Convert]::ToBase64String($AppSpecBytes)
    
    # Create deployment
    $DeploymentId = aws deploy create-deployment --application-name $CodeDeployAppName --deployment-group-name $CodeDeployDgName --revision "revisionType=AppSpecContent,appSpecContent={`"content`":`"$AppSpecBase64`"}" --region $AwsRegion --query 'deploymentId' --output text
    
    Write-Info "Deployment created with ID: $DeploymentId"
    
    # Monitor deployment
    Watch-Deployment $DeploymentId
}

# Monitor deployment progress
function Watch-Deployment {
    param([string]$DeploymentId)
    
    Write-Info "Monitoring deployment progress..."
    
    while ($true) {
        $DeploymentStatus = aws deploy get-deployment --deployment-id $DeploymentId --region $AwsRegion --query 'deploymentInfo.status' --output text
        
        switch ($DeploymentStatus) {
            { $_ -in @("Created", "Queued", "InProgress") } {
                Write-Debug "Deployment status: $DeploymentStatus"
                Start-Sleep -Seconds 30
            }
            "Succeeded" {
                Write-Info "Deployment completed successfully!"
                return
            }
            { $_ -in @("Failed", "Stopped") } {
                Write-Error "Deployment failed with status: $DeploymentStatus"
                # Get failure details
                aws deploy get-deployment --deployment-id $DeploymentId --region $AwsRegion --query 'deploymentInfo.errorInformation'
                exit 1
            }
            default {
                Write-Warn "Unknown deployment status: $DeploymentStatus"
                Start-Sleep -Seconds 30
            }
        }
    }
}

# Rollback deployment
function Start-Rollback {
    Write-Warn "Rolling back deployment..."
    
    # Get the last successful deployment
    $LastDeployment = aws deploy list-deployments --application-name $CodeDeployAppName --deployment-group-name $CodeDeployDgName --include-only-statuses Succeeded --region $AwsRegion --query 'deployments[0]' --output text
    
    if ($LastDeployment -ne "None") {
        # Stop current deployment and rollback
        aws deploy stop-deployment --deployment-id $DeploymentId --auto-rollback-enabled --region $AwsRegion
        Write-Info "Rollback initiated"
    }
    else {
        Write-Error "No previous successful deployment found for rollback"
    }
}

# Deploy infrastructure if needed
function Deploy-Infrastructure {
    param([string]$ImageUri)
    
    Write-Info "Checking infrastructure deployment..."
    
    # Check if main stack exists
    try {
        aws cloudformation describe-stacks --stack-name $StackName --region $AwsRegion --output json | Out-Null
    }
    catch {
        Write-Info "Deploying main infrastructure stack..."
        
        # Generate random password for database
        $DbPassword = -join ((1..25) | ForEach {Get-Random -input ([char[]]([char]'a'..[char]'z') + [char[]]([char]'A'..[char]'Z') + [char[]]([char]'0'..[char]'9'))})
        
        # Deploy main infrastructure
        aws cloudformation deploy --template-file infrastructure/cloudformation/ecs-infrastructure.yml --stack-name $StackName --parameter-overrides Environment=$Environment ContainerImage=$ImageUri DBPassword=$DbPassword --capabilities CAPABILITY_NAMED_IAM --region $AwsRegion
        
        Write-Info "Main infrastructure deployed"
    }
    
    # Check if blue-green deployment stack exists
    try {
        aws cloudformation describe-stacks --stack-name "$StackName-bg" --region $AwsRegion --output json | Out-Null
    }
    catch {
        Write-Info "Deploying blue-green deployment stack..."
        
        # Get required parameters from main stack
        $ClusterName = aws cloudformation describe-stacks --stack-name $StackName --region $AwsRegion --query 'Stacks[0].Outputs[?OutputKey==`ECSClusterName`].OutputValue' --output text
        
        $TargetGroupArn = aws elbv2 describe-target-groups --names "$Environment-certificate-management-tg" --region $AwsRegion --query 'TargetGroups[0].TargetGroupArn' --output text
        
        $LoadBalancerArn = aws elbv2 describe-load-balancers --names "$Environment-certificate-management-alb" --region $AwsRegion --query 'LoadBalancers[0].LoadBalancerArn' --output text
        
        $ListenerArn = aws elbv2 describe-listeners --load-balancer-arn $LoadBalancerArn --region $AwsRegion --query 'Listeners[0].ListenerArn' --output text
        
        # Deploy blue-green stack
        aws cloudformation deploy --template-file infrastructure/cloudformation/blue-green-deployment.yml --stack-name "$StackName-bg" --parameter-overrides Environment=$Environment ECSClusterName=$ClusterName ECSServiceName="$Environment-certificate-management-service" TargetGroupArn=$TargetGroupArn ListenerArn=$ListenerArn --capabilities CAPABILITY_NAMED_IAM --region $AwsRegion
        
        Write-Info "Blue-green deployment stack deployed"
    }
}

# Main deployment function
function Start-BlueGreenDeployment {
    Write-Info "Starting blue-green deployment for environment: $Environment"
    
    Test-Prerequisites
    New-EcrRepository
    
    $ImageUri = Build-AndPushImage
    Write-Info "Image URI: $ImageUri"
    
    Deploy-Infrastructure $ImageUri
    
    # Create new task definition and deploy
    $TaskDefArn = New-TaskDefinitionRevision $ImageUri
    New-BlueGreenDeployment $TaskDefArn
    
    # Cleanup temporary files
    Remove-Item -Path "current-task-def.json", "new-task-def.json", "appspec.yaml" -ErrorAction SilentlyContinue
    
    Write-Info "Blue-green deployment completed successfully!"
}

# Handle parameters
if ($Help) {
    Show-Usage
    exit 0
}

if ($Rollback) {
    Start-Rollback
    exit 0
}

# Start deployment
try {
    Start-BlueGreenDeployment
}
catch {
    Write-Error "Deployment failed: $($_.Exception.Message)"
    exit 1
}