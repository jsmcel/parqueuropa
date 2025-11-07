#!/usr/bin/env python3
import os
import re

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
            
        # Detectar títulos de monumentos
        if any(keyword in line for keyword in ['Atomium', 'Barco Vikingo', 'Torre Eiffel', 'Fontana de Trevi', 
                                              'La Sirenita', 'Manneken Pis', 'Molinos Holandeses', 'Muro de Berlín',
                                              'Plaza Mayor', 'Puente de Londres', 'Puerta de Alcalá', 'Teatro Griego',
                                              'David de Miguel Ángel', 'Puerta de Brandeburgo', 'Acrópolis', 'Torre de Pisa']):
            # Guardar monumento anterior si existe
            if current_monument and current_text:
                monuments[current_monument] = '\n'.join(current_text)
            
            # Iniciar nuevo monumento
            current_monument = line
            current_text = [line]
        else:
            if current_monument:
                current_text.append(line)
    
    # Guardar último monumento
    if current_monument and current_text:
        monuments[current_monument] = '\n'.join(current_text)
    
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
            
        # Detectar títulos de monumentos
        if any(keyword in line for keyword in ['Atomium', 'Barco Vikingo', 'Torre Eiffel', 'Fontana de Trevi', 
                                              'La Sirenita', 'Manneken Pis', 'Molinos Holandeses', 'Muro de Berlín',
                                              'Plaza Mayor', 'Puente de Londres', 'Puerta de Alcalá', 'Teatro Griego',
                                              'David de Miguel Ángel', 'Puerta de Brandeburgo', 'Acrópolis', 'Torre de Pisa']):
            # Guardar monumento anterior si existe
            if current_monument and current_text:
                monuments[current_monument] = '\n'.join(current_text)
            
            # Iniciar nuevo monumento
            current_monument = line
            current_text = [line]
        else:
            if current_monument:
                current_text.append(line)
    
    # Guardar último monumento
    if current_monument and current_text:
        monuments[current_monument] = '\n'.join(current_text)
    
    return monuments

def save_monument_texts(monuments, mode, base_path):
    """Guarda los textos de monumentos en sus carpetas correspondientes"""
    
    # Mapeo de nombres de monumentos a carpetas
    monument_mapping = {
        'Atomium': 'Atomium',
        'Barco Vikingo': 'Barco-Vikingo', 
        'Torre Eiffel': 'Torre-Eiffel',
        'Fontana de Trevi': 'Fontana-Trevi',
        'La Sirenita': 'La-Sirenita',
        'Manneken Pis': 'Manneken-Pis',
        'Molinos Holandeses': 'Molinos-Holanda',
        'Muro de Berlín': 'Muro-Berlin',
        'Plaza Mayor': 'Plaza-Mayor',
        'Puente de Londres': 'Puente-Londres',
        'Puerta de Alcalá': 'Puerta-Alcala',
        'Teatro Griego': 'Teatro-Griego',
        'David de Miguel Ángel': 'David-Miguel-Angel',
        'Puerta de Brandeburgo': 'Puerta-Brandeburgo',
        'Acrópolis': 'Acropolis',
        'Torre de Pisa': 'Torre-Pisa'
    }
    
    for monument_name, text in monuments.items():
        # Buscar el nombre de carpeta correspondiente
        folder_name = None
        for key, value in monument_mapping.items():
            if key in monument_name:
                folder_name = value
                break
        
        if folder_name:
            # Crear ruta del archivo
            file_path = os.path.join(base_path, folder_name, f'{mode}.txt')
            
            # Crear directorio si no existe
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            # Guardar archivo
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(text)
            
            print(f"Guardado: {file_path}")

if __name__ == "__main__":
    # Organizar textos expertos
    print("Organizando textos expertos...")
    expert_monuments = organize_expert_texts()
    save_monument_texts(expert_monuments, 'experto', '../tenants/parque_europa/texts/es')
    
    # Organizar textos cachondos
    print("Organizando textos cachondos...")
    cachondo_monuments = organize_cachondo_texts()
    save_monument_texts(cachondo_monuments, 'cachondo', '../tenants/parque_europa/texts/es')
    
    print("¡Organización completada!")


