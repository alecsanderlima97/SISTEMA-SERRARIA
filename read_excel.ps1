
$filePath = "c:\Users\alecs\OneDrive\Documentos\SISTEMA-SERRARIA-main\temp_romaneio.xlsx"
if (!(Test-Path $filePath)) {
    Write-Output "Arquivo temp nao encontrado."
    exit
}

try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $wb = $excel.Workbooks.Open($filePath)
    if ($wb -eq $null) { Write-Output "Workbook nulo"; exit }
    
    $ws = $wb.Sheets.Item(1)
    if ($ws -eq $null) { Write-Output "Worksheet nula"; exit }
    
    Write-Output "--- INICIO DA PLANILHA ---"
    for ($r = 1; $r -le 60; $r++) {
        $rowText = ""
        for ($c = 1; $c -le 15; $c++) {
            $val = $ws.Cells.Item($r, $c).Text
            if ($val) {
                $rowText += "[$val] "
            }
        }
        if ($rowText.Trim()) {
            $msg = "Linha " + $r + ": " + $rowText
            Write-Output $msg
        }
    }
    Write-Output "--- FIM DA PLANILHA ---"
    
    $wb.Close($false)
    $excel.Quit()
} catch {
    Write-Output "Erro ao ler a planilha: $_"
} finally {
    if ($excel) { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null }
    # Remove o arquivo temporario
    Remove-Item $filePath -ErrorAction SilentlyContinue
}
