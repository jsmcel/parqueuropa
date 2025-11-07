#!/usr/bin/env python3
import docx
import os
import sys

def extract_docx_content(filename, output_file):
    try:
        # Abrir documento
        doc = docx.Document(filename)
        
        # Extraer texto de todos los párrafos
        paragraphs = []
        for paragraph in doc.paragraphs:
            text = paragraph.text.strip()
            if text:  # Solo agregar párrafos no vacíos
                paragraphs.append(text)
        
        # Unir párrafos con saltos de línea
        content = '\n'.join(paragraphs)
        
        # Guardar en archivo
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Contenido extraído exitosamente a: {output_file}")
        return True
        
    except Exception as e:
        print(f"Error al extraer contenido de {filename}: {e}")
        return False

if __name__ == "__main__":
    # Listar archivos DOCX en el directorio actual
    docx_files = [f for f in os.listdir('.') if f.endswith('.docx')]
    
    print("Archivos DOCX encontrados:")
    for i, file in enumerate(docx_files, 1):
        print(f"{i}. {file}")
    
    # Extraer cada archivo
    for file in docx_files:
        if "experto" in file.lower() or "recorrido" in file.lower():
            output = "experto_content.txt"
        elif "cachondas" in file.lower() or "cachondo" in file.lower():
            output = "cachondo_content.txt"
        else:
            output = f"{file.replace('.docx', '')}_content.txt"
        
        extract_docx_content(file, output)
