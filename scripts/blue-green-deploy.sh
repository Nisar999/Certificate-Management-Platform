#!/bin/bash

# Certificate Management Platform Blue-Green Deployment Script
set -e

# Configuration
ENVIRONMENT=${1:-production}
AWS_REGION=${AWS_REGION:-us-east-1}
STACK_NAME="certificate-management-${ENVIRONMENT}"
ECR_REPOSITORY="certificate-management-platform"
CODEDEPLOY_APP_NAME="${ENVIRONMENT}-certificate-management-app"
CODEDEPLOY_DG_NAME="${ENVIRONMENT}-certificate-management-dg"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
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
    
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed"
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
        # Deploy ECR repository stack
        aws cloudformation deploy \
            --template-file infrastructure/cloudformation/ecr-repository.yml \
            --stack-name "${STACK_NAME}-ecr" \
            --parameter-overrides RepositoryName=$ECR_REPOSITORY \
            --region $AWS_REGION
        log_info "ECR repository stack deployed"
    else
        log_info "ECR repository already exists: $ECR_REPOSITORY"
    fi
}

# Build and push Docker image
build_and_push_image() {
    log_info "Building and pushing Docker image..."
    
    # Get ECR login token
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com
    
    # Build image with multiple tags
    IMAGE_TAG=$(git rev-parse --short HEAD)
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    ECR_URI=$(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY
    
    log_info "Building image with tag: $IMAGE_TAG"
    docker build -t $ECR_REPOSITORY:$IMAGE_TAG .
    
    # Tag with multiple tags for better tracking
    docker tag $ECR_REPOSITORY:$IMAGE_TAG $ECR_URI:$IMAGE_TAG
    docker tag $ECR_REPOSITORY:$IMAGE_TAG $ECR_URI:$ENVIRONMENT-$TIMESTAMP
    docker tag $ECR_REPOSITORY:$IMAGE_TAG $ECR_URI:$ENVIRONMENT-latest
    
    # Push all tags
    log_info "Pushing images to ECR"
    docker push $ECR_URI:$IMAGE_TAG
    docker push $ECR_URI:$ENVIRONMENT-$TIMESTAMP
    docker push $ECR_URI:$ENVIRONMENT-latest
    
    echo "$ECR_URI:$IMAGE_TAG"
}

# Create task definition revision
create_task_definition_revision() {
    local image_uri=$1
    log_info "Creating new task definition revision..."
    
    # Get current task definition
    TASK_DEF_ARN=$(aws ecs describe-services \
        --cluster "${ENVIRONMENT}-certificate-management-cluster" \
        --services "${ENVIRONMENT}-certificate-management-service" \
        --region $AWS_REGION \
        --query 'services[0].taskDefinition' \
        --output text)
    
    # Download current task definition
    aws ecs describe-task-definition \
        --task-definition $TASK_DEF_ARN \
        --region $AWS_REGION \
        --query 'taskDefinition' > current-task-def.json
    
    # Update image URI in task definition
    jq --arg IMAGE_URI "$image_uri" \
       '.containerDefinitions[0].image = $IMAGE_URI | del(.taskDefinitionArn) | del(.revision) | del(.status) | del(.requiresAttributes) | del(.placementConstraints) | del(.compatibilities) | del(.registeredAt) | del(.registeredBy)' \
       current-task-def.json > new-task-def.json
    
    # Register new task definition
    NEW_TASK_DEF_ARN=$(aws ecs register-task-definition \
        --cli-input-json file://new-task-def.json \
        --region $AWS_REGION \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)
    
    log_info "New task definition created: $NEW_TASK_DEF_ARN"
    echo $NEW_TASK_DEF_ARN
}

# Create CodeDeploy deployment
create_blue_green_deployment() {
    local task_def_arn=$1
    log_info "Starting blue-green deployment..."
    
    # Create appspec.yaml for CodeDeploy
    cat > appspec.yaml << EOF
version: 0.0
Resources:
  - TargetService:
      Type: AWS::ECS::Service
      Properties:
        TaskDefinition: "$task_def_arn"
        LoadBalancerInfo:
          ContainerName: "certificate-management-container"
          ContainerPort: 5000
Hooks:
  - BeforeInstall: "LambdaFunctionToValidateBeforeInstall"
  - AfterInstall: "LambdaFunctionToValidateAfterTraffic"
  - AfterAllowTestTraffic: "LambdaFunctionToValidateAfterTestTrafficStarts"
  - BeforeAllowTraffic: "LambdaFunctionToValidateBeforeAllowingProductionTraffic"
  - AfterAllowTraffic: "LambdaFunctionToValidateAfterAllowingProductionTraffic"
EOF
    
    # Create deployment
    DEPLOYMENT_ID=$(aws deploy create-deployment \
        --application-name $CODEDEPLOY_APP_NAME \
        --deployment-group-name $CODEDEPLOY_DG_NAME \
        --revision revisionType=AppSpecContent,appSpecContent='{
            "content": "'$(base64 -w 0 appspec.yaml)'"
        }' \
        --region $AWS_REGION \
        --query 'deploymentId' \
        --output text)
    
    log_info "Deployment created with ID: $DEPLOYMENT_ID"
    
    # Monitor deployment
    monitor_deployment $DEPLOYMENT_ID
}

# Monitor deployment progress
monitor_deployment() {
    local deployment_id=$1
    log_info "Monitoring deployment progress..."
    
    while true; do
        DEPLOYMENT_STATUS=$(aws deploy get-deployment \
            --deployment-id $deployment_id \
            --region $AWS_REGION \
            --query 'deploymentInfo.status' \
            --output text)
        
        case $DEPLOYMENT_STATUS in
            "Created"|"Queued"|"InProgress")
                log_debug "Deployment status: $DEPLOYMENT_STATUS"
                sleep 30
                ;;
            "Succeeded")
                log_info "Deployment completed successfully!"
                break
                ;;
            "Failed"|"Stopped")
                log_error "Deployment failed with status: $DEPLOYMENT_STATUS"
                # Get failure details
                aws deploy get-deployment \
                    --deployment-id $deployment_id \
                    --region $AWS_REGION \
                    --query 'deploymentInfo.errorInformation'
                exit 1
                ;;
            *)
                log_warn "Unknown deployment status: $DEPLOYMENT_STATUS"
                sleep 30
                ;;
        esac
    done
}

