import re
import sys
import os
import shutil

# Rutas constantes
RUTA_ORIGEN = r"C:\Users\danys\Documents\Brain\Files"
RUTA_DESTINO = r"C:\Users\danys\Documents\Blog\hackstark\static\img"

def procesar_markdown(file_path):
    """Lee el archivo .md, reemplaza las imágenes y devuelve una lista de nombres."""
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    pattern = re.compile(r'!\[\[(.*?)\]\]')
    img_counter = 1
    image_names = []

    for i, line in enumerate(lines):
        match = pattern.search(line)
        if match:
            original_name = match.group(1).strip()
            image_names.append(original_name)
            image_name = original_name.replace(" ", "%20")
            new_format = f"![img{img_counter}](/img/{image_name})"
            lines[i] = new_format + "\n"
            img_counter += 1

    with open(file_path, "w", encoding="utf-8") as f:
        f.writelines(lines)

    print(f"✅ Reemplazo completado correctamente ({img_counter - 1} imágenes modificadas) en '{file_path}'.")
    return image_names


def copiar_imagenes(image_names):
    """Copia automáticamente las imágenes desde la ruta fija de origen a la ruta destino."""
    # Crear carpeta destino si no existe
    if not os.path.exists(RUTA_DESTINO):
        os.makedirs(RUTA_DESTINO)
        print(f"📂 Carpeta destino creada: {RUTA_DESTINO}")

    copiados = 0
    for img in image_names:
        src = os.path.join(RUTA_ORIGEN, img)
        if os.path.exists(src):
            shutil.copy2(src, RUTA_DESTINO)
            copiados += 1
        else:
            print(f"⚠️ No se encontró la imagen: {img}")

    print(f"✅ Se copiaron {copiados} imágenes correctamente a '{RUTA_DESTINO}'.")


def main():
    if len(sys.argv) < 2:
        print("❌ Uso: python formato.py <archivo.md>")
        sys.exit(1)

    file_path = sys.argv[1]

    if not os.path.exists(file_path):
        print(f"❌ El archivo '{file_path}' no existe.")
        sys.exit(1)

    # Procesar markdown
    image_names = procesar_markdown(file_path)

    # Copiar imágenes si se encontraron
    if image_names:
        copiar_imagenes(image_names)
    else:
        print("ℹ️ No se encontraron imágenes en el archivo.")


if __name__ == "__main__":
    main()
