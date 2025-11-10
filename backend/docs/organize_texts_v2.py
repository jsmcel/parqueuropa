#!/usr/bin/env python3
import os
import re

def clean_text(text):
    """Limpia el texto eliminando líneas vacías y espacios extra"""
    lines = text.split('\n')
    cleaned_lines = []
    for line in lines:
        line = line.strip()
        if line:
            cleaned_lines.append(line)
    return '\n'.join(cleaned_lines)

def organize_expert_texts():
    """Organiza los textos del modo experto por monumentos"""
    with open('experto_content.txt', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Dividir por monumentos usando títulos como separadores
    monuments = {}
    current_monument = None
    current_text = []
    
    lines = content.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Detectar títulos de monumentos (más específicos)
        monument_titles = [
            'Atomium (Bruselas, Bélgica)',
            'Barco Vikingo (Escandinavia, siglos VIII-XI)',
            'Torre Eiffel (París, Francia)',
            'Fontana de Trevi (Roma, Italia)',
            'La Sirenita (Copenhague, Dinamarca)',
            'Manneken Pis (Bruselas, Bélgica)',
            'Molinos Holandeses (Kinderdijk, Países Bajos)',
            'Muro de Berlín (Berlín, Alemania)',
            'Plaza Mayor (España)',
            'Puente de Londres (Reino Unido)',
            'Puerta de Alcalá (Madrid, España)',
            'Teatro Griego (Grecia clásica)',
            'David de Miguel Ángel (Florencia, Italia)',
            'Puerta de Brandeburgo (Berlín, Alemania)',
            'Acrópolis (Grecia)',
            'Torre de Pisa (Italia)'
        ]
        
        # Buscar coincidencia exacta
        found_monument = None
        for title in monument_titles:
            if title in line:
                found_monument = title
                break
        
        if found_monument:
            # Guardar monumento anterior si existe
            if current_monument and current_text:
                monuments[current_monument] = clean_text('\n'.join(current_text))
            
            # Iniciar nuevo monumento
            current_monument = found_monument
            current_text = [line]
        else:
            if current_monument:
                current_text.append(line)
    
    # Guardar último monumento
    if current_monument and current_text:
        monuments[current_monument] = clean_text('\n'.join(current_text))
    
    return monuments

def organize_cachondo_texts():
    """Organiza los textos del modo cachondo por monumentos"""
    with open('cachondo_content.txt', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Dividir por monumentos usando títulos como separadores
    monuments = {}
    current_monument = None
    current_text = []
    
    lines = content.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Detectar títulos de monumentos (más específicos)
        monument_titles = [
            'Atomium (Bruselas, Bélgica)',
            'Barco Vikingo (Escandinavia)',
            'Torre Eiffel (París, Francia)',
            'Fontana de Trevi (Roma, Italia)',
            'La Sirenita (Copenhague, Dinamarca)',
            'Manneken Pis (Bruselas, Bélgica)',
            'Molinos Holandeses (Kinderdijk, Países Bajos)',
            'Muro de Berlín (Berlín, Alemania)',
            'Plaza Mayor (España)',
            'Puente de Londres (Reino Unido)',
            'Puerta de Alcalá (Madrid, España)',
            'Teatro Griego (Grecia clásica)',
            'David de Miguel Ángel (Florencia, Italia)',
            'Puerta de Brandeburgo (Berlín, Alemania)',
            'Acrópolis (Grecia)',
            'Torre de Pisa (Italia)'
        ]
        
        # Buscar coincidencia exacta
        found_monument = None
        for title in monument_titles:
            if title in line:
                found_monument = title
                break
        
        if found_monument:
            # Guardar monumento anterior si existe
            if current_monument and current_text:
                monuments[current_monument] = clean_text('\n'.join(current_text))
            
            # Iniciar nuevo monumento
            current_monument = found_monument
            current_text = [line]
        else:
            if current_monument:
                current_text.append(line)
    
    # Guardar último monumento
    if current_monument and current_text:
        monuments[current_monument] = clean_text('\n'.join(current_text))
    
    return monuments

def save_monument_texts(monuments, mode, base_path):
    """Guarda los textos de monumentos en sus carpetas correspondientes"""
    
    # Mapeo de nombres de monumentos a carpetas
    monument_mapping = {
        'Atomium (Bruselas, Bélgica)': 'Atomium',
        'Barco Vikingo (Escandinavia, siglos VIII-XI)': 'Barco-Vikingo',
        'Barco Vikingo (Escandinavia)': 'Barco-Vikingo',
        'Torre Eiffel (París, Francia)': 'Torre-Eiffel',
        'Fontana de Trevi (Roma, Italia)': 'Fontana-Trevi',
        'La Sirenita (Copenhague, Dinamarca)': 'La-Sirenita',
        'Manneken Pis (Bruselas, Bélgica)': 'Manneken-Pis',
        'Molinos Holandeses (Kinderdijk, Países Bajos)': 'Molinos-Holanda',
        'Muro de Berlín (Berlín, Alemania)': 'Muro-Berlin',
        'Plaza Mayor (España)': 'Plaza-Mayor',
        'Puente de Londres (Reino Unido)': 'Puente-Londres',
        'Puerta de Alcalá (Madrid, España)': 'Puerta-Alcala',
        'Teatro Griego (Grecia clásica)': 'Teatro-Griego',
        'David de Miguel Ángel (Florencia, Italia)': 'David-Miguel-Angel',
        'Puerta de Brandeburgo (Berlín, Alemania)': 'Puerta-Brandeburgo',
        'Acrópolis (Grecia)': 'Acropolis',
        'Torre de Pisa (Italia)': 'Torre-Pisa'
    }
    
    for monument_name, text in monuments.items():
        # Buscar el nombre de carpeta correspondiente
        folder_name = monument_mapping.get(monument_name)
        
        if folder_name:
            # Crear ruta del archivo
            file_path = os.path.join(base_path, folder_name, f'{mode}.txt')
            
            # Crear directorio si no existe
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            # Guardar archivo
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(text)
            
            print(f"Guardado: {file_path}")
        else:
            print(f"No se encontró mapeo para: {monument_name}")

if __name__ == "__main__":
    # Organizar textos expertos
    print("Organizando textos expertos...")
    expert_monuments = organize_expert_texts()
    print(f"Encontrados {len(expert_monuments)} monumentos expertos")
    save_monument_texts(expert_monuments, 'experto', '../tenants/parque_europa/texts/es')
    
    # Organizar textos cachondos
    print("Organizando textos cachondos...")
    cachondo_monuments = organize_cachondo_texts()
    print(f"Encontrados {len(cachondo_monuments)} monumentos cachondos")
    save_monument_texts(cachondo_monuments, 'cachondo', '../tenants/parque_europa/texts/es')
    
    print("¡Organización completada!")




