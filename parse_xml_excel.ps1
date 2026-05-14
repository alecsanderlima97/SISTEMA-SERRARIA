
$basePath = "c:\Users\alecs\OneDrive\Documentos\SISTEMA-SERRARIA-main\excel_data"
$stringsPath = Join-Path $basePath "xl\sharedStrings.xml"
$sheetPath = Join-Path $basePath "xl\worksheets\sheet1.xml"

# Carregar strings
$strings = @()
if (Test-Path $stringsPath) {
    [xml]$xmlStrings = Get-Content $stringsPath
    $strings = $xmlStrings.sst.si.t
    if ($strings -eq $null) {
        $strings = $xmlStrings.sst.si | ForEach-Object { $_.t.'#text' -join "" }
    }
}

# Carregar planilha
[xml]$xmlSheet = Get-Content $sheetPath
$rows = $xmlSheet.worksheet.sheetData.row

Write-Output "--- ANALISE DO ROMANEIO ---"
foreach ($row in $rows) {
    $rowText = ""
    foreach ($c in $row.c) {
        $val = $c.v
        if ($c.t -eq "s") {
            $val = $strings[[int]$val]
        }
        if ($val) {
            $rowText += "[$($c.r): $val] "
        }
    }
    if ($rowText.Trim()) {
        Write-Output $rowText
    }
}
