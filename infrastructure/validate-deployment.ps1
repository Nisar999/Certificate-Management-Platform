# Certificate Management Platform - Deployment Validation Script
param(
    [Parameter(Position=0)]
    [ValidateSet("production", "staging", "development")]
    [string]$Environment = "production",
    
    [string]$AwsRegion = "us-east-1"
)

# Configuration
$StackPrefix = "certificate-management-$Environment"

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

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Cyan
}

function Test-StackExists {
    param([string]$StackName)
    
    try {
        aws cloudformation describe-stacks --stack-name $StackName --region $AwsRegion --output json | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Test-StackStatus {
    param([string]$StackName)
    
    try {
        $Status = aws cloudformation describe-stacks --stack-name $StackName --region $AwsRegion --query 'Stacks[0].StackStatus' --output text
        return $Status
    }
    catch {
        return "NOT_FOUND"
    }
}

function Test-ECSService {
    param([string]$ClusterName, [string]$ServiceName)
    
    try {
        $ServiceStatus = aws ecs describe-services --cluster $ClusterName --services $ServiceName --region $AwsRegion --query 'services[0].status' --output text
        $RunningCount = aws ecs describe-services --cluster $ClusterName --services $ServiceName --region $AwsRegion --query 'services[0].runningCount' --output text
        $DesiredCount = aws ecs describe-services --cluster $ClusterName --services $ServiceName --region $AwsRegion --query 'services[0].desiredCount' --output text
        
        return @{
            Status = $ServiceStatus
            RunningCount = [int]$RunningCount
            DesiredCount = [int]$DesiredCount
        }
    }
    catch {
        return $null
    }
}

function Test-DatabaseConnection {
    param([string]$DatabaseEndpoint)
    
    try {
        $DbStatus = aws rds describe-db-instances --db-instance-identifier "$Environment-certificate-management-db" --region $AwsRegion --query 'DBInstances[0].DBInstanceStatus' --output text
        return $DbStatus
    }
    catch {
        return "NOT_FOUND"
    }
}

function Test-LoadBalancerHealth {
    param([string]$LoadBalancerDNS)
    
    try {
        $Response = Invoke-WebRequest -Uri "http://$LoadBalancerDNS/api/health" -TimeoutSec 10 -UseBasicParsing
        return $Response.StatusCode -eq 200
    }
    catch {
        return $false
    }
}

function Test-S3Bucket {
    param([string]$BucketName)
    
    try {
        aws s3api head-bucket --bucket $BucketName --region $AwsRegion 2>$null
        return $true
    }
    catch {
        return $false
    }
}

function Get-StackOutputs {
    param([string]$StackName)
    
    try {
        $Outputs = aws cloudformation describe-stacks --stack-name $StackName --region $AwsRegion --query 'Stacks[0].Outputs' | ConvertFrom-Json
        $OutputHash = @{}
        foreach ($output in $Outputs) {
            $OutputHash[$output.OutputKey] = $output.OutputValue
        }
        return $OutputHash
    }
    catch {
        return @{}
    }
}

function Start-ValidationProcess {
    Write-Info "Starting deployment validation for environment: $Environment"
    Write-Info "AWS Region: $AwsRegion"
    Write-Info "=============================================="
    
    $ValidationResults = @{
        MainStack = $false
        ECRStack = $false
        MonitoringStack = $false
        SSLStack = $false
        BlueGreenStack = $false
        ECSService = $false
        Database = $false
        LoadBalancer = $false
        S3Bucket = $false
        OverallHealth = $false
    }
    
    # Test main infrastructure stack
    Write-Info "Checking main infrastructure stack..."
    $MainStackName = $StackPrefix
    if (Test-StackExists $MainStackName) {
        $StackStatus = Test-StackStatus $MainStackName
        if ($StackStatus -eq "CREATE_COMPLETE" -or $StackStatus -eq "UPDATE_COMPLETE") {
            Write-Success "Main infrastructure stack is healthy: $StackStatus"
            $ValidationResults.MainStack = $true
            
            # Get stack outputs
            $MainOutputs = Get-StackOutputs $MainStackName
            
            # Test ECS Service
            if ($MainOutputs.ContainsKey("ECSClusterName")) {
                Write-Info "Checking ECS service..."
                $ServiceInfo = Test-ECSService $MainOutputs.ECSClusterName "$Environment-certificate-management-service"
                if ($ServiceInfo -and $ServiceInfo.Status -eq "ACTIVE" -and $ServiceInfo.RunningCount -eq $ServiceInfo.DesiredCount) {
                    Write-Success "ECS service is healthy: $($ServiceInfo.RunningCount)/$($ServiceInfo.DesiredCount) tasks running"
                    $ValidationResults.ECSService = $true
                } else {
                    Write-Error "ECS service is not healthy"
                }
            }
            
            # Test Database
            if ($MainOutputs.ContainsKey("DatabaseEndpoint")) {
                Write-Info "Checking database..."
                $DbStatus = Test-DatabaseConnection $MainOutputs.DatabaseEndpoint
                if ($DbStatus -eq "available") {
                    Write-Success "Database is healthy: $DbStatus"
                    $ValidationResults.Database = $true
                } else {
                    Write-Error "Database is not healthy: $DbStatus"
                }
            }
            
            # Test Load Balancer
            if ($MainOutputs.ContainsKey("LoadBalancerDNS")) {
                Write-Info "Checking load balancer health..."
                if (Test-LoadBalancerHealth $MainOutputs.LoadBalancerDNS) {
                    Write-Success "Load balancer health check passed"
                    $ValidationResults.LoadBalancer = $true
                } else {
                    Write-Error "Load balancer health check failed"
                }
            }
            
            # Test S3 Bucket
            if ($MainOutputs.ContainsKey("S3BucketName")) {
                Write-Info "Checking S3 bucket..."
                if (Test-S3Bucket $MainOutputs.S3BucketName) {
                    Write-Success "S3 bucket is accessible"
                    $ValidationResults.S3Bucket = $true
                } else {
                    Write-Error "S3 bucket is not accessible"
                }
            }
        } else {
            Write-Error "Main infrastructure stack is not healthy: $StackStatus"
        }
    } else {
        Write-Error "Main infrastructure stack not found"
    }
    
    # Test ECR stack
    Write-Info "Checking ECR repository stack..."
    $ECRStackName = "$StackPrefix-ecr"
    if (Test-StackExists $ECRStackName) {
        $StackStatus = Test-StackStatus $ECRStackName
        if ($StackStatus -eq "CREATE_COMPLETE" -or $StackStatus -eq "UPDATE_COMPLETE") {
            Write-Success "ECR repository stack is healthy: $StackStatus"
            $ValidationResults.ECRStack = $true
        } else {
            Write-Error "ECR repository stack is not healthy: $StackStatus"
        }
    } else {
        Write-Warn "ECR repository stack not found (may be optional)"
    }
    
    # Test monitoring stack
    Write-Info "Checking monitoring and security stack..."
    $MonitoringStackName = "$StackPrefix-monitoring"
    if (Test-StackExists $MonitoringStackName) {
        $StackStatus = Test-StackStatus $MonitoringStackName
        if ($StackStatus -eq "CREATE_COMPLETE" -or $StackStatus -eq "UPDATE_COMPLETE") {
            Write-Success "Monitoring and security stack is healthy: $StackStatus"
            $ValidationResults.MonitoringStack = $true
        } else {
            Write-Error "Monitoring and security stack is not healthy: $StackStatus"
        }
    } else {
        Write-Warn "Monitoring and security stack not found (may be optional)"
    }
    
    # Test SSL stack
    Write-Info "Checking SSL configuration stack..."
    $SSLStackName = "$StackPrefix-ssl"
    if (Test-StackExists $SSLStackName) {
        $StackStatus = Test-StackStatus $SSLStackName
        if ($StackStatus -eq "CREATE_COMPLETE" -or $StackStatus -eq "UPDATE_COMPLETE") {
            Write-Success "SSL configuration stack is healthy: $StackStatus"
            $ValidationResults.SSLStack = $true
        } else {
            Write-Error "SSL configuration stack is not healthy: $StackStatus"
        }
    } else {
        Write-Warn "SSL configuration stack not found (may be optional)"
    }
    
    # Test blue-green stack
    Write-Info "Checking blue-green deployment stack..."
    $BlueGreenStackName = "$StackPrefix-blue-green"
    if (Test-StackExists $BlueGreenStackName) {
        $StackStatus = Test-StackStatus $BlueGreenStackName
        if ($StackStatus -eq "CREATE_COMPLETE" -or $StackStatus -eq "UPDATE_COMPLETE") {
            Write-Success "Blue-green deployment stack is healthy: $StackStatus"
            $ValidationResults.BlueGreenStack = $true
        } else {
            Write-Error "Blue-green deployment stack is not healthy: $StackStatus"
        }
    } else {
        Write-Warn "Blue-green deployment stack not found (may be optional)"
    }
    
    # Overall health assessment
    $CriticalComponents = @($ValidationResults.MainStack, $ValidationResults.ECSService, $ValidationResults.Database, $ValidationResults.LoadBalancer)
    $ValidationResults.OverallHealth = ($CriticalComponents | Where-Object { $_ -eq $false }).Count -eq 0
    
    # Summary
    Write-Info ""
    Write-Info "Validation Summary:"
    Write-Info "=================="
    
    if ($ValidationResults.OverallHealth) {
        Write-Success "Overall deployment health: HEALTHY"
        Write-Success "All critical components are functioning properly"
    } else {
        Write-Error "Overall deployment health: UNHEALTHY"
        Write-Error "One or more critical components have issues"
    }
    
    Write-Info ""
    Write-Info "Component Status:"
    Write-Info "- Main Infrastructure: $(if ($ValidationResults.MainStack) { 'HEALTHY' } else { 'UNHEALTHY' })"
    Write-Info "- ECS Service: $(if ($ValidationResults.ECSService) { 'HEALTHY' } else { 'UNHEALTHY' })"
    Write-Info "- Database: $(if ($ValidationResults.Database) { 'HEALTHY' } else { 'UNHEALTHY' })"
    Write-Info "- Load Balancer: $(if ($ValidationResults.LoadBalancer) { 'HEALTHY' } else { 'UNHEALTHY' })"
    Write-Info "- S3 Bucket: $(if ($ValidationResults.S3Bucket) { 'HEALTHY' } else { 'UNHEALTHY' })"
    Write-Info "- ECR Repository: $(if ($ValidationResults.ECRStack) { 'HEALTHY' } else { 'NOT DEPLOYED' })"
    Write-Info "- Monitoring: $(if ($ValidationResults.MonitoringStack) { 'HEALTHY' } else { 'NOT DEPLOYED' })"
    Write-Info "- SSL Configuration: $(if ($ValidationResults.SSLStack) { 'HEALTHY' } else { 'NOT DEPLOYED' })"
    Write-Info "- Blue-Green Deployment: $(if ($ValidationResults.BlueGreenStack) { 'HEALTHY' } else { 'NOT DEPLOYED' })"
    
    if ($ValidationResults.OverallHealth) {
        Write-Info ""
        Write-Info "Application URLs:"
        if ($MainOutputs.ContainsKey("LoadBalancerDNS")) {
            Write-Info "- Health Check: http://$($MainOutputs.LoadBalancerDNS)/api/health"
            Write-Info "- Application: http://$($MainOutputs.LoadBalancerDNS)"
        }
        Write-Info "- CloudWatch Logs: /ecs/$Environment-certificate-management"
    }
    
    return $ValidationResults.OverallHealth
}

# Show usage
function Show-Usage {
    Write-Host "Usage: .\validate-deployment.ps1 [Environment] [-AwsRegion Region]"
    Write-Host "  Environment: production, staging, or development (default: production)"
    Write-Host "  AwsRegion: AWS region (default: us-east-1)"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\validate-deployment.ps1 production"
    Write-Host "  .\validate-deployment.ps1 staging -AwsRegion us-west-2"
}

# Handle help parameter
if ($args -contains "-h" -or $args -contains "--help") {
    Show-Usage
    exit 0
}

# Start validation
try {
    $IsHealthy = Start-ValidationProcess
    if ($IsHealthy) {
        exit 0
    } else {
        exit 1
    }
}
catch {
    Write-Error "Validation failed: $($_.Exception.Message)"
    exit 1
}