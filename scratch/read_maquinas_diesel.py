import pandas as pd

file_path = r"C:\VANMARTE\001-VANMARTE SERRARIA 2021 a 2026\08 - ESTOQUE\ESTOQUE - VANMARTE 2025 a 2026.xlsx"

try:
    xl = pd.ExcelFile(file_path)
    
    # Read MAQUINAS
    df_maquinas = xl.parse('MAQUINAS')
    print("--- MAQUINAS ---")
    print(df_maquinas.to_json(orient='records', indent=2))
    
    # Read CONTROLE DE DIESEL columns to understand structure
    df_diesel = xl.parse('CONTROLE DE DIESEL', header=None) # Sometimes header is not at 0
    print("\n--- CONTROLE DE DIESEL (Raw 20 rows) ---")
    print(df_diesel.head(20).to_json(orient='records', indent=2))
    
except Exception as e:
    print(f"Error: {e}")
