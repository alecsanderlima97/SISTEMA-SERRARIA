param(
    [string]$SourceDir = "C:\NTS\SIGEWIN\XML\xmlret",
    [int]$Port = 8766
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Servidor = Join-Path $ScriptDir "sigewin-readonly-server.ps1"

if (-not (Test-Path -LiteralPath $Servidor)) {
    throw "Conector nao encontrado: $Servidor"
}

& powershell -NoProfile -ExecutionPolicy Bypass -File $Servidor -SourceDir $SourceDir -Port $Port
