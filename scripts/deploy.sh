#!/bin/bash

# Certificate Management Platform Deployment Script
set -e

# Configuration
ENVIRONMENT=${1:-production}
AWS_REGION=${AWS_REGION:-us-east-1}
STACK_NAME="certificate-management-${ENVIRONMENT}"
ECR_REPOSITORY="certificate-management-platform"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Create ECR repository if it doesn't exist
create_ecr_repository() {
    log_info "Creating ECR repository if it doesn't exist..."
    
    if ! aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $AWS_REGION &> /dev/null; then
        aws ecr create-repository \
            --repository-name $ECR_REPOSITORY \
            --region $AWS_REGION \
            --image-scanning-configuration scanOnPush=true
        log_info "ECR repository created: $ECR_REPOSITORY"
    else
        log_info "ECR repository already exists: $ECR_REPOSITORY"
    fi
}

# Build and push Docker image
build_and_push_image() {
    log_info "Building and pushing Docker image..."
    
    # Get ECR login token
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com
    
    # Build image
    IMAGE_TAG=$(git rev-parse --short HEAD)
    ECR_URI=$(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG
    
    log_info "Building image with tag: $IMAGE_TAG"
    docker build -t $ECR_REPOSITORY:$IMAGE_TAG .
    docker tag $ECR_REPOSITORY:$IMAGE_TAG $ECR_URI
    
    # Push image
    log_info "Pushing image to ECR: $ECR_URI"
    docker push $ECR_URI
    
    echo $ECR_URI
}

# Deploy CloudFormation stack
deploy_infrastructure() {
    local image_uri=$1
    log_info "Deploying infrastructure stack: $STACK_NAME"
    
    # Generate random password for database
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    # Deploy stack
    aws cloudformation deploy \
        --template-file infrastructure/cloudformation/ecs-infrastructure.yml \
        --stack-name $STACK_NAME \
        --parameter-overrides \
            Environment=$ENVIRONMENT \
            ContainerImage=$image_uri \
            DBPassword=$DB_PASSWORD \
        --capabilities CAPABILITY_NAMED_IAM \
        --region $AWS_REGION
    
    log_info "Infrastructure deployment completed"
    
    # Get stack outputs
    aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --query 'Stacks[0].Outputs'
}

# Update ECS service
update_service() {
    local image_uri=$1
    log_info "Updating ECS service with new image..."
    
    # Get cluster and service names from stack outputs
    CLUSTER_NAME=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`ECSClusterName`].OutputValue' \
        --output text)
    
    SERVICE_NAME="${ENVIRONMENT}-certificate-management-service"
    
    # Force new deployment
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service $SERVICE_NAME \
        --force-new-deployment \
        --region $AWS_REGION
    
    log_info "Service update initiated"
}

# Main deployment function
main() {
    log_info "Starting deployment for environment: $ENVIRONMENT"
    
    check_prerequisites
    create_ecr_repository
    
    IMAGE_URI=$(build_and_push_image)
    log_info "Image URI: $IMAGE_URI"
    
    # Check if stack exists
    if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $AWS_REGION &> /dev/null; then
        log_info "Stack exists, updating service only"
        update_service $IMAGE_URI
    else
        log_info "Stack doesn't exist, deploying infrastructure"
        deploy_infrastructure $IMAGE_URI
    fi
    
    log_info "Deployment completed successfully!"
    log_info "Application will be available at the Load Balancer DNS name"
}

# Script usage
usage() {
    echo "Usage: $0 [environment]"
    echo "  environment: production, staging, or development (default: production)"
    echo ""
    echo "Environment variables:"
    echo "  AWS_REGION: AWS region (default: us-east-1)"
    echo ""
    echo "Examples:"
    echo "  $0 production"
    echo "  $0 staging"
    echo "  AWS_REGION=us-west-2 $0 production"
}

# Handle script arguments
case "$1" in
    -h|--help)
        usage
        exit 0
        ;;
    "")
        main
        ;;
    production|staging|development)
        main
        ;;
    *)
        log_error "Invalid environment: $1"
        usage
        exit 1
        ;;
esac