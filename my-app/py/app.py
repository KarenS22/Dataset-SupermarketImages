import os
import cv2
import numpy as np
import base64

from flask import Flask, request, jsonify
from pathlib import Path
from flask_cors import CORS

# este es el motor de reconocimiento de productos
from sift_engine import get_sift_engine



app = Flask(__name__)

# CORS es para que pueda recibir peticiones de otros sitios web
CORS(app) 

SIFT_STORAGE = "sift_data.pkl"


sift_engine = get_sift_engine(str(SIFT_STORAGE))

@app.route('/register', methods=['POST'])
def register():
    """
    Registra un producto en la base de datos.
    por ahora funciona con una sola imagen, hay que hacerlo para un grupo de imagenes bien armadas

    Espera: 'image' file, 'name' text.
    Opcional: 'mask' file (binary image), 'threshold' float.
    """
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    name = request.form.get('name', 'Unknown')
    threshold = float(request.form.get('threshold', 0.04))
    
    img_bytes = file.read()
    nparr = np.frombuffer(img_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if image is None:
        return jsonify({'error': 'Invalid image'}), 400

    # Mask handling
    mask = None
    if 'mask' in request.files:
        mask_file = request.files['mask']
        mask_bytes = mask_file.read()
        mask_nparr = np.frombuffer(mask_bytes, np.uint8)
        mask = cv2.imdecode(mask_nparr, cv2.IMREAD_GRAYSCALE)
        
        # Ensure mask is same size as image
        if mask is not None:
             mask = cv2.resize(mask, (image.shape[1], image.shape[0]))
             # Threshold just to be safe it's binary
             _, mask = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)
    
    # Registrar con los parámetros
    success, msg = sift_engine.register_product(name, image, mask=mask, contrast_threshold=threshold)
    
    if success:

        return jsonify({'message': msg}), 200
    else:
        return jsonify({'error': msg}), 500



@app.route('/preview_keypoints', methods=['POST'])
def preview_keypoints():
    """
    Previsualización de puntos clave, previo a guardar el producto.
    Expects: 'image', 'mask' (opt), 'threshold' (opt).
    """
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    file = request.files['image']
    threshold = float(request.form.get('threshold', 0.04))

    img_bytes = file.read()
    nparr = np.frombuffer(img_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    mask = None
    if 'mask' in request.files:
        mask_file = request.files['mask']
        mask_bytes = mask_file.read()
        mask_nparr = np.frombuffer(mask_bytes, np.uint8)
        mask = cv2.imdecode(mask_nparr, cv2.IMREAD_GRAYSCALE)
        if mask is not None:
             mask = cv2.resize(mask, (image.shape[1], image.shape[0]))
             _, mask = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)

    # Detect & Draw
    vis_img, count = sift_engine.detect_keypoints_vis(image, mask=mask, contrast_threshold=threshold)
    
    # Encode return
    _, buffer = cv2.imencode('.jpg', vis_img)
    vis_base64 = base64.b64encode(buffer).decode('utf-8')
    
    #retorna la imagen con los puntos dibujados
    return jsonify({
        'keypoint_image': vis_base64,
        'count': count
    })


@app.route('/predict', methods=['POST'])
def predict():
    """
    Identificación de producto en la imagen subida.
    """

    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400 # no se puede predecir sin la imagen

    file = request.files['image']
    img_bytes = file.read()
    nparr = np.frombuffer(img_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if image is None:
        return jsonify({'error': 'Invalid image'}), 400 # la imagen no es valida

    label, matches = sift_engine.identify_product(image)  # identifica el producto
    
    if label:
        return jsonify({
            'label': label,
            'matches': matches,
            'probability': 1.0 # SIFT is deterministic "match found", simulated prob
        })
    else:
        return jsonify({
            'label': 'Unknown',
            'matches': matches,
            'probability': 0.0
        })









        

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
