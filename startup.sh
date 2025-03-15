#!/bin/bash

# Create and activate virtual environment
python -m venv env
source env/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create necessary directories
mkdir -p static
mkdir -p templates
mkdir -p models

# Move files to correct locations
if [ -f "index.html" ]; then
    mv index.html templates/
fi

if [ -f "script.js" ]; then
    mv script.js static/
fi

# Download model files if they don't exist
if [ ! -f "models/model.h5" ]; then
    echo "Model file not found. You need to upload it manually to the models directory."
fi

if [ ! -f "models/preprocessors.joblib" ]; then
    echo "Preprocessors file not found. You need to upload it manually to the models directory."
fi

# Start Gunicorn server
gunicorn --bind=0.0.0.0:8000 app:app