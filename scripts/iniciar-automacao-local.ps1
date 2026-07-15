param(
    [string]$RootDir = "C:\VANMARTE\ORQUESTRA.CS\SERRARIA-VANMARTE",
    [string]$FinanceiroDir = "C:\VANMARTE\FINANCEIRO.ORQUESTRACS",
    [int]$Port = 8765
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Instalador = Join-Path $ScriptDir "instalar-pasta-raiz-orquestra.ps1"
$Servidor = Join-Path $ScriptDir "servidor-arquivos-local.ps1"
$Monitor = Join-Path $ScriptDir "monitor-financeiro.ps1"

if (-not (Test-Path -LiteralPath $Instalador)) { throw "Instalador nao encontrado: $Instalador" }
if (-not (Test-Path -LiteralPath $Servidor)) { throw "Servidor local nao encontrado: $Servidor" }
if (-not (Test-Path -LiteralPath $Monitor)) { throw "Monitor financeiro nao encontrado: $Monitor" }

& powershell -NoProfile -ExecutionPolicy Bypass -File $Instalador -RootDir $RootDir -FinanceiroDir $FinanceiroDir

Start-Process powershell -WindowStyle Normal -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-NoExit",
    "-File", "`"$Servidor`"",
    "-RootDir", "`"$RootDir`"",
    "-ExtraRootDir", "`"$FinanceiroDir`"",
    "-Port", "$Port"
)

Start-Process powershell -WindowStyle Normal -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-NoExit",
    "-File", "`"$Monitor`"",
    "-RootDir", "`"$RootDir`"",
    "-FinanceiroDir", "`"$FinanceiroDir`""
)

Write-Host ""
Write-Host "Automacao local iniciada."
Write-Host "Pasta de entrada: $FinanceiroDir\ENTRADA"
Write-Host "Fila para importar no sistema: $FinanceiroDir\FILA"
Write-Host "Servidor de visualizacao: http://127.0.0.1:$Port"
