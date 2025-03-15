import os
import cv2
import numpy as np
import base64
import mediapipe as mp
import tensorflow as tf
import joblib
import pandas as pd
from flask_cors import CORS
from flask import Flask, render_template, request, jsonify, send_from_directory

# Initialize Flask app
app = Flask(__name__, 
            static_folder='static',
            template_folder='templates')

CORS(app)

# MediaPipe setup
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
pose = mp_pose.Pose(
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
    model_complexity=0
)

# Load ML model components
MODEL_DIR = os.environ.get('MODEL_DIR', 'models')
try:
    model = tf.keras.models.load_model(os.path.join(MODEL_DIR, 'model.h5'))
    preprocessors = joblib.load(os.path.join(MODEL_DIR, 'preprocessors.joblib'))
    print("ML model loaded successfully")
except Exception as e:
    print(f"Error loading ML model: {e}")
    model = None
    preprocessors = None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/process_frame', methods=['POST'])
def process_frame():
    try:
        # Get frame data
        frame_data = request.get_json()
        if not frame_data or 'image' not in frame_data:
            return jsonify({'error': 'No image data received'}), 400

        # Decode image
        try:
            base64_data = frame_data['image'].split('base64,')[1]
            image_bytes = base64.b64decode(base64_data)
            nparr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                raise ValueError("Failed to decode image")
                
        except Exception as e:
            print(f"Image decoding error: {str(e)}")
            return jsonify({'error': 'Invalid image data'}), 400

        # Process frame with MediaPipe
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(frame_rgb)

        # Always create a copy for drawing
        annotated_frame = frame.copy()

        landmarks_detected = False
        pose_class = "Unknown"
        pose_confidence = 0.0
        
        if results.pose_landmarks:
            landmarks_detected = True
            # Draw pose landmarks
            mp_drawing.draw_landmarks(
                annotated_frame,
                results.pose_landmarks,
                mp_pose.POSE_CONNECTIONS,
                mp_drawing.DrawingSpec(color=(245, 117, 66), thickness=2, circle_radius=2),
                mp_drawing.DrawingSpec(color=(245, 66, 230), thickness=2)
            )
            
            # If model is loaded, make pose prediction
            if model is not None and preprocessors is not None:
                try:
                    # Extract landmarks as in model.py
                    landmarks = []
                    for landmark in results.pose_landmarks.landmark:
                        landmarks.extend([landmark.x, landmark.y, landmark.z, landmark.visibility])
                    
                    # Preprocess and predict
                    X = pd.DataFrame([landmarks])
                    X_scaled = preprocessors['scaler'].transform(X)
                    pred = model.predict(X_scaled, verbose=0)
                    pose_class = preprocessors['label_encoder'].inverse_transform([np.argmax(pred)])[0]
                    pose_confidence = float(np.max(pred))
                    
                    # Display prediction on the annotated frame
                    cv2.putText(
                        annotated_frame,
                        f"Pose: {pose_class} ({pose_confidence:.2f})",
                        (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        (255, 255, 0),
                        2
                    )
                except Exception as e:
                    print(f"Error during pose classification: {str(e)}")
                    cv2.putText(
                        annotated_frame,
                        "Classification error",
                        (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        (0, 0, 255),
                        2
                    )

        # Always encode and return the frame
        _, buffer = cv2.imencode('.jpg', annotated_frame)
        processed_image = base64.b64encode(buffer).decode('utf-8')
        
        return jsonify({
            'processed_image': f'data:image/jpeg;base64,{processed_image}',
            'landmarks_detected': landmarks_detected,
            'pose_class': pose_class,
            'pose_confidence': pose_confidence
        })

    except Exception as e:
        print(f"Error processing frame: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Make sure the script path is in the Python path
    import sys
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    
    # Create static folder if it doesn't exist
    if not os.path.exists('static'):
        os.makedirs('static')
        print("Created static folder")
        
    # Create templates folder if it doesn't exist
    if not os.path.exists('templates'):
        os.makedirs('templates')
        print("Created templates folder")
    
    # Create models folder if it doesn't exist
    if not os.path.exists('models'):
        os.makedirs('models')
        print("Created models folder")
    
    app.run(host='0.0.0.0', port=8000, debug=True)