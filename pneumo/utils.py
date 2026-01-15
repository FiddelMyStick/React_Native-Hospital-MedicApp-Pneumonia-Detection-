import numpy as np
import tensorflow as tf
import cv2
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import io
from PIL import Image

def make_gradcam_heatmap(img_array, model, last_conv_layer_name, pred_index=None):
    """Robust Grad-CAM implementation supporting single/multi-input models and
    different output shapes. Returns a normalized heatmap (H, W) as a numpy array."""
    # Build a model that outputs the last conv layer and predictions
    try:
        grad_model = tf.keras.models.Model(
            inputs=model.input,
            outputs=[model.get_layer(last_conv_layer_name).output, model.output]
        )
    except Exception:
        # Fallback if model.input isn't available in expected form
        grad_model = tf.keras.models.Model(
            inputs=model.inputs,
            outputs=[model.get_layer(last_conv_layer_name).output, model.output]
        )

    # Prepare inputs for the grad_model (handle list/tuple inputs)
    # Convert numpy arrays to tf.Tensor to avoid 'ndarray' being passed to tape.watch
    if isinstance(model.input, (list, tuple)):
        inputs = [tf.convert_to_tensor(img_array, dtype=tf.float32)]
        watched = inputs[0]
    else:
        inputs = tf.convert_to_tensor(img_array, dtype=tf.float32)
        watched = inputs

    with tf.GradientTape() as tape:
        # Ensure we watch the correct tensor for gradients
        tape.watch(watched)

        last_conv_layer_output, preds = grad_model(inputs)
        preds = tf.convert_to_tensor(preds)

        # Determine target class index
        if pred_index is None:
            if preds.shape[-1] == 1:
                pred_index = 0
            else:
                pred_index = tf.argmax(preds[0])

        # Select the predicted class score
        # Use gather to be robust to tensor indexing
        class_channel = tf.gather(preds, tf.cast(pred_index, tf.int32), axis=1)
        # If preds has shape (batch, ) after gather, ensure shape (batch,)
        class_channel = tf.reshape(class_channel, (-1,))

    # Compute gradients of the top predicted class with respect to the feature map
    grads = tape.gradient(class_channel, last_conv_layer_output)
    if grads is None:
        raise RuntimeError("Gradients are None; cannot compute Grad-CAM")

    # Global-average-pool the gradients over the spatial dimensions
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    # Multiply each channel by the mean gradient and sum to get the heatmap
    feature_map = last_conv_layer_output[0]
    heatmap = tf.reduce_sum(tf.multiply(feature_map, pooled_grads), axis=-1)

    # Normalize heatmap to [0, 1]
    heatmap = tf.maximum(heatmap, 0)
    max_val = tf.reduce_max(heatmap)
    if tf.equal(max_val, 0):
        # Avoid division by zero
        return np.zeros_like(heatmap.numpy())
    heatmap = heatmap / max_val

    return heatmap.numpy()

def save_and_display_gradcam(img_bytes, heatmap, cam_path="cam.jpg", alpha=0.4):
    # Load the original image
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    img = img.resize((224, 224))
    img = np.array(img)

    # Rescale heatmap to a range 0-255
    heatmap = np.uint8(255 * heatmap)

    # Use jet colormap to colorize heatmap
    jet = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)

    # Jet colormap uses BGR schemes, convert to RGB
    jet = cv2.cvtColor(jet, cv2.COLOR_BGR2RGB)

    # Resize heatmap to match image size
    jet = cv2.resize(jet, (img.shape[1], img.shape[0]))

    # Superimpose the heatmap on original image
    superimposed_img = jet * alpha + img
    superimposed_img = np.clip(superimposed_img, 0, 255).astype('uint8') # Fix clipping issues
    
    # Save the superimposed image
    # cv2.imwrite(cam_path, cv2.cvtColor(superimposed_img, cv2.COLOR_RGB2BGR))
    
    # Return as PIL Image
    return Image.fromarray(superimposed_img)

def generate_pdf(original_img_bytes, heatmap_img, prediction, confidence, model_name, patient_name=None):
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # Title
    c.setFont("Helvetica-Bold", 24)
    c.drawString(50, height - 50, "Pneumonia Detection Report")

    # Info
    c.setFont("Helvetica", 14)
    c.drawString(50, height - 100, f"Model Used: {model_name}")
    c.drawString(50, height - 120, f"Prediction: {prediction}")
    c.drawString(50, height - 140, f"Confidence: {confidence}")

    # Patient name if provided
    if patient_name:
        c.drawString(50, height - 160, f"Patient: {patient_name}")

    # Draw Original Image
    img1 = Image.open(io.BytesIO(original_img_bytes)).convert("RGB")
    # Resize for PDF
    img1.thumbnail((300, 300))
    c.drawImage(ImageReader(img1), 50, height - 490, width=250, preserveAspectRatio=True)
    c.drawString(50, height - 510, "Original X-Ray")

    # Draw Heatmap
    # Resize for PDF
    heatmap_img.thumbnail((300, 300))
    c.drawImage(ImageReader(heatmap_img), 320, height - 490, width=250, preserveAspectRatio=True)
    c.drawString(320, height - 510, "Grad-CAM Heatmap")

    c.showPage()
    c.save()

    buffer.seek(0)
    return buffer.read()
