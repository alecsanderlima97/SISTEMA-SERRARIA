param(
    [string]$SourceDir = "C:\NTS\SIGEWIN\XML\xmlret",
    [int]$Port = 8766
)

$ErrorActionPreference = "Stop"
$SourceFull = [System.IO.Path]::GetFullPath($SourceDir).TrimEnd('\')
$Prefix = "http://127.0.0.1:$Port/"

if (-not (Test-Path -LiteralPath $SourceFull -PathType Container)) {
    throw "Pasta de XML do SIGEWIN nao encontrada: $SourceFull"
}

function Write-JsonResponse {
    param($Context, [int]$Status, $Payload, [string]$Origin = "*")
    $json = $Payload | ConvertTo-Json -Depth 8 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $Context.Response.StatusCode = $Status
    $Context.Response.ContentType = "application/json; charset=utf-8"
    $Context.Response.Headers.Add("Access-Control-Allow-Origin", $Origin)
    $Context.Response.Headers.Add("Access-Control-Allow-Methods", "GET, OPTIONS")
    $Context.Response.Headers.Add("Cache-Control", "no-store")
    $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $Context.Response.Close()
}

function Write-TextResponse {
    param($Context, [int]$Status, [string]$Text, [string]$ContentType = "text/plain; charset=utf-8", [string]$Origin = "*")
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
    $Context.Response.StatusCode = $Status
    $Context.Response.ContentType = $ContentType
    $Context.Response.Headers.Add("Access-Control-Allow-Origin", $Origin)
    $Context.Response.Headers.Add("Access-Control-Allow-Methods", "GET, OPTIONS")
    $Context.Response.Headers.Add("Cache-Control", "no-store")
    $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $Context.Response.Close()
}

function Get-RelativeXmlPath {
    param([string]$FullName)
    return $FullName.Substring($SourceFull.Length).TrimStart('\').Replace('\', '/')
}

function Resolve-XmlPath {
    param([string]$RelativePath)
    if ([string]::IsNullOrWhiteSpace($RelativePath)) { return $null }
    $relative = [System.Uri]::UnescapeDataString($RelativePath).Replace('/', '\')
    $segments = $relative -split '\\'
    if ([System.IO.Path]::IsPathRooted($relative) -or ($segments -contains '..')) { return $null }
    $candidate = [System.IO.Path]::GetFullPath((Join-Path $SourceFull $relative))
    if (-not $candidate.StartsWith("$SourceFull\", [System.StringComparison]::OrdinalIgnoreCase)) { return $null }
    if ([System.IO.Path]::GetExtension($candidate).ToLowerInvariant() -ne '.xml') { return $null }
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { return $null }
    return $candidate
}

function Get-NfeFileKey {
    param([System.IO.FileInfo]$File)
    $match = [regex]::Match($File.BaseName, '^(\d{44})')
    if ($match.Success) { return $match.Groups[1].Value }
    return $File.FullName.ToLowerInvariant()
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($Prefix)
$listener.Start()

Write-Host "Conector SIGEWIN somente leitura"
Write-Host "Fonte: $SourceFull"
Write-Host "URL: $Prefix"
Write-Host "Nenhum arquivo da fonte sera movido, renomeado ou alterado."
Write-Host "Pressione Ctrl+C para parar."

while ($listener.IsListening) {
    $context = $listener.GetContext()
    try {
        $origin = $context.Request.Headers['Origin']
        if ([string]::IsNullOrWhiteSpace($origin)) { $origin = '*' }

        if ($context.Request.HttpMethod -eq 'OPTIONS') {
            $context.Response.StatusCode = 204
            $context.Response.Headers.Add('Access-Control-Allow-Origin', $origin)
            $context.Response.Headers.Add('Access-Control-Allow-Methods', 'GET, OPTIONS')
            $context.Response.Close()
            continue
        }

        $route = $context.Request.Url.AbsolutePath.Trim('/')
        if ($route -eq 'status') {
            Write-JsonResponse $context 200 ([ordered]@{
                ok = $true
                modo = 'somente_leitura'
                fonte = $SourceFull
                servidor = "127.0.0.1:$Port"
            }) $origin
            continue
        }

        if ($route -eq 'api/sigewin/nfe') {
            $limit = 20
            [int]::TryParse($context.Request.QueryString['limit'], [ref]$limit) | Out-Null
            $limit = [Math]::Min([Math]::Max($limit, 1), 80)
            $sinceRaw = $context.Request.QueryString['since']
            $since = [DateTimeOffset]::MinValue
            if ($sinceRaw) { [DateTimeOffset]::TryParse($sinceRaw, [ref]$since) | Out-Null }

            $arquivos = Get-ChildItem -LiteralPath $SourceFull -Recurse -File -Filter '*-nfe.xml' -ErrorAction SilentlyContinue |
                Where-Object { $_.LastWriteTimeUtc -gt $since.UtcDateTime } |
                Sort-Object LastWriteTimeUtc -Descending

            $unicos = [System.Collections.Generic.Dictionary[string, object]]::new([System.StringComparer]::OrdinalIgnoreCase)
            foreach ($arquivo in $arquivos) {
                $chave = Get-NfeFileKey $arquivo
                if (-not $unicos.ContainsKey($chave)) { $unicos[$chave] = $arquivo }
            }

            $items = @($unicos.Values | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First $limit | ForEach-Object {
                [ordered]@{
                    id = Get-NfeFileKey $_
                    name = $_.Name
                    relativePath = Get-RelativeXmlPath $_.FullName
                    size = $_.Length
                    lastWriteTimeUtc = $_.LastWriteTimeUtc.ToString('o')
                }
            })
            Write-JsonResponse $context 200 ([ordered]@{
                ok = $true
                modo = 'somente_leitura'
                items = $items
                totalDisponivel = $unicos.Count
                limite = $limit
            }) $origin
            continue
        }

        if ($route -eq 'api/sigewin/xml') {
            $arquivo = Resolve-XmlPath $context.Request.QueryString['path']
            if (-not $arquivo) {
                Write-TextResponse $context 404 'XML nao encontrado na pasta permitida.' 'text/plain; charset=utf-8' $origin
                continue
            }
            $bytes = [System.IO.File]::ReadAllBytes($arquivo)
            $context.Response.StatusCode = 200
            $context.Response.ContentType = 'application/xml; charset=utf-8'
            $context.Response.Headers.Add('Access-Control-Allow-Origin', $origin)
            $context.Response.Headers.Add('Access-Control-Allow-Methods', 'GET, OPTIONS')
            $context.Response.Headers.Add('Cache-Control', 'no-store')
            $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
            $context.Response.Close()
            continue
        }

        Write-TextResponse $context 404 'Rota nao encontrada.' 'text/plain; charset=utf-8' $origin
    } catch {
        try { Write-TextResponse $context 500 $_.Exception.Message 'text/plain; charset=utf-8' '*' } catch {}
    }
}
