import os
import pandas as pd

# Ruta al directorio de entrenamiento
train_dir = 'Productos/Validation'

# Obtener todas las clases
classes = sorted(os.listdir(train_dir))

# Inicializar lista de anotaciones
annotations = []

# Recorrer cada clase
for cls in classes:
    cls_path = os.path.join(train_dir, cls)
    for img_name in os.listdir(cls_path):
        img_path = os.path.join(cls_path, img_name)
        # Añadir una fila con 1 solo en la columna correspondiente
        row = {'image': img_path}
        for c in classes:
            row[c] = 1 if c == cls else 0
        annotations.append(row)

# Crear DataFrame y guardar CSV
df = pd.DataFrame(annotations)
df.to_csv('annotations_val.csv', index=False)

print("✅ Archivo 'annotations.csv' generado con éxito.")
