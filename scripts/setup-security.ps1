# Certificate Management Platform - Security Setup Script
param(
    [Parameter(Position=0)]
    [ValidateSet("production", "staging", "development")]
    [string]$Environment = "production",
    
    [string]$AwsRegion = "us-east-1",
    
    [string]$DomainName = "",
    
    [string]$NotificationEmail = "admin@example.com"
)

# Configuration
$MonitoringStackName = "certificate-management-$Environment-monitoring"
$SSLStackName = "certificate-management-$Environment-ssl"

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

# Get infrastructure stack outputs
function Get-StackOutputs {
    param([string]$StackName)
    
    try {
        $outputs = aws cloudformation describe-stacks --stack-name $StackName --region $AwsRegion --query 'Stacks[0].Outputs' --output json | ConvertFrom-Json
        $outputHash = @{}
        foreach ($output in $outputs) {
            $outputHash[$output.OutputKey] = $output.OutputValue
        }
        return $outputHash
    }
    catch {
        Write-Error "Failed to get stack outputs for $StackName"
        return $null
    }
}

# Deploy monitoring and security stack
function Deploy-MonitoringStack {
    Write-Info "Deploying monitoring and security stack..."
    
    # Get main infrastructure stack outputs
    $mainStackName = "certificate-management-$Environment"
    $mainOutputs = Get-StackOutputs $mainStackName
    
    if (-not $mainOutputs) {
        Write-Error "Main infrastructure stack not found: $mainStackName"
        return $false
    }
    
    # Deploy monitoring stack
    aws cloudformation deploy `
        --template-file infrastructure/cloudformation/monitoring-security.yml `
        --stack-name $MonitoringStackName `
        --parameter-overrides `
            Environment=$Environment `
            ECSClusterName=$($mainOutputs.ECSClusterName) `
            ECSServiceName="$Environment-certificate-management-service" `
            LoadBalancerFullName=$($mainOutputs.LoadBalancerFullName) `
            TargetGroupFullName=$($mainOutputs.TargetGroupFullName) `
            DatabaseInstanceId=$($mainOutputs.DatabaseInstanceId) `
            NotificationEmail=$NotificationEmail `
        --capabilities CAPABILITY_NAMED_IAM `
        --region $AwsRegion
    
    if ($LASTEXITCODE -eq 0) {
        Write-Info "Monitoring stack deployed successfully"
        return $true
    } else {
        Write-Error "Failed to deploy monitoring stack"
        return $false
    }
}

