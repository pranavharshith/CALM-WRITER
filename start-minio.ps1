# MinIO Startup Script for CALM-WRITER
# This script starts MinIO server with credentials from .env file

Write-Host "Starting MinIO Server for CALM-WRITER..." -ForegroundColor Cyan

# Check if MinIO is installed
$minioPath = Get-Command minio -ErrorAction SilentlyContinue

if (-not $minioPath) {
    Write-Host "ERROR: MinIO is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To install MinIO on Windows:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://min.io/download" -ForegroundColor Yellow
    Write-Host "2. Or use Chocolatey: choco install minio" -ForegroundColor Yellow
    Write-Host "3. Or use Scoop: scoop install minio" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Load environment variables from .env file
$envFile = Join-Path $PSScriptRoot "backend\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    Write-Host "Loaded environment variables from .env" -ForegroundColor Green
} else {
    Write-Host "WARNING: .env file not found, using defaults" -ForegroundColor Yellow
}

# Get MinIO configuration from environment
$MINIO_ROOT_USER = $env:MINIO_ACCESS_KEY
$MINIO_ROOT_PASSWORD = $env:MINIO_SECRET_KEY
$MINIO_DATA_DIR = Join-Path $PSScriptRoot "minio-data"

if (-not $MINIO_ROOT_USER) { $MINIO_ROOT_USER = "minioadmin" }
if (-not $MINIO_ROOT_PASSWORD) { $MINIO_ROOT_PASSWORD = "minioadmin" }

# Create data directory if it doesn't exist
if (-not (Test-Path $MINIO_DATA_DIR)) {
    New-Item -ItemType Directory -Path $MINIO_DATA_DIR | Out-Null
    Write-Host "Created MinIO data directory: $MINIO_DATA_DIR" -ForegroundColor Green
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "MinIO Configuration:" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Console URL:  http://localhost:9001" -ForegroundColor White
Write-Host "API URL:      http://localhost:9000" -ForegroundColor White
Write-Host "Username:     $MINIO_ROOT_USER" -ForegroundColor White
Write-Host "Password:     $MINIO_ROOT_PASSWORD" -ForegroundColor White
Write-Host "Data Dir:     $MINIO_DATA_DIR" -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting MinIO server..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Set environment variables for MinIO
$env:MINIO_ROOT_USER = $MINIO_ROOT_USER
$env:MINIO_ROOT_PASSWORD = $MINIO_ROOT_PASSWORD

# Start MinIO server
& minio server $MINIO_DATA_DIR --console-address ":9001"
