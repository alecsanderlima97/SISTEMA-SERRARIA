param(
    [string]$RootDir = "C:\VANMARTE\ORQUESTRA.CS\SERRARIA-VANMARTE",
    [string]$FinanceiroDir = "C:\VANMARTE\FINANCEIRO.ORQUESTRACS"
)

$ErrorActionPreference = "Stop"

$dirs = @(
    $RootDir,
    "$RootDir\BACKUPS",
    $FinanceiroDir,
    "$FinanceiroDir\ENTRADA",
    "$FinanceiroDir\BOLETOS",
    "$FinanceiroDir\IMPOSTOS",
    "$FinanceiroDir\NOTAS-FISCAIS",
    "$FinanceiroDir\COMPROVANTES",
    "$FinanceiroDir\PROCESSADOS",
    "$FinanceiroDir\IGNORADOS",
    "$FinanceiroDir\ERROS",
    "$FinanceiroDir\FILA",
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