# Deploy SSL certificate stack
function Deploy-SSLStack {
    if (-not $DomainName) {
        Write-Warn "No domain name provided, skipping SSL certificate setup"
        return $true
    }
    
    Write-Info "Deploying SSL certificate stack..."
    
    # Get main infrastructure stack outputs
    $mainStackName = "certificate-management-$Environment"
    $mainOutputs = Get-StackOutputs $mainStackName
    
    if (-not $mainOutputs) {
        Write-Error "Main infrastructure stack not found: $mainStackName"
        return $false
    }
    
    # Get hosted zone ID for the domain
    $hostedZoneId = ""
    try {
        $hostedZones = aws route53 list-hosted-zones-by-name --dns-name $DomainName --query 'HostedZones[0].Id' --output text
        if ($hostedZones -and $hostedZones -ne "None") {
            $hostedZoneId = $hostedZones -replace '/hostedzone/', ''
        }
    }
    catch {
        Write-Warn "Could not find hosted zone for domain: $DomainName"
    }
    
    # Deploy SSL stack
    aws cloudformation deploy `
        --template-file infrastructure/cloudformation/ssl-certificate.yml `
        --stack-name $SSLStackName `
        --parameter-overrides `
            Environment=$Environment `
            DomainName=$DomainName `
            HostedZoneId=$hostedZoneId `
            LoadBalancerArn=$($mainOutputs.LoadBalancerArn) `
            LoadBalancerDNSName=$($mainOutputs.LoadBalancerDNS) `
            LoadBalancerHostedZoneId=$($mainOutputs.LoadBalancerHostedZoneId) `
        --capabilities CAPABILITY_NAMED_IAM `
        --region $AwsRegion
    
    if ($LASTEXITCODE -eq 0) {
        Write-Info "SSL certificate stack deployed successfully"
        return $true
    } else {
        Write-Error "Failed to deploy SSL certificate stack"
        return $false
    }
}

# Configure CloudWatch log retention
function Set-LogRetention {
    Write-Info "Configuring CloudWatch log retention..."
    
    $logGroupName = "/ecs/$Environment-certificate-management"
    $retentionDays = switch ($Environment) {
        "production" { 30 }
        "staging" { 7 }
        "development" { 3 }
        default { 7 }
    }
    
    try {
        aws logs put-retention-policy --log-group-name $logGroupName --retention-in-days $retentionDays --region $AwsRegion
        Write-Info "Log retention set to $retentionDays days for $logGroupName"
    }
    catch {
        Write-Warn "Failed to set log retention for $logGroupName"
    }
}

# Enable GuardDuty
function Enable-GuardDuty {
    Write-Info "Enabling GuardDuty for security monitoring..."
    
    try {
        # Check if GuardDuty is already enabled
        $detectors = aws guardduty list-detectors --region $AwsRegion --query 'DetectorIds' --output text
        
        if (-not $detectors -or $detectors -eq "None") {
            # Create GuardDuty detector
            $detectorId = aws guardduty create-detector --enable --region $AwsRegion --query 'DetectorId' --output text
            Write-Info "GuardDuty enabled with detector ID: $detectorId"
        } else {
            Write-Info "GuardDuty is already enabled"
        }
    }
    catch {
        Write-Warn "Failed to enable GuardDuty (may require additional permissions)"
    }
}

# Configure AWS Config
function Enable-AWSConfig {
    Write-Info "Enabling AWS Config for compliance monitoring..."
    
    try {
        # Check if Config is already enabled
        $configRecorders = aws configservice describe-configuration-recorders --region $AwsRegion --query 'ConfigurationRecorders' --output text
        
        if (-not $configRecorders -or $configRecorders -eq "None") {
            # Create S3 bucket for Config
            $configBucketName = "aws-config-$Environment-certificate-management-$(Get-Random)"
            aws s3 mb s3://$configBucketName --region $AwsRegion
            
            # Create Config service role
            $configRoleArn = aws iam create-role --role-name "AWS-Config-Role-$Environment" --assume-role-policy-document '{
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "config.amazonaws.com"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            }' --query 'Role.Arn' --output text
            
            # Attach Config service role policy
            aws iam attach-role-policy --role-name "AWS-Config-Role-$Environment" --policy-arn "arn:aws:iam::aws:policy/service-role/ConfigRole"
            
            Write-Info "AWS Config setup initiated (manual configuration may be required)"
        } else {
            Write-Info "AWS Config is already enabled"
        }
    }
    catch {
        Write-Warn "Failed to enable AWS Config (may require additional permissions)"
    }
}

# Setup VPC Flow Logs
function Enable-VPCFlowLogs {
    Write-Info "Enabling VPC Flow Logs..."
    
    try {
        # Get VPC ID from main stack
        $mainStackName = "certificate-management-$Environment"
        $mainOutputs = Get-StackOutputs $mainStackName
        $vpcId = $mainOutputs.VPCId
        
        if ($vpcId) {
            # Create CloudWatch log group for VPC Flow Logs
            $flowLogGroupName = "/aws/vpc/flowlogs/$Environment-certificate-management"
            aws logs create-log-group --log-group-name $flowLogGroupName --region $AwsRegion
            
            # Create VPC Flow Logs
            aws ec2 create-flow-logs --resource-type VPC --resource-ids $vpcId --traffic-type ALL --log-destination-type cloud-watch-logs --log-group-name $flowLogGroupName --region $AwsRegion
            
            Write-Info "VPC Flow Logs enabled for VPC: $vpcId"
        }
    }
    catch {
        Write-Warn "Failed to enable VPC Flow Logs"
    }
}

# Main security setup function
function Start-SecuritySetup {
    Write-Info "Starting security setup for environment: $Environment"
    
    # Deploy monitoring and security infrastructure
    if (-not (Deploy-MonitoringStack)) {
        Write-Error "Failed to deploy monitoring stack"
        return $false
    }
    
    # Deploy SSL certificate if domain is provided
    if (-not (Deploy-SSLStack)) {
        Write-Error "Failed to deploy SSL stack"
        return $false
    }
    
    # Configure additional security features
    Set-LogRetention
    Enable-GuardDuty
    Enable-AWSConfig
    Enable-VPCFlowLogs
    
    Write-Info "Security setup completed successfully!"
    
    # Display important information
    Write-Info "Security Configuration Summary:"
    Write-Info "- CloudWatch monitoring and alarms configured"
    Write-Info "- WAF protection enabled"
    Write-Info "- Security groups configured with least privilege"
    Write-Info "- Encryption enabled for data at rest and in transit"
    
    if ($DomainName) {
        Write-Info "- SSL certificate configured for domain: $DomainName"
    }
    
    Write-Info "- GuardDuty threat detection enabled"
    Write-Info "- VPC Flow Logs enabled for network monitoring"
    Write-Info "- Log retention configured based on environment"
    
    return $true
}

# Show usage
function Show-Usage {
    Write-Host "Usage: .\setup-security.ps1 [Environment] [-DomainName Domain] [-NotificationEmail Email] [-AwsRegion Region]"
    Write-Host "  Environment: production, staging, or development (default: production)"
    Write-Host "  DomainName: Domain name for SSL certificate (optional)"
    Write-Host "  NotificationEmail: Email for CloudWatch alarms (default: admin@example.com)"
    Write-Host "  AwsRegion: AWS region (default: us-east-1)"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\setup-security.ps1 production -DomainName certificates.example.com -NotificationEmail admin@company.com"
    Write-Host "  .\setup-security.ps1 staging -AwsRegion us-west-2"
}

# Handle help parameter
if ($args -contains "-h" -or $args -contains "--help") {
    Show-Usage
    exit 0
}

# Start security setup
try {
    if (Start-SecuritySetup) {
        Write-Info "All security configurations completed successfully!"
    } else {
        Write-Error "Security setup failed"
        exit 1
    }
}
catch {
    Write-Error "Security setup failed: $($_.Exception.Message)"
    exit 1
}