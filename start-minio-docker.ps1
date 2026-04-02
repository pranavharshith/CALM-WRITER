# MinIO Docker Setup for CALM-WRITER
# This is the recommended way to run MinIO

Write-Host "Starting MinIO via Docker..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue

if (-not $dockerInstalled) {
    Write-Host "ERROR: Docker is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Docker Desktop from:" -ForegroundColor Yellow
    Write-Host "https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "After installing Docker, run this script again." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternative: Download MinIO binary manually from:" -ForegroundColor Yellow
    Write-Host "https://dl.min.io/server/minio/release/windows-amd64/minio.exe" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Load credentials from .env
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
}

# Stop existing MinIO container if running
Write-Host "Stopping existing MinIO container (if any)..." -ForegroundColor Yellow
docker stop calmwriter-minio 2>$null
docker rm calmwriter-minio 2>$null

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
Write-Host "Starting MinIO container..." -ForegroundColor Green
Write-Host ""

# Run MinIO in Docker
docker run -d `
    --name calmwriter-minio `
    -p 9000:9000 `
    -p 9001:9001 `
    -e "MINIO_ROOT_USER=$MINIO_ROOT_USER" `
    -e "MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD" `
    -v "${PSScriptRoot}\minio-data:/data" `
    minio/minio server /data --console-address ":9001"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ MinIO started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access MinIO Console at: http://localhost:9001" -ForegroundColor Cyan
    Write-Host "Login with username: $MINIO_ROOT_USER" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To stop MinIO, run: docker stop calmwriter-minio" -ForegroundColor Yellow
    Write-Host "To view logs, run: docker logs calmwriter-minio" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "✗ Failed to start MinIO" -ForegroundColor Red
    Write-Host "Make sure Docker Desktop is running" -ForegroundColor Yellow
}
