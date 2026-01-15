require("dotenv").config();
const port = process.env.PORT || 5000;
const express = require("express");
const cors = require("cors");
const specialtiesRoutes = require("./routes/specialties.routes");
const doctorsRoutes = require("./routes/doctors.routes");
const authRoutes = require("./routes/auth.routes");
const app = express();
const patientsRoutes = require("./routes/patients.routes");
const path = require('path');
const fs = require('fs');

// Ensure DB schema is initialized on server start (idempotent)
try {
  require('./scripts/init_db');
} catch (e) {
  console.warn('DB init script failed to run at startup:', e.message);
} 

// Ensure uploads folder exists
const uploadsDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
app.use(express.json());

// Serve static uploaded files
app.use('/uploads', express.static(uploadsDir));

app.get("/", (req, res) => res.json({ ok: true, name: "MedicApp API" }));

app.use("/api/auth", authRoutes);


app.use("/api/specialties", specialtiesRoutes);
app.use("/api/doctors", doctorsRoutes);

app.use("/api/patients", patientsRoutes);
app.use("/api/predict", require("./routes/prediction.routes"));

app.listen(port, () => console.log(`API running on http://localhost:${port}`));
