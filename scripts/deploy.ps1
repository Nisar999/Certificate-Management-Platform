# Certificate Management Platform Deployment Script
param(
    [Parameter(Position=0)]
    [ValidateSet("production", "staging", "development")]
    [string]$Environment = "production",
    
    [string]$AwsRegion = "us-east-1"
)

# Configuration
$StackName = "certificate-management-$Environment"
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
        aws ecr create-repository --repository-name $EcrRepository --region $AwsRegion --image-scanning-configuration scanOnPush=true
        Write-Info "ECR repository created: $EcrRepository"
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
    
    # Build image
    $ImageTag = (git rev-parse --short HEAD)
    $FullImageUri = "$EcrUri/$EcrRepository`:$ImageTag"
    
    Write-Info "Building image with tag: $ImageTag"
    docker build -t "$EcrRepository`:$ImageTag" .
    docker tag "$EcrRepository`:$ImageTag" $FullImageUri
    
    # Push image
    Write-Info "Pushing image to ECR: $FullImageUri"
    docker push $FullImageUri
    
    return $FullImageUri
}

# Deploy CloudFormation stack
function Deploy-Infrastructure {
    param([string]$ImageUri)
    
    Write-Info "Deploying infrastructure stack: $StackName"
    
    # Generate random password for database
    $DbPassword = -join ((1..25) | ForEach {Get-Random -input ([char[]]([char]'a'..[char]'z') + [char[]]([char]'A'..[char]'Z') + [char[]]([char]'0'..[char]'9'))})
    
    # Deploy stack
    aws cloudformation deploy `
        --template-file infrastructure/cloudformation/ecs-infrastructure.yml `
        --stack-name $StackName `
        --parameter-overrides Environment=$Environment ContainerImage=$ImageUri DBPassword=$DbPassword `
        --capabilities CAPABILITY_NAMED_IAM `
        --region $AwsRegion
    
    Write-Info "Infrastructure deployment completed"
    
    # Get stack outputs
    aws cloudformation describe-stacks --stack-name $StackName --region $AwsRegion --query 'Stacks[0].Outputs'
}

# Update ECS service
function Update-Service {
    param([string]$ImageUri)
    
    Write-Info "Updating ECS service with new image..."
    
    # Get cluster name from stack outputs
    $ClusterName = aws cloudformation describe-stacks --stack-name $StackName --region $AwsRegion --query 'Stacks[0].Outputs[?OutputKey==`ECSClusterName`].OutputValue' --output text
    $ServiceName = "$Environment-certificate-management-service"
    
    # Force new deployment
    aws ecs update-service --cluster $ClusterName --service $ServiceName --force-new-deployment --region $AwsRegion
    
    Write-Info "Service update initiated"
}

# Main deployment function
function Start-Deployment {
    Write-Info "Starting deployment for environment: $Environment"
    
    Test-Prerequisites
    New-EcrRepository
    
    $ImageUri = Build-AndPushImage
    Write-Info "Image URI: $ImageUri"
    
    # Check if stack exists
    try {
        aws cloudformation describe-stacks --stack-name $StackName --region $AwsRegion --output json | Out-Null
        Write-Info "Stack exists, updating service only"
        Update-Service $ImageUri
    }
    catch {
        Write-Info "Stack doesn't exist, deploying infrastructure"
        Deploy-Infrastructure $ImageUri
    }
    
    Write-Info "Deployment completed successfully!"
    Write-Info "Application will be available at the Load Balancer DNS name"
}

# Show usage
function Show-Usage {
    Write-Host "Usage: .\deploy.ps1 [Environment] [-AwsRegion Region]"
    Write-Host "  Environment: production, staging, or development (default: production)"
    Write-Host "  AwsRegion: AWS region (default: us-east-1)"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\deploy.ps1 production"
    Write-Host "  .\deploy.ps1 staging -AwsRegion us-west-2"
}

# Handle help parameter
if ($args -contains "-h" -or $args -contains "--help") {
    Show-Usage
    exit 0
}

# Start deployment
try {
    Start-Deployment
}
catch {
    Write-Error "Deployment failed: $($_.Exception.Message)"
    exit 1
}