param(
    [string]$RootDir = "C:\ORQUESTRA.CS\SERRARIA-VANMARTE",
    [int]$IntervaloSegundos = 10
)

$ErrorActionPreference = "Stop"

$FinanceiroDir = Join-Path $RootDir "FINANCEIRO"
$EntradaDir = Join-Path $FinanceiroDir "ENTRADA"
$BoletosDir = Join-Path $FinanceiroDir "BOLETOS"
$ImpostosDir = Join-Path $FinanceiroDir "IMPOSTOS"
$NotasDir = Join-Path $FinanceiroDir "NOTAS-FISCAIS"
$ComprovantesDir = Join-Path $FinanceiroDir "COMPROVANTES"
$ProcessadosDir = Join-Path $FinanceiroDir "PROCESSADOS"
$IgnoradosDir = Join-Path $FinanceiroDir "IGNORADOS"
$ErrosDir = Join-Path $FinanceiroDir "ERROS"
$FilaDir = Join-Path $FinanceiroDir "FILA"

$dirs = @(
    $RootDir,
    (Join-Path $RootDir "BACKUPS"),
    $FinanceiroDir,
    $EntradaDir,
    $BoletosDir,
    $ImpostosDir,
    $NotasDir,
    $ComprovantesDir,
    $ProcessadosDir,
    $IgnoradosDir,
    $ErrosDir,
    $FilaDir,
    (Join-Path $RootDir "ROMANEIOS"),
    (Join-Path $RootDir "RECIBOS"),
    (Join-Path $RootDir "RELATORIOS"),
    (Join-Path $RootDir "ETIQUETAS"),
    (Join-Path $RootDir "XML"),
    (Join-Path $RootDir "IMPORTACOES"),
    (Join-Path $RootDir "EXPORTACOES"),
    (Join-Path $RootDir "LOGS"),
    (Join-Path $RootDir "CONFIG")
)

foreach ($dir in $dirs) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

function Get-SafeName {
    param([string]$Name)
    return ($Name -replace '[\\/:*?"<>|]', '_')
}

function Get-UniquePath {
    param([string]$Directory, [string]$FileName)
    $safeName = Get-SafeName $FileName
    $destino = Join-Path $Directory $safeName
    if (-not (Test-Path -LiteralPath $destino)) { return $destino }
    $base = [System.IO.Path]::GetFileNameWithoutExtension($safeName)
    $ext = [System.IO.Path]::GetExtension($safeName)
    return Join-Path $Directory ("{0}_{1}{2}" -f $base, (Get-Date -Format "yyyyMMddHHmmss"), $ext)
}

function Get-DocumentClass {
    param([System.IO.FileInfo]$File)
    $name = $File.Name.ToUpperInvariant()
    $ext = $File.Extension.ToLowerInvariant()
    if ($ext -eq ".xml") { return @{ Tipo = "NOTA FISCAL"; Dir = $NotasDir } }
    if ($name -match "DARF|RECEITA|FGTS|INSS|IMPOSTO|SIMPLES|DAS") { return @{ Tipo = "IMPOSTO"; Dir = $ImpostosDir } }
    if ($name -match "COMPROVANTE|PAGO|PAGAMENTO") { return @{ Tipo = "COMPROVANTE"; Dir = $ComprovantesDir } }
    if ($name -match "NOTA|NF|NFE|DANFE") { return @{ Tipo = "NOTA FISCAL"; Dir = $NotasDir } }
    if ($name -match "BOLETO|FATURA|SICREDI|BRADESCO|BANCO|ASSISTENCIAL") { return @{ Tipo = "BOLETO"; Dir = $BoletosDir } }
    return @{ Tipo = "DOCUMENTO"; Dir = $IgnoradosDir }
}

function Convert-FileToBase64DataUrl {
    param([string]$Path)
    $ext = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()
    $mime = switch ($ext) {
        ".pdf" { "application/pdf" }
        ".xml" { "application/xml" }
        ".png" { "image/png" }
        ".jpg" { "image/jpeg" }
        ".jpeg" { "image/jpeg" }
        default { "application/octet-stream" }
    }
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    return "data:$mime;base64,$([Convert]::ToBase64String($bytes))"
}

function New-FinanceiroQueueItem {
    param([System.IO.FileInfo]$File)
    $classe = Get-DocumentClass -File $File
    $destino = Get-UniquePath -Directory $classe.Dir -FileName $File.Name
    Move-Item -LiteralPath $File.FullName -Destination $destino

    $movedFile = Get-Item -LiteralPath $destino
    $id = "fila_{0}_{1}" -f (Get-Date -Format "yyyyMMddHHmmss"), ([guid]::NewGuid().ToString("N").Substring(0, 8))
    $jsonPath = Join-Path $FilaDir "$id.json"

    $payload = [ordered]@{
        id = $id
        status = "PENDENTE_CONFERENCIA"
        origem = "MONITOR_PASTA_RAIZ"
        criadoEm = (Get-Date).ToUniversalTime().ToString("o")
        rootDir = $RootDir
        arquivoOriginal = $File.FullName
        arquivoLocal = $movedFile.FullName
        pastaLocal = $movedFile.DirectoryName
        nomeArquivo = $movedFile.Name
        extensao = $movedFile.Extension.ToLowerInvariant()
        tamanho = $movedFile.Length
        sugestao = [ordered]@{
            aba = "caixa-financeira"
            tipo = $classe.Tipo
            descricao = if ($classe.Tipo -eq "DOCUMENTO") { "PENDENTE DE CONFERENCIA" } else { $classe.Tipo }
            vencimento = ""
            valor = 0
            observacao = "ARQUIVO LOCAL: $($movedFile.FullName)"
            pago = $false
        }
        anexo = [ordered]@{
            nome = $movedFile.Name
            tipo = if ($movedFile.Extension.ToLowerInvariant() -eq ".pdf") { "application/pdf" } elseif ($movedFile.Extension.ToLowerInvariant() -eq ".xml") { "application/xml" } else { "application/octet-stream" }
            localPath = $movedFile.FullName
            localFolder = $movedFile.DirectoryName
            localUrl = "http://127.0.0.1:8765/arquivo?path=$([uri]::EscapeDataString($movedFile.FullName))"
            dados = Convert-FileToBase64DataUrl $movedFile.FullName
            storage = "LOCAL"
        }
    }
    $payload | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $jsonPath -Encoding UTF8
    Write-Host "Fila criada: $($movedFile.Name) -> $jsonPath"
}

Write-Host "Monitor Financeiro Orquestra.cs"
Write-Host "Pasta raiz: $RootDir"
Write-Host "Entrada: $EntradaDir"
Write-Host "Fila: $FilaDir"
Write-Host "Pressione Ctrl+C para parar."

while ($true) {
    $files = Get-ChildItem -LiteralPath $EntradaDir -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Extension -match '^\.(pdf|xml|png|jpg|jpeg)$' }

    foreach ($file in $files) {
        try {
            Start-Sleep -Milliseconds 500
            New-FinanceiroQueueItem -File $file
        } catch {
            Write-Warning "Falha ao processar $($file.FullName): $($_.Exception.Message)"
            if (Test-Path -LiteralPath $file.FullName) {
                Move-Item -LiteralPath $file.FullName -Destination (Get-UniquePath -Directory $ErrosDir -FileName $file.Name) -Force
            }
        }
    }

    Start-Sleep -Seconds $IntervaloSegundos
}
