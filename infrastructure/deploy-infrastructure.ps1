# Certificate Management Platform - Complete Infrastructure Deployment Script
param(
    [Parameter(Position=0)]
    [ValidateSet("production", "staging", "development")]
    [string]$Environment = "production",
    
    [string]$AwsRegion = "us-east-1",
    [string]$DomainName = "",
    [string]$HostedZoneId = "",
    [switch]$SkipSSL,
    [switch]$EnableBlueGreen,
    [switch]$DeployMonitoring = $true
)

# Configuration
$StackPrefix = "certificate-management-$Environment"
$EcrRepository = "certificate-management-platform"

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

function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check AWS CLI
    if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
        Write-Error "AWS CLI is not installed"
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

function Deploy-ECRRepository {
    Write-Info "Deploying ECR repository..."
    
    $StackName = "$StackPrefix-ecr"
    
    aws cloudformation deploy `
        --template-file infrastructure/cloudformation/ecr-repository.yml `
        --stack-name $StackName `
        --parameter-overrides RepositoryName=$EcrRepository `
        --region $AwsRegion
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "ECR repository deployment failed"
        exit 1
    }
    
    Write-Info "ECR repository deployed successfully"
}

function Deploy-MainInfrastructure {
    param([string]$ImageUri)
    
    Write-Info "Deploying main infrastructure..."
    
    $StackName = $StackPrefix
    
    # Generate random password for database
    $DbPassword = -join ((1..25) | ForEach {Get-Random -input ([char[]]([char]'a'..[char]'z') + [char[]]([char]'A'..[char]'Z') + [char[]]([char]'0'..[char]'9'))})
    
    aws cloudformation deploy `
        --template-file infrastructure/cloudformation/ecs-infrastructure.yml `
        --stack-name $StackName `
        --parameter-overrides Environment=$Environment ContainerImage=$ImageUri DBPassword=$DbPassword `
        --capabilities CAPABILITY_NAMED_IAM `
        --region $AwsRegion
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Main infrastructure deployment failed"
        exit 1
    }
    
    Write-Info "Main infrastructure deployed successfully"
    
    # Store database password in Systems Manager Parameter Store
    aws ssm put-parameter `
        --name "/$Environment/certificate-management/database/password" `
        --value $DbPassword `
        --type "SecureString" `
        --overwrite `
        --region $AwsRegion
    
    return $StackName
}

