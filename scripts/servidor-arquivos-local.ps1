param(
    [string]$RootDir = "C:\VANMARTE\ORQUESTRA.CS\SERRARIA-VANMARTE",
    [string]$ExtraRootDir = "C:\VANMARTE\FINANCEIRO.ORQUESTRACS",
    [int]$Port = 8765
)

$ErrorActionPreference = "Stop"
$RootFull = [System.IO.Path]::GetFullPath($RootDir)
$ExtraRootFull = if ([string]::IsNullOrWhiteSpace($ExtraRootDir)) { "" } else { [System.IO.Path]::GetFullPath($ExtraRootDir) }
$prefix = "http://127.0.0.1:$Port/"

function Write-Response {
    param($Context, [int]$Status, [string]$Text, [string]$ContentType = "text/plain; charset=utf-8")
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
    $Context.Response.StatusCode = $Status
    $Context.Response.ContentType = $ContentType
    $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $Context.Response.Close()
}

function Get-MimeType {
    param([string]$Path)
    switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
        ".pdf" { "application/pdf" }
        ".xml" { "application/xml; charset=utf-8" }
        ".png" { "image/png" }
        ".jpg" { "image/jpeg" }
        ".jpeg" { "image/jpeg" }
        default { "application/octet-stream" }
    }
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-Host "Servidor local de arquivos Orquestra.cs"
Write-Host "Raiz permitida: $RootFull"
if ($ExtraRootFull) { Write-Host "Raiz extra permitida: $ExtraRootFull" }
Write-Host "URL: $prefix"
Write-Host "Pressione Ctrl+C para parar."

while ($listener.IsListening) {
    $context = $listener.GetContext()
    try {
        $requestPath = $context.Request.Url.AbsolutePath.Trim("/")
        if ($requestPath -eq "" -or $requestPath -eq "status") {
            Write-Response -Context $context -Status 200 -Text "OK - Servidor local Orquestra.cs ativo."
            continue
        }
        if ($requestPath -ne "arquivo") {
            Write-Response -Context $context -Status 404 -Text "Rota nao encontrada."
            continue
        }
        $rawPath = $context.Request.QueryString["path"]
        if ([string]::IsNullOrWhiteSpace($rawPath)) {
            Write-Response -Context $context -Status 400 -Text "Parametro path obrigatorio."
            continue
        }
        $decoded = [System.Uri]::UnescapeDataString($rawPath)
        $fullPath = [System.IO.Path]::GetFullPath($decoded)
        $inRoot = $fullPath.StartsWith($RootFull, [System.StringComparison]::OrdinalIgnoreCase)
        $inExtraRoot = $ExtraRootFull -and $fullPath.StartsWith($ExtraRootFull, [System.StringComparison]::OrdinalIgnoreCase)
        if (-not ($inRoot -or $inExtraRoot)) {
            Write-Response -Context $context -Status 403 -Text "Arquivo fora da pasta raiz permitida."
            continue
        }
        if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
            Write-Response -Context $context -Status 404 -Text "Arquivo nao encontrado."
            continue
        }

        $bytes = [System.IO.File]::ReadAllBytes($fullPath)
        $context.Response.StatusCode = 200
        $context.Response.ContentType = Get-MimeType -Path $fullPath
        $context.Response.Headers.Add("Access-Control-Allow-Origin", "*")
        $context.Response.Headers.Add("Content-Disposition", "inline; filename=""$([System.IO.Path]::GetFileName($fullPath))""")
        $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        $context.Response.Close()
    } catch {
        try {
            Write-Response -Context $context -Status 500 -Text $_.Exception.Message
        } catch {}
    }
}
