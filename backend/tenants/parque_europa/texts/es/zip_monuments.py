import os
import zipfile

# Lista de monumentos
monuments = [
    "Atomium", "Barco-Vikingo", "David-Miguel-Angel", "Fontana-Trevi",
    "La-Sirenita", "Las-Tres-Gracias", "Manneken-Pis", "Molinos-Holanda",
    "Muro-Berlin", "Plaza-Europa", "Plaza-Mayor", "Puente-Londres",
    "Puente-Van-Gogh", "Puerta-Alcala", "Puerta-Brandeburgo",
    "Teatro-Griego", "Torre-Belem", "Torre-Eiffel"
]

for monument in monuments:
    if os.path.exists(monument):
        zip_name = f"{monument}.zip"
        with zipfile.ZipFile(zip_name, 'w') as zipf:
            for root, dirs, files in os.walk(monument):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, monument)
                    zipf.write(file_path, arcname)
        print(f"Creado: {zip_name}")
    else:
        print(f"No existe: {monument}")

print("¡ZIPs creados!")


