import os
import zipfile
import shutil

# Lista de monumentos
monuments = [
    "Atomium",
    "Barco-Vikingo", 
    "David-Miguel-Angel",
    "Fontana-Trevi",
    "La-Sirenita",
    "Las-Tres-Gracias",
    "Manneken-Pis",
    "Molinos-Holanda",
    "Muro-Berlin",
    "Plaza-Europa",
    "Plaza-Mayor",
    "Puente-Londres",
    "Puente-Van-Gogh",
    "Puerta-Alcala",
    "Puerta-Brandeburgo",
    "Teatro-Griego",
    "Torre-Belem",
    "Torre-Eiffel"
]

# Modos de texto
modes = ["normal", "infantil", "experto", "cachondo"]

for monument in monuments:
    print(f"Procesando {monument}...")
    
    # Verificar si existe la carpeta del monumento
    if os.path.exists(monument):
        # Crear archivos vacíos para los modos que no existen
        for mode in modes:
            file_path = os.path.join(monument, f"{mode}.txt")
            if not os.path.exists(file_path):
                print(f"  Creando {file_path} (vacío)")
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write("")
        
        # Crear ZIP del monumento
        zip_path = f"{monument}.zip"
        if os.path.exists(zip_path):
            os.remove(zip_path)
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(monument):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, monument)
                    zipf.write(file_path, arcname)
        
        print(f"  Creado {zip_path}")
    else:
        print(f"  ERROR: No existe la carpeta {monument}")

print("¡Proceso completado!")




