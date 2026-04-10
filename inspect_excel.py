import pandas as pd
import os

file_path = r'c:\Users\Emili\OneDrive\Desktop\flotaya-docs\Excel Aranza.xlsx'
try:
    df = pd.read_excel(file_path)
    print("Columnas encontradas:")
    print(df.columns.tolist())
    print("\nPrimeras 5 filas:")
    print(df.head())
except Exception as e:
    print(f"Error al leer el archivo: {e}")
