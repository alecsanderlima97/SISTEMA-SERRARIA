import pandas as pd

file_path = r"C:\VANMARTE\001-VANMARTE SERRARIA 2021 a 2026\08 - ESTOQUE\ESTOQUE - VANMARTE 2025 a 2026.xlsx"

try:
    xl = pd.ExcelFile(file_path)
    print(f"Sheets: {xl.sheet_names}")
    
    for sheet_name in xl.sheet_names:
        print(f"\n--- Sheet: {sheet_name} ---")
        df = xl.parse(sheet_name)
        print(df.head(10))
        print(f"Columns: {df.columns.tolist()}")
except Exception as e:
    print(f"Error: {e}")
