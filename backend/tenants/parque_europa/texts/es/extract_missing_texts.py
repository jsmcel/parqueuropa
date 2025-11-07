import docx
import os

def extract_missing_texts():
    try:
        # Abrir el documento
        doc = docx.Document("textos que faltan.docx")
        
        # Extraer texto de todos los párrafos
        paragraphs = []
        for paragraph in doc.paragraphs:
            text = paragraph.text.strip()
            if text:  # Solo agregar párrafos no vacíos
                paragraphs.append(text)
        
        # Unir párrafos con saltos de línea
        content = '\n'.join(paragraphs)
        
        # Guardar en archivo
        with open("textos_faltantes_extraidos.txt", 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("Contenido extraído exitosamente a: textos_faltantes_extraidos.txt")
        print("Contenido:")
        print(content)
        return True
        
    except Exception as e:
        print(f"Error al extraer contenido: {e}")
        return False

if __name__ == "__main__":
    extract_missing_texts()