# Rollback deployment
rollback_deployment() {
    log_warn "Rolling back deployment..."
    
    # Get the last successful deployment
    LAST_DEPLOYMENT=$(aws deploy list-deployments \
        --application-name $CODEDEPLOY_APP_NAME \
        --deployment-group-name $CODEDEPLOY_DG_NAME \
        --include-only-statuses Succeeded \
        --region $AWS_REGION \
        --query 'deployments[0]' \
        --output text)
    
    if [ "$LAST_DEPLOYMENT" != "None" ]; then
        # Stop current deployment and rollback
        aws deploy stop-deployment \
            --deployment-id $DEPLOYMENT_ID \
            --auto-rollback-enabled \
            --region $AWS_REGION
        log_info "Rollback initiated"
    else
        log_error "No previous successful deployment found for rollback"
    fi
}

# Deploy infrastructure if needed
deploy_infrastructure() {
    local image_uri=$1
    log_info "Checking infrastructure deployment..."
    
    # Check if main stack exists
    if ! aws cloudformation describe-stacks --stack-name $STACK_NAME --region $AWS_REGION &> /dev/null; then
        log_info "Deploying main infrastructure stack..."
        
        # Generate random password for database
        DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
        
        # Deploy main infrastructure
        aws cloudformation deploy \
            --template-file infrastructure/cloudformation/ecs-infrastructure.yml \
            --stack-name $STACK_NAME \
            --parameter-overrides \
                Environment=$ENVIRONMENT \
                ContainerImage=$image_uri \
                DBPassword=$DB_PASSWORD \
            --capabilities CAPABILITY_NAMED_IAM \
            --region $AWS_REGION
        
        log_info "Main infrastructure deployed"
    fi
    
    # Check if blue-green deployment stack exists
    if ! aws cloudformation describe-stacks --stack-name "${STACK_NAME}-bg" --region $AWS_REGION &> /dev/null; then
        log_info "Deploying blue-green deployment stack..."
        
        # Get required parameters from main stack
        CLUSTER_NAME=$(aws cloudformation describe-stacks \
            --stack-name $STACK_NAME \
            --region $AWS_REGION \
            --query 'Stacks[0].Outputs[?OutputKey==`ECSClusterName`].OutputValue' \
            --output text)
        
        TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
            --names "${ENVIRONMENT}-certificate-management-tg" \
            --region $AWS_REGION \
            --query 'TargetGroups[0].TargetGroupArn' \
            --output text)
        
        LISTENER_ARN=$(aws elbv2 describe-listeners \
            --load-balancer-arn $(aws elbv2 describe-load-balancers \
                --names "${ENVIRONMENT}-certificate-management-alb" \
                --region $AWS_REGION \
                --query 'LoadBalancers[0].LoadBalancerArn' \
                --output text) \
            --region $AWS_REGION \
            --query 'Listeners[0].ListenerArn' \
            --output text)
        
        # Deploy blue-green stack
        aws cloudformation deploy \
            --template-file infrastructure/cloudformation/blue-green-deployment.yml \
            --stack-name "${STACK_NAME}-bg" \
            --parameter-overrides \
                Environment=$ENVIRONMENT \
                ECSClusterName=$CLUSTER_NAME \
                ECSServiceName="${ENVIRONMENT}-certificate-management-service" \
                TargetGroupArn=$TARGET_GROUP_ARN \
                ListenerArn=$LISTENER_ARN \
            --capabilities CAPABILITY_NAMED_IAM \
            --region $AWS_REGION
        
        log_info "Blue-green deployment stack deployed"
    fi
}

# Main deployment function
main() {
    log_info "Starting blue-green deployment for environment: $ENVIRONMENT"
    
    check_prerequisites
    create_ecr_repository
    
    IMAGE_URI=$(build_and_push_image)
    log_info "Image URI: $IMAGE_URI"
    
    deploy_infrastructure $IMAGE_URI
    
    # Create new task definition and deploy
    TASK_DEF_ARN=$(create_task_definition_revision $IMAGE_URI)
    create_blue_green_deployment $TASK_DEF_ARN
    
    # Cleanup temporary files
    rm -f current-task-def.json new-task-def.json appspec.yaml
    
    log_info "Blue-green deployment completed successfully!"
}

# Script usage
usage() {
    echo "Usage: $0 [environment] [options]"
    echo "  environment: production, staging, or development (default: production)"
    echo ""
    echo "Options:"
    echo "  --rollback    Rollback the last deployment"
    echo "  --help        Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  AWS_REGION: AWS region (default: us-east-1)"
    echo ""
    echo "Examples:"
    echo "  $0 production"
    echo "  $0 staging"
    echo "  $0 production --rollback"
}

# Handle script arguments
case "$1" in
    -h|--help)
        usage
        exit 0
        ;;
    --rollback)
        rollback_deployment
        exit 0
        ;;
    "")
        main
        ;;
    production|staging|development)
        if [ "$2" = "--rollback" ]; then
            ENVIRONMENT=$1
            rollback_deployment
        else
            main
        fi
        ;;
    *)
        log_error "Invalid argument: $1"
        usage
        exit 1
        ;;
esac