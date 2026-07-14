param(
    [string]$RootDir = "C:\ORQUESTRA.CS\SERRARIA-VANMARTE"
)

$ErrorActionPreference = "Stop"

$dirs = @(
    $RootDir,
    "$RootDir\BACKUPS",
    "$RootDir\FINANCEIRO",
    "$RootDir\FINANCEIRO\ENTRADA",
    "$RootDir\FINANCEIRO\BOLETOS",
    "$RootDir\FINANCEIRO\IMPOSTOS",
    "$RootDir\FINANCEIRO\NOTAS-FISCAIS",
    "$RootDir\FINANCEIRO\COMPROVANTES",
    "$RootDir\FINANCEIRO\PROCESSADOS",
    "$RootDir\FINANCEIRO\IGNORADOS",
    "$RootDir\FINANCEIRO\ERROS",
    "$RootDir\FINANCEIRO\FILA",
    "$RootDir\ROMANEIOS",
    "$RootDir\RECIBOS",
    "$RootDir\RELATORIOS",
    "$RootDir\ETIQUETAS",
    "$RootDir\XML",
    "$RootDir\IMPORTACOES",
    "$RootDir\EXPORTACOES",
    "$RootDir\LOGS",
    "$RootDir\CONFIG"
)

foreach ($dir in $dirs) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

$readme = @"
ORQUESTRA.CS - PASTA RAIZ OPERACIONAL

Esta pasta guarda documentos locais importantes do sistema.

Fluxo financeiro recomendado:
1. Coloque boletos, impostos, notas e comprovantes em:
   $RootDir\FINANCEIRO\ENTRADA

2. Rode o monitor financeiro local.

3. O monitor organiza os arquivos em:
   - FINANCEIRO\BOLETOS
   - FINANCEIRO\IMPOSTOS
   - FINANCEIRO\NOTAS-FISCAIS
   - FINANCEIRO\COMPROVANTES
   - FINANCEIRO\IGNORADOS

4. O sistema salva no banco apenas os dados e a referencia local.

IMPORTANTE:
- Inclua esta pasta nos backups do cliente.
- Nao apague esta pasta sem antes fazer copia de seguranca.
"@

Set-Content -Path "$RootDir\LEIA-ME.txt" -Value $readme -Encoding UTF8

Write-Host "Pasta raiz criada/validada com sucesso:"
Write-Host $RootDir
Write-Host ""
Write-Host "Entrada financeira:"
Write-Host "$RootDir\FINANCEIRO\ENTRADA"
