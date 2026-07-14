param(
    [string]$BaseDir = "C:\VANMARTE\FINANCEIRO.ORQUESTRACS",
    [int]$IntervaloSegundos = 10
)

$ErrorActionPreference = "Stop"

$EntradaDir = Join-Path $BaseDir "ENTRADA"
$ProcessadosDir = Join-Path $BaseDir "PROCESSADOS"
$ErrosDir = Join-Path $BaseDir "ERROS"
$FilaDir = Join-Path $BaseDir "FILA"

foreach ($dir in @($EntradaDir, $ProcessadosDir, $ErrosDir, $FilaDir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

function Get-SafeName {
    param([string]$Name)
    return ($Name -replace '[\\/:*?"<>|]', '_')
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
    $id = "fila_{0}_{1}" -f (Get-Date -Format "yyyyMMddHHmmss"), ([guid]::NewGuid().ToString("N").Substring(0, 8))
    $safeName = Get-SafeName $File.Name
    $jsonPath = Join-Path $FilaDir "$id.json"
    $payload = [ordered]@{
        id = $id
        status = "PENDENTE_CONFERENCIA"
        origem = "MONITOR_PASTA"
        criadoEm = (Get-Date).ToUniversalTime().ToString("o")
        arquivoOriginal = $File.FullName
        nomeArquivo = $File.Name
        extensao = $File.Extension.ToLowerInvariant()
        tamanho = $File.Length
        sugestao = [ordered]@{
            aba = "caixa-financeira"
            tipo = "DOCUMENTO"
            descricao = "PENDENTE DE CONFERENCIA"
            vencimento = ""
            valor = 0
            observacao = "IMPORTADO PELO MONITOR FINANCEIRO: $($File.Name)"
            pago = $false
        }
        anexo = [ordered]@{
            nome = $File.Name
            tipo = if ($File.Extension.ToLowerInvariant() -eq ".pdf") { "application/pdf" } elseif ($File.Extension.ToLowerInvariant() -eq ".xml") { "application/xml" } else { "application/octet-stream" }
            dados = Convert-FileToBase64DataUrl $File.FullName
        }
    }
    $payload | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $jsonPath -Encoding UTF8
    $destino = Join-Path $ProcessadosDir $safeName
    if (Test-Path -LiteralPath $destino) {
        $destino = Join-Path $ProcessadosDir ("{0}_{1}{2}" -f [System.IO.Path]::GetFileNameWithoutExtension($safeName), (Get-Date -Format "yyyyMMddHHmmss"), $File.Extension)
    }
    Move-Item -LiteralPath $File.FullName -Destination $destino
    Write-Host "Importado para fila: $($File.Name) -> $jsonPath"
}

Write-Host "Monitor financeiro Orquestra.cs"
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
            $safeName = Get-SafeName $file.Name
            $destinoErro = Join-Path $ErrosDir $safeName
            if (Test-Path -LiteralPath $file.FullName) {
                Move-Item -LiteralPath $file.FullName -Destination $destinoErro -Force
            }
        }
    }

    Start-Sleep -Seconds $IntervaloSegundos
}