function Deploy-MonitoringAndSecurity {
    param([string]$MainStackName)
    
    if (-not $DeployMonitoring) {
        Write-Info "Skipping monitoring and security deployment"
        return
    }
    
    Write-Info "Deploying monitoring and security..."
    
    $StackName = "$StackPrefix-monitoring"
    
    # Get outputs from main stack
    $MainStackOutputs = aws cloudformation describe-stacks --stack-name $MainStackName --region $AwsRegion --query 'Stacks[0].Outputs' | ConvertFrom-Json
    
    $ECSClusterName = ($MainStackOutputs | Where-Object {$_.OutputKey -eq "ECSClusterName"}).OutputValue
    $LoadBalancerDNS = ($MainStackOutputs | Where-Object {$_.OutputKey -eq "LoadBalancerDNS"}).OutputValue
    $DatabaseEndpoint = ($MainStackOutputs | Where-Object {$_.OutputKey -eq "DatabaseEndpoint"}).OutputValue
    
    # Extract load balancer and target group names from ARNs (simplified approach)
    $LoadBalancerFullName = "$Environment-certificate-management-alb"
    $TargetGroupFullName = "$Environment-certificate-management-tg"
    $DatabaseInstanceId = "$Environment-certificate-management-db"
    $ECSServiceName = "$Environment-certificate-management-service"
    
    aws cloudformation deploy `
        --template-file infrastructure/cloudformation/monitoring-security.yml `
        --stack-name $StackName `
        --parameter-overrides `
            Environment=$Environment `
            ECSClusterName=$ECSClusterName `
            ECSServiceName=$ECSServiceName `
            LoadBalancerFullName=$LoadBalancerFullName `
            TargetGroupFullName=$TargetGroupFullName `
            DatabaseInstanceId=$DatabaseInstanceId `
        --capabilities CAPABILITY_NAMED_IAM `
        --region $AwsRegion
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Monitoring and security deployment failed"
        exit 1
    }
    
    Write-Info "Monitoring and security deployed successfully"
}

function Deploy-SSLConfiguration {
    param([string]$MainStackName)
    
    if ($SkipSSL -or [string]::IsNullOrEmpty($DomainName)) {
        Write-Info "Skipping SSL configuration"
        return
    }
    
    Write-Info "Deploying SSL configuration..."
    
    $StackName = "$StackPrefix-ssl"
    
    # Get outputs from main stack
    $MainStackOutputs = aws cloudformation describe-stacks --stack-name $MainStackName --region $AwsRegion --query 'Stacks[0].Outputs' | ConvertFrom-Json
    
    $LoadBalancerArn = "arn:aws:elasticloadbalancing:$AwsRegion:" + (aws sts get-caller-identity --query Account --output text) + ":loadbalancer/app/$Environment-certificate-management-alb/*"
    $LoadBalancerDNS = ($MainStackOutputs | Where-Object {$_.OutputKey -eq "LoadBalancerDNS"}).OutputValue
    $TargetGroupArn = "arn:aws:elasticloadbalancing:$AwsRegion:" + (aws sts get-caller-identity --query Account --output text) + ":targetgroup/$Environment-certificate-management-tg/*"
    
    $Parameters = @(
        "Environment=$Environment",
        "DomainName=$DomainName",
        "LoadBalancerArn=$LoadBalancerArn",
        "LoadBalancerDNSName=$LoadBalancerDNS",
        "TargetGroupArn=$TargetGroupArn"
    )
    
    if (-not [string]::IsNullOrEmpty($HostedZoneId)) {
        $Parameters += "HostedZoneId=$HostedZoneId"
    }
    
    aws cloudformation deploy `
        --template-file infrastructure/cloudformation/ssl-certificate.yml `
        --stack-name $StackName `
        --parameter-overrides $Parameters `
        --capabilities CAPABILITY_NAMED_IAM `
        --region $AwsRegion
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "SSL configuration deployment failed"
        exit 1
    }
    
    Write-Info "SSL configuration deployed successfully"
}

function Deploy-BlueGreenConfiguration {
    param([string]$MainStackName)
    
    if (-not $EnableBlueGreen) {
        Write-Info "Skipping blue-green deployment configuration"
        return
    }
    
    Write-Info "Deploying blue-green deployment configuration..."
    
    $StackName = "$StackPrefix-blue-green"
    
    # Get outputs from main stack
    $MainStackOutputs = aws cloudformation describe-stacks --stack-name $MainStackName --region $AwsRegion --query 'Stacks[0].Outputs' | ConvertFrom-Json
    
    $ECSClusterName = ($MainStackOutputs | Where-Object {$_.OutputKey -eq "ECSClusterName"}).OutputValue
    $ECSServiceName = "$Environment-certificate-management-service"
    $TargetGroupArn = "arn:aws:elasticloadbalancing:$AwsRegion:" + (aws sts get-caller-identity --query Account --output text) + ":targetgroup/$Environment-certificate-management-tg/*"
    $ListenerArn = "arn:aws:elasticloadbalancing:$AwsRegion:" + (aws sts get-caller-identity --query Account --output text) + ":listener/app/$Environment-certificate-management-alb/*"
    
    aws cloudformation deploy `
        --template-file infrastructure/cloudformation/blue-green-deployment.yml `
        --stack-name $StackName `
        --parameter-overrides `
            Environment=$Environment `
            ECSClusterName=$ECSClusterName `
            ECSServiceName=$ECSServiceName `
            TargetGroupArn=$TargetGroupArn `
            ListenerArn=$ListenerArn `
        --capabilities CAPABILITY_NAMED_IAM `
        --region $AwsRegion
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Blue-green deployment configuration failed"
        exit 1
    }
    
    Write-Info "Blue-green deployment configuration deployed successfully"
}

