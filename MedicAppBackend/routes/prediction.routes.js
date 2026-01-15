const router = require("express").Router();
const auth = require("../middleware/auth");
const multer = require("multer");
const upload = multer(); // memory storage

// POST /api/predict/:model
// Model: "resnet" or "densenet"
router.post("/:model", auth, upload.single("image"), async (req, res) => {
    try {
        const { model } = req.params;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "Image file is required." });
        }

        if (!["resnet", "densenet"].includes(model)) {
            return res.status(400).json({ message: "Invalid model selection." });
        }

        // Forward to Python API
        const formData = new FormData();
        const blob = new Blob([file.buffer], { type: file.mimetype });
        formData.append("file", blob, file.originalname);

        // Attach patientName if present in the request body or query
        const patientName = req.body.patientName || req.query.patientName;
        if (patientName) {
            formData.append("patient_name", patientName);
        }

        const pythonApiUrl = `http://127.0.0.1:8000/predict/${model}`;

        // Node.js 18+ native fetch
        const response = await fetch(pythonApiUrl, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Python API Error:", errText);
            return res.status(response.status).json({ message: "Error from Model Service." });
        }

        const data = await response.json();
        res.json(data);

    } catch (err) {
        console.error("Prediction Proxy Error:", err);
        res.status(500).json({ message: "Server error during prediction." });
    }
});

module.exports = router;
