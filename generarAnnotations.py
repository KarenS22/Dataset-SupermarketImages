import os
import pandas as pd

# Ruta al directorio con las imágenes aumentadas
# train_dir = 'Productos/Train_Aumentado'
train_dir = 'Productos/Validation'

# Obtener todas las clases base (sin combinaciones)
# Filtramos clases compuestas para obtener solo las clases verdaderas
classes = sorted([d for d in os.listdir(train_dir) if '_' not in d])

# También incluir clases que tengan guiones bajos pero sean válidas (ej. Red-Bell-Pepper)
# Si tienes clases válidas con "_" deberías listarlas manualmente o ajustar el criterio

# Inicializar anotaciones
annotations = []

# Recorrer todas las carpetas de imágenes
for cls_folder in os.listdir(train_dir):
    cls_path = os.path.join(train_dir, cls_folder)
    if not os.path.isdir(cls_path):
        continue

    # Detectar etiquetas de esta carpeta (split por "_" para multietiqueta)
    etiquetas = cls_folder.split('_')

    for img_name in os.listdir(cls_path):
        img_path = os.path.join(cls_path, img_name)
        row = {'image': img_path}
        for c in classes:
            row[c] = 1 if c in etiquetas else 0
        annotations.append(row)

# Crear DataFrame y guardar CSV
df = pd.DataFrame(annotations)
df.to_csv('annotations_val_multietiqueta.csv', index=False)

print("✅ Archivo 'annotations_val_multietiqueta.csv' generado con éxito.")
