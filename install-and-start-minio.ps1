# MinIO Installation Script for Windows
# Downloads and installs MinIO server

Write-Host "MinIO Installation for CALM-WRITER" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Create MinIO directory
$minioDir = Join-Path $PSScriptRoot "minio-server"
if (-not (Test-Path $minioDir)) {
    New-Item -ItemType Directory -Path $minioDir | Out-Null
    Write-Host "Created directory: $minioDir" -ForegroundColor Green
}

# Download MinIO
$minioExe = Join-Path $minioDir "minio.exe"
if (Test-Path $minioExe) {
    Write-Host "MinIO already exists at: $minioExe" -ForegroundColor Yellow
} else {
    Write-Host "Downloading MinIO server..." -ForegroundColor Yellow
    $downloadUrl = "https://dl.min.io/server/minio/release/windows-amd64/minio.exe"
    
    try {
        Invoke-WebRequest -Uri $downloadUrl -OutFile $minioExe -UseBasicParsing
        Write-Host "MinIO downloaded successfully!" -ForegroundColor Green
    } catch {
        Write-Host "Failed to download MinIO: $_" -ForegroundColor Red
        Write-Host "Please download manually from: https://min.io/download" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Add MinIO to PATH for current session
$env:Path = "$minioDir;$env:Path"

Write-Host ""
Write-Host "MinIO installed successfully!" -ForegroundColor Green
Write-Host "Location: $minioExe" -ForegroundColor White
Write-Host ""

# Load environment variables from .env
$envFile = Join-Path $PSScriptRoot "backend\.env"
$MINIO_ROOT_USER = "minioadmin"
$MINIO_ROOT_PASSWORD = "minioadmin"

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^MINIO_ACCESS_KEY=(.*)$') {
            $MINIO_ROOT_USER = $matches[1].Trim()
        }
        if ($_ -match '^MINIO_SECRET_KEY=(.*)$') {
            $MINIO_ROOT_PASSWORD = $matches[1].Trim()
        }
    }
    Write-Host "Loaded credentials from .env file" -ForegroundColor Green
}

# Create data directory
$MINIO_DATA_DIR = Join-Path $PSScriptRoot "minio-data"
if (-not (Test-Path $MINIO_DATA_DIR)) {
    New-Item -ItemType Directory -Path $MINIO_DATA_DIR | Out-Null
    Write-Host "Created data directory: $MINIO_DATA_DIR" -ForegroundColor Green
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "MinIO Server Configuration:" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Console URL:  http://localhost:9001" -ForegroundColor White
Write-Host "API URL:      http://localhost:9000" -ForegroundColor White
Write-Host "Username:     $MINIO_ROOT_USER" -ForegroundColor White
Write-Host "Password:     $MINIO_ROOT_PASSWORD" -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting MinIO server..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Set environment variables
$env:MINIO_ROOT_USER = $MINIO_ROOT_USER
$env:MINIO_ROOT_PASSWORD = $MINIO_ROOT_PASSWORD

# Start MinIO
& $minioExe server $MINIO_DATA_DIR --console-address ":9001"
