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

function Get-FileNameKey {
    param([string]$Name)
    $normalized = $Name.Normalize([Text.NormalizationForm]::FormD)
    $builder = [System.Text.StringBuilder]::new()
    foreach ($ch in $normalized.ToCharArray()) {
        $category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($ch)
        if ($category -ne [Globalization.UnicodeCategory]::NonSpacingMark -and [char]::IsLetterOrDigit($ch)) {
            [void]$builder.Append([char]::ToLowerInvariant($ch))
        }
    }
    return $builder.ToString()
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
        if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
            $decodedNormalized = $decoded.Normalize([Text.NormalizationForm]::FormC)
            $fullPath = [System.IO.Path]::GetFullPath($decodedNormalized)
        }
        if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
            $dir = [System.IO.Path]::GetDirectoryName($fullPath)
            $fileName = [System.IO.Path]::GetFileName($fullPath)
            if ($dir -and (Test-Path -LiteralPath $dir -PathType Container)) {
                $targetName = $fileName.Normalize([Text.NormalizationForm]::FormD)
                $targetKey = Get-FileNameKey $fileName
                $match = Get-ChildItem -LiteralPath $dir -File -ErrorAction SilentlyContinue |
                    Where-Object {
                        $candidateKey = Get-FileNameKey $_.Name
                        $_.Name.Normalize([Text.NormalizationForm]::FormD) -eq $targetName -or
                        ($targetKey.Length -ge 8 -and $candidateKey.StartsWith($targetKey.Substring(0, [Math]::Min(10, $targetKey.Length))))
                    } |
                    Select-Object -First 1
                if ($match) { $fullPath = $match.FullName }
            }
        }
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
        $safeFileName = (Get-FileNameKey ([System.IO.Path]::GetFileNameWithoutExtension($fullPath)))
        if ([string]::IsNullOrWhiteSpace($safeFileName)) { $safeFileName = "arquivo" }
        $safeFileName = "$safeFileName$([System.IO.Path]::GetExtension($fullPath).ToLowerInvariant())"
        $context.Response.Headers.Add("Content-Disposition", "inline; filename=""$safeFileName""")
        $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        $context.Response.Close()
    } catch {
        try {
            Write-Response -Context $context -Status 500 -Text $_.Exception.Message
        } catch {}
    }
}
