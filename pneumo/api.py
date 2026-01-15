import os
import numpy as np
import tensorflow as tf
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from PIL import Image
from io import BytesIO
import base64
import utils

app = FastAPI()

# Map model names to file paths
MODEL_PATHS = {
    "resnet": os.path.join("resnet50", "model", "ResNet50_Pneumo.keras"),
    "densenet": os.path.join("densenet", "model", "DenseNet.keras"),
}

models = {}

def load_models():
    """Load models on startup."""
    print("Loading models...")
    try:
        if os.path.exists(MODEL_PATHS["resnet"]):
            models["resnet"] = tf.keras.models.load_model(MODEL_PATHS["resnet"])
            print("ResNet50 loaded.")
        else:
            print(f"Warning: {MODEL_PATHS['resnet']} not found.")

        if os.path.exists(MODEL_PATHS["densenet"]):
            models["densenet"] = tf.keras.models.load_model(MODEL_PATHS["densenet"])
            print("DenseNet loaded.")
        else:
            print(f"Warning: {MODEL_PATHS['densenet']} not found.")
            
    except Exception as e:
        print(f"Error loading models: {e}")

load_models()

def preprocess_image(image_bytes):
    """Resize to 224x224 and normalize."""
    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    img = img.resize((224, 224))
    img_array = np.array(img)
    img_array = img_array / 255.0  # Normalize to [0,1]
    img_array = np.expand_dims(img_array, axis=0) # Add batch dimension (1, 224, 224, 3)
    return img_array

@app.get("/")
def health_check():
    return {"status": "running", "models_loaded": list(models.keys())}

@app.post("/predict/{model_name}")
async def predict(model_name: str, file: UploadFile = File(...), patient_name: str = Form(None)):
    if model_name not in models:
        raise HTTPException(status_code=404, detail="Model not found or not loaded.")
    
    try:
        contents = await file.read()
        processed_img = preprocess_image(contents)
        
        prediction = models[model_name].predict(processed_img)
        
        # Heuristic: 0=Normal, 1=Pneumonia
        # Adjust index based on model output shape (1) or (2)
        prob = float(prediction[0][0]) if prediction.shape[-1] == 1 else float(prediction[0][1])
        
        label = "PNEUMONIA" if prob > 0.5 else "NORMAL"
        confidence = prob if prob > 0.5 else 1 - prob
        confidence_str = f"{confidence:.2%}"

        # Grad-CAM Layer Selection
        # ResNet50: conv5_block3_out
        # DenseNet121: conv5_block16_concat (or similar, try/except handles failures)
        last_conv_layer = "conv5_block3_out" if model_name == "resnet" else "conv5_block16_concat" 

        try:
             heatmap = utils.make_gradcam_heatmap(processed_img, models[model_name], last_conv_layer)
             heatmap_img = utils.save_and_display_gradcam(contents, heatmap)
        except Exception as e:
             print(f"Grad-CAM failed for {model_name}: {e}")
             # Only verify DenseNet specific layers if needed, or fallback.
             # If it fails, we assume no heatmap and use original.
             heatmap_img = Image.open(BytesIO(contents)).convert("RGB")

        # Generate PDF (include patient_name if provided)
        try:
            pdf_bytes = utils.generate_pdf(contents, heatmap_img, label, confidence_str, model_name, patient_name=patient_name)
            pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        except Exception as e:
            print(f"PDF Generation failed: {e}")
            pdf_base64 = None

        return {
            "model": model_name,
            "prediction": label,
            "confidence": confidence_str,
            "raw_probability": prob,
            "pdf_base64": pdf_base64
        }
    except Exception as e:
        print(f"Prediction logic failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
