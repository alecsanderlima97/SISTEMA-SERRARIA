param(
    [string]$RootDir = "C:\VANMARTE\ORQUESTRA.CS\SERRARIA-VANMARTE",
    [string]$ShareName = "ORQUESTRA-SERRARIA"
)

$ErrorActionPreference = "Stop"

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).
    IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Este script precisa ser executado como Administrador."
    Write-Host "Clique com o botao direito no PowerShell e escolha 'Executar como administrador'."
    exit 1
}

if (-not (Test-Path -LiteralPath $RootDir)) {
    New-Item -ItemType Directory -Force -Path $RootDir | Out-Null
}

$existing = Get-SmbShare -Name $ShareName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Compartilhamento ja existe:"
    Write-Host "\\$env:COMPUTERNAME\$ShareName"
    exit 0
}

$principals = @("Todos", "Everyone", "$env:USERDOMAIN\$env:USERNAME", $env:USERNAME)
$created = $false

foreach ($principal in $principals) {
    try {
        New-SmbShare -Name $ShareName -Path $RootDir -ChangeAccess $principal -ErrorAction Stop | Out-Null
        Write-Host "Compartilhamento criado com acesso para: $principal"
        $created = $true
        break
    } catch {
        Write-Host "Falhou com '$principal': $($_.Exception.Message)"
    }
}

if (-not $created) {
    throw "Nao foi possivel criar o compartilhamento automaticamente."
}

Write-Host ""
Write-Host "Acesse de outro computador pela rede:"
Write-Host "\\$env:COMPUTERNAME\$ShareName"
Write-Host ""
Write-Host "Pasta de entrada financeira:"
Write-Host "\\$env:COMPUTERNAME\$ShareName\FINANCEIRO\ENTRADA"
