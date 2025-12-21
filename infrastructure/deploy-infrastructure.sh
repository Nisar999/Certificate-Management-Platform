#!/bin/bash

# Certificate Management Platform - Complete Infrastructure Deployment Script
set -e

# Configuration
ENVIRONMENT=${1:-production}
AWS_REGION=${AWS_REGION:-us-east-1}
DOMAIN_NAME=${DOMAIN_NAME:-""}
HOSTED_ZONE_ID=${HOSTED_ZONE_ID:-""}
SKIP_SSL=${SKIP_SSL:-false}
ENABLE_BLUE_GREEN=${ENABLE_BLUE_GREEN:-false}
DEPLOY_MONITORING=${DEPLOY_MONITORING:-true}

STACK_PREFIX="certificate-management-${ENVIRONMENT}"
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
    
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed (required for JSON processing)"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Deploy ECR repository
deploy_ecr_repository() {
    log_info "Deploying ECR repository..."
    
    local stack_name="${STACK_PREFIX}-ecr"
    
    aws cloudformation deploy \
        --template-file infrastructure/cloudformation/ecr-repository.yml \
        --stack-name "$stack_name" \
        --parameter-overrides RepositoryName="$ECR_REPOSITORY" \
        --region "$AWS_REGION"
    
    if [ $? -ne 0 ]; then
        log_error "ECR repository deployment failed"
        exit 1
    fi
    
    log_info "ECR repository deployed successfully"
}

# Deploy main infrastructure
deploy_main_infrastructure() {
    local image_uri=$1
    
    log_info "Deploying main infrastructure..."
    
    local stack_name="$STACK_PREFIX"
    
    # Generate random password for database
    local db_password=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    aws cloudformation deploy \
        --template-file infrastructure/cloudformation/ecs-infrastructure.yml \
        --stack-name "$stack_name" \
        --parameter-overrides \
            Environment="$ENVIRONMENT" \
            ContainerImage="$image_uri" \
            DBPassword="$db_password" \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$AWS_REGION"
    
    if [ $? -ne 0 ]; then
        log_error "Main infrastructure deployment failed"
        exit 1
    fi
    
    log_info "Main infrastructure deployed successfully"
    
    # Store database password in Systems Manager Parameter Store
    aws ssm put-parameter \
        --name "/$ENVIRONMENT/certificate-management/database/password" \
        --value "$db_password" \
        --type "SecureString" \
        --overwrite \
        --region "$AWS_REGION"
    
    echo "$stack_name"
}

# Deploy monitoring and security
deploy_monitoring_and_security() {
    local main_stack_name=$1
    
    if [ "$DEPLOY_MONITORING" != "true" ]; then
        log_info "Skipping monitoring and security deployment"
        return
    fi
    
    log_info "Deploying monitoring and security..."
    
    local stack_name="${STACK_PREFIX}-monitoring"
    
    # Get outputs from main stack
    local ecs_cluster_name=$(aws cloudformation describe-stacks \
        --stack-name "$main_stack_name" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ECSClusterName`].OutputValue' \
        --output text)
    
    local load_balancer_dns=$(aws cloudformation describe-stacks \
        --stack-name "$main_stack_name" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
        --output text)
    
    # Construct resource names (simplified approach)
    local load_balancer_full_name="${ENVIRONMENT}-certificate-management-alb"
    local target_group_full_name="${ENVIRONMENT}-certificate-management-tg"
    local database_instance_id="${ENVIRONMENT}-certificate-management-db"
    local ecs_service_name="${ENVIRONMENT}-certificate-management-service"
    
    aws cloudformation deploy \
        --template-file infrastructure/cloudformation/monitoring-security.yml \
        --stack-name "$stack_name" \
        --parameter-overrides \
            Environment="$ENVIRONMENT" \
            ECSClusterName="$ecs_cluster_name" \
            ECSServiceName="$ecs_service_name" \
            LoadBalancerFullName="$load_balancer_full_name" \
            TargetGroupFullName="$target_group_full_name" \
            DatabaseInstanceId="$database_instance_id" \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$AWS_REGION"
    
    if [ $? -ne 0 ]; then
        log_error "Monitoring and security deployment failed"
        exit 1
    fi
    
    log_info "Monitoring and security deployed successfully"
}

# Deploy SSL configuration
deploy_ssl_configuration() {
    local main_stack_name=$1
    
    if [ "$SKIP_SSL" = "true" ] || [ -z "$DOMAIN_NAME" ]; then
        log_info "Skipping SSL configuration"
        return
    fi
    
    log_info "Deploying SSL configuration..."
    
    local stack_name="${STACK_PREFIX}-ssl"
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    
    # Get outputs from main stack
    local load_balancer_dns=$(aws cloudformation describe-stacks \
        --stack-name "$main_stack_name" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
        --output text)
    
    # Construct ARNs
    local load_balancer_arn="arn:aws:elasticloadbalancing:${AWS_REGION}:${account_id}:loadbalancer/app/${ENVIRONMENT}-certificate-management-alb/*"
    local target_group_arn="arn:aws:elasticloadbalancing:${AWS_REGION}:${account_id}:targetgroup/${ENVIRONMENT}-certificate-management-tg/*"
    
    local parameters=(
        "Environment=$ENVIRONMENT"
        "DomainName=$DOMAIN_NAME"
        "LoadBalancerArn=$load_balancer_arn"
        "LoadBalancerDNSName=$load_balancer_dns"
        "TargetGroupArn=$target_group_arn"
    )
    
    if [ -n "$HOSTED_ZONE_ID" ]; then
        parameters+=("HostedZoneId=$HOSTED_ZONE_ID")
    fi
    
    aws cloudformation deploy \
        --template-file infrastructure/cloudformation/ssl-certificate.yml \
        --stack-name "$stack_name" \
        --parameter-overrides "${parameters[@]}" \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$AWS_REGION"
    
    if [ $? -ne 0 ]; then
        log_error "SSL configuration deployment failed"
        exit 1
    fi
    
    log_info "SSL configuration deployed successfully"
}

# Deploy blue-green configuration
deploy_blue_green_configuration() {
    local main_stack_name=$1
    
    if [ "$ENABLE_BLUE_GREEN" != "true" ]; then
        log_info "Skipping blue-green deployment configuration"
        return
    fi
    
    log_info "Deploying blue-green deployment configuration..."
    
    local stack_name="${STACK_PREFIX}-blue-green"
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    
    # Get outputs from main stack
    local ecs_cluster_name=$(aws cloudformation describe-stacks \
        --stack-name "$main_stack_name" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ECSClusterName`].OutputValue' \
        --output text)
    
    local ecs_service_name="${ENVIRONMENT}-certificate-management-service"
    local target_group_arn="arn:aws:elasticloadbalancing:${AWS_REGION}:${account_id}:targetgroup/${ENVIRONMENT}-certificate-management-tg/*"
    local listener_arn="arn:aws:elasticloadbalancing:${AWS_REGION}:${account_id}:listener/app/${ENVIRONMENT}-certificate-management-alb/*"
    
    aws cloudformation deploy \
        --template-file infrastructure/cloudformation/blue-green-deployment.yml \
        --stack-name "$stack_name" \
        --parameter-overrides \
            Environment="$ENVIRONMENT" \
            ECSClusterName="$ecs_cluster_name" \
            ECSServiceName="$ecs_service_name" \
            TargetGroupArn="$target_group_arn" \
            ListenerArn="$listener_arn" \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$AWS_REGION"
    
    if [ $? -ne 0 ]; then
        log_error "Blue-green deployment configuration failed"
        exit 1
    fi
    
    log_info "Blue-green deployment configuration deployed successfully"
}