function Get-DeploymentOutputs {
    param([string]$MainStackName)
    
    Write-Info "Deployment Summary:"
    Write-Info "==================="
    
    # Get main stack outputs
    $MainStackOutputs = aws cloudformation describe-stacks --stack-name $MainStackName --region $AwsRegion --query 'Stacks[0].Outputs' | ConvertFrom-Json
    
    foreach ($output in $MainStackOutputs) {
        Write-Info "$($output.OutputKey): $($output.OutputValue)"
    }
    
    # Application URL
    $LoadBalancerDNS = ($MainStackOutputs | Where-Object {$_.OutputKey -eq "LoadBalancerDNS"}).OutputValue
    
    if (-not [string]::IsNullOrEmpty($DomainName) -and -not $SkipSSL) {
        Write-Info "Application URL: https://$DomainName"
    } else {
        Write-Info "Application URL: http://$LoadBalancerDNS"
    }
    
    Write-Info "Health Check URL: http://$LoadBalancerDNS/api/health"
    Write-Info "CloudWatch Logs: /ecs/$Environment-certificate-management"
}

function Start-InfrastructureDeployment {
    Write-Info "Starting complete infrastructure deployment for environment: $Environment"
    Write-Info "AWS Region: $AwsRegion"
    
    Test-Prerequisites
    
    # Deploy ECR repository first
    Deploy-ECRRepository
    
    # Get ECR URI for placeholder image (will be updated by CI/CD)
    $AccountId = aws sts get-caller-identity --query Account --output text
    $EcrUri = "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com"
    $PlaceholderImage = "$EcrUri/$EcrRepository`:latest"
    
    # Deploy main infrastructure
    $MainStackName = Deploy-MainInfrastructure $PlaceholderImage
    
    # Deploy monitoring and security
    Deploy-MonitoringAndSecurity $MainStackName
    
    # Deploy SSL configuration if domain is provided
    Deploy-SSLConfiguration $MainStackName
    
    # Deploy blue-green configuration if enabled
    Deploy-BlueGreenConfiguration $MainStackName
    
    # Show deployment summary
    Get-DeploymentOutputs $MainStackName
    
    Write-Info "Infrastructure deployment completed successfully!"
    Write-Info "Next steps:"
    Write-Info "1. Push your application image to ECR: $PlaceholderImage"
    Write-Info "2. Update ECS service to use the new image"
    Write-Info "3. Configure your domain DNS if using custom domain"
    Write-Info "4. Set up SES for email functionality"
}

# Show usage
function Show-Usage {
    Write-Host "Usage: .\deploy-infrastructure.ps1 [Environment] [Options]"
    Write-Host ""
    Write-Host "Parameters:"
    Write-Host "  Environment       : production, staging, or development (default: production)"
    Write-Host "  -AwsRegion        : AWS region (default: us-east-1)"
    Write-Host "  -DomainName       : Custom domain name for SSL certificate"
    Write-Host "  -HostedZoneId     : Route 53 hosted zone ID for domain"
    Write-Host "  -SkipSSL          : Skip SSL certificate configuration"
    Write-Host "  -EnableBlueGreen  : Enable blue-green deployment configuration"
    Write-Host "  -DeployMonitoring : Deploy monitoring and security (default: true)"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\deploy-infrastructure.ps1 production"
    Write-Host "  .\deploy-infrastructure.ps1 production -DomainName certificates.example.com -HostedZoneId Z123456789"
    Write-Host "  .\deploy-infrastructure.ps1 staging -AwsRegion us-west-2 -EnableBlueGreen"
}

# Handle help parameter
if ($args -contains "-h" -or $args -contains "--help") {
    Show-Usage
    exit 0
}

# Start deployment
try {
    Start-InfrastructureDeployment
}
catch {
    Write-Error "Infrastructure deployment failed: $($_.Exception.Message)"
    exit 1
}