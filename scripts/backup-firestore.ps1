param(
    [string]$ProjectId = $env:FIREBASE_PROJECT_ID,
    [string]$Bucket = $env:FIRESTORE_BACKUP_BUCKET,
    [string]$OutputPrefix = "firestore-backups",
    [string]$GcloudPath = $env:GCLOUD_PATH
)

if (-not $ProjectId) {
    $ProjectId = "serraria-bcf36"
}

if (-not $Bucket) {
    Write-Error "Informe o bucket no parametro -Bucket ou na variavel FIRESTORE_BACKUP_BUCKET. Ex: gs://serraria-bcf36-backups"
    exit 1
}

if ($Bucket -notmatch '^gs://') {
    Write-Error "O bucket precisa estar no formato gs://nome-do-bucket"
    exit 1
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$destination = "$Bucket/$OutputPrefix/$timestamp"

if (-not $GcloudPath) {
    $localGcloud = Join-Path $env:LOCALAPPDATA "Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
    if (Test-Path $localGcloud) {
        $GcloudPath = $localGcloud
    } else {
        $GcloudPath = "gcloud"
    }
}

Write-Output "Iniciando backup do Firestore..."
Write-Output "Projeto: $ProjectId"
Write-Output "Destino: $destination"

& $GcloudPath firestore export $destination --project $ProjectId

if ($LASTEXITCODE -ne 0) {
    Write-Error "Backup do Firestore falhou."
    exit $LASTEXITCODE
}

Write-Output "Backup concluido com sucesso: $destination"