# Get deployment outputs
get_deployment_outputs() {
    local main_stack_name=$1
    
    log_info "Deployment Summary:"
    log_info "==================="
    
    # Get main stack outputs
    local outputs=$(aws cloudformation describe-stacks \
        --stack-name "$main_stack_name" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs' \
        --output json)
    
    echo "$outputs" | jq -r '.[] | "\(.OutputKey): \(.OutputValue)"' | while read -r line; do
        log_info "$line"
    done
    
    # Application URL
    local load_balancer_dns=$(echo "$outputs" | jq -r '.[] | select(.OutputKey=="LoadBalancerDNS") | .OutputValue')
    
    if [ -n "$DOMAIN_NAME" ] && [ "$SKIP_SSL" != "true" ]; then
        log_info "Application URL: https://$DOMAIN_NAME"
    else
        log_info "Application URL: http://$load_balancer_dns"
    fi
    
    log_info "Health Check URL: http://$load_balancer_dns/api/health"
    log_info "CloudWatch Logs: /ecs/$ENVIRONMENT-certificate-management"
}

# Main deployment function
main() {
    log_info "Starting complete infrastructure deployment for environment: $ENVIRONMENT"
    log_info "AWS Region: $AWS_REGION"
    
    check_prerequisites
    
    # Deploy ECR repository first
    deploy_ecr_repository
    
    # Get ECR URI for placeholder image (will be updated by CI/CD)
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    local ecr_uri="${account_id}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    local placeholder_image="${ecr_uri}/${ECR_REPOSITORY}:latest"
    
    # Deploy main infrastructure
    local main_stack_name=$(deploy_main_infrastructure "$placeholder_image")
    
    # Deploy monitoring and security
    deploy_monitoring_and_security "$main_stack_name"
    
    # Deploy SSL configuration if domain is provided
    deploy_ssl_configuration "$main_stack_name"
    
    # Deploy blue-green configuration if enabled
    deploy_blue_green_configuration "$main_stack_name"
    
    # Show deployment summary
    get_deployment_outputs "$main_stack_name"
    
    log_info "Infrastructure deployment completed successfully!"
    log_info "Next steps:"
    log_info "1. Push your application image to ECR: $placeholder_image"
    log_info "2. Update ECS service to use the new image"
    log_info "3. Configure your domain DNS if using custom domain"
    log_info "4. Set up SES for email functionality"
}

# Script usage
usage() {
    echo "Usage: $0 [environment] [options]"
    echo ""
    echo "Parameters:"
    echo "  environment: production, staging, or development (default: production)"
    echo ""
    echo "Environment variables:"
    echo "  AWS_REGION        : AWS region (default: us-east-1)"
    echo "  DOMAIN_NAME       : Custom domain name for SSL certificate"
    echo "  HOSTED_ZONE_ID    : Route 53 hosted zone ID for domain"
    echo "  SKIP_SSL          : Skip SSL certificate configuration (true/false)"
    echo "  ENABLE_BLUE_GREEN : Enable blue-green deployment configuration (true/false)"
    echo "  DEPLOY_MONITORING : Deploy monitoring and security (default: true)"
    echo ""
    echo "Examples:"
    echo "  $0 production"
    echo "  DOMAIN_NAME=certificates.example.com HOSTED_ZONE_ID=Z123456789 $0 production"
    echo "  AWS_REGION=us-west-2 ENABLE_BLUE_GREEN=true $0 staging"
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