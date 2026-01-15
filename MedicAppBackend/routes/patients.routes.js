const router = require("express").Router();
const { get, execute, query } = require("../db");
const auth = require("../middleware/auth");
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Disk storage for scans
const uploadsDir = path.resolve(__dirname, '..', 'uploads', 'scans');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
    cb(null, filename);
  }
});
const upload = multer({ storage });

// POST /api/patients  (create patient for logged-in doctor)
router.post("/", auth, async (req, res) => {
  try {
    const doctorId = req.user.doctorId;
    const { firstName, lastName, age, gender, phone } = req.body;

    if (!firstName || !lastName || age === undefined || age === null || !gender || !phone) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const ageInt = parseInt(age, 10);
    if (Number.isNaN(ageInt) || ageInt <= 0 || ageInt > 130) {
      return res.status(400).json({ message: "Invalid age." });
    }

    const result = await execute(`
        INSERT INTO Patients (DoctorId, FirstName, LastName, Age, Gender, Phone)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [doctorId, firstName.trim(), lastName.trim(), ageInt, gender.trim(), phone.trim()]);

    res.status(201).json({ id: result.lastID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});
// GET /api/patients/home (count + recent + scans/diagnoses counts)
router.get("/home", auth, async (req, res) => {
  try {
    const doctorId = req.user.doctorId;
    const countRes = await get(`SELECT COUNT(*) AS PatientsCount FROM Patients WHERE DoctorId=?`, [doctorId]);

    const recentRes = await query(`
        SELECT Id, FirstName, LastName, Age
        FROM Patients
        WHERE DoctorId=?
        ORDER BY Id DESC
        LIMIT 5
      `, [doctorId]);

    let scansCount = 0;
    let diagnosesCount = 0;
    try {
      const scansCountRes = await get(`SELECT COUNT(*) AS ScansCount FROM Scans WHERE DoctorId=?`, [doctorId]);
      scansCount = scansCountRes ? scansCountRes.ScansCount : 0;
      const diagnosesCountRes = await get(`SELECT COUNT(*) AS DiagnosesCount FROM Scans WHERE DoctorId=? AND Prediction = 'PNEUMONIA'`, [doctorId]);
      diagnosesCount = diagnosesCountRes ? diagnosesCountRes.DiagnosesCount : 0;
    } catch (e) {
      // If Scans table doesn't exist yet (migration not run), just return zeros and log
      console.warn('Scans counts unavailable:', e.message);
    }

    res.json({
      patientsCount: countRes.PatientsCount,
      recentPatients: recentRes,
      scansCount,
      diagnosesCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// POST /api/patients/:id/scans  (attach scan to patient)
router.post('/:id/scans', auth, upload.single('image'), async (req, res) => {
  try {
    const doctorId = req.user.doctorId;
    const patientId = parseInt(req.params.id, 10);
    if (Number.isNaN(patientId)) return res.status(400).json({ message: 'Invalid patient id.' });

    // validate patient belongs to doctor
    const patient = await get('SELECT Id FROM Patients WHERE Id=? AND DoctorId=?', [patientId, doctorId]);
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });

    const file = req.file;
    const prediction = req.body.prediction || null;
    const confidence = req.body.confidence || null;
    const model = req.body.model || null;
    const pdfBase64 = req.body.pdf_base64 || null;

    let imagePath = null;
    let pdfPath = null;

    let imageHash = null;
    if (file) {
      imagePath = `/uploads/scans/${file.filename}`;
      try {
        const buf = fs.readFileSync(path.resolve(uploadsDir, file.filename));
        const crypto = require('crypto');
        imageHash = crypto.createHash('sha256').update(buf).digest('hex');
      } catch (e) {
        console.warn('Could not hash image file:', e.message);
      }
    }

    if (pdfBase64) {
      const pdfFilename = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.pdf`;
      const pdfFullPath = path.resolve(__dirname, '..', 'uploads', pdfFilename);
      fs.writeFileSync(pdfFullPath, Buffer.from(pdfBase64, 'base64'));
      pdfPath = `/uploads/${pdfFilename}`;
    }

    // Check for duplicates: same patient + doctor + image hash
    if (imageHash) {
      try {
        const existing = await get(`SELECT Id, PatientId, DoctorId, ImagePath, PdfPath, Prediction, Confidence, Model, CreatedAt FROM Scans WHERE PatientId=? AND DoctorId=? AND ImageHash=? ORDER BY Id DESC LIMIT 1`, [patientId, doctorId, imageHash]);
        if (existing) {
          console.log('Duplicate scan detected, returning existing:', existing.Id);
          return res.status(200).json(existing);
        }
      } catch (e) {
        console.warn('Duplicate check failed:', e.message);
      }
    }

    let result;
    try {
      result = await execute(`
        INSERT INTO Scans (PatientId, DoctorId, ImagePath, PdfPath, Prediction, Confidence, Model, ImageHash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [patientId, doctorId, imagePath, pdfPath, prediction, confidence, model, imageHash]);

      console.log('Scan attached:', { scanId: result.lastID, patientId, doctorId, imagePath, pdfPath, prediction, confidence, model, imageHash });

      // Return the created scan row to help the client update UI immediately
      const created = await get(`SELECT Id, PatientId, DoctorId, ImagePath, PdfPath, Prediction, Confidence, Model, CreatedAt FROM Scans WHERE Id = ?`, [result.lastID]);
      return res.status(201).json(created);
    } catch (e) {
      // Handle uniqueness violation (race condition duplicate) by returning existing row
      if (e && e.code === 'SQLITE_CONSTRAINT') {
        try {
          const existing = await get(`SELECT Id, PatientId, DoctorId, ImagePath, PdfPath, Prediction, Confidence, Model, CreatedAt FROM Scans WHERE PatientId=? AND DoctorId=? AND ImageHash=? ORDER BY Id DESC LIMIT 1`, [patientId, doctorId, imageHash]);
          if (existing) {
            console.log('Insert conflict, returning existing scan', existing.Id);
            return res.status(200).json(existing);
          }
        } catch (e2) {
          console.warn('Error fetching existing scan after constraint:', e2.message);
        }
      }
      throw e;
    }
  } catch (err) {
    console.error('Attach scan error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/patients/:id/scans  (list scans for patient)
router.get('/:id/scans', auth, async (req, res) => {
  try {
    const doctorId = req.user.doctorId;
    const patientId = parseInt(req.params.id, 10);
    if (Number.isNaN(patientId)) return res.status(400).json({ message: 'Invalid patient id.' });

    const scans = await query(`
      SELECT Id, ImagePath, PdfPath, Prediction, Confidence, Model, CreatedAt
      FROM Scans
      WHERE PatientId = ? AND DoctorId = ?
      ORDER BY CreatedAt DESC
    `, [patientId, doctorId]);

    console.log(`Returning ${scans.length} scans for patient ${patientId} (doctor ${doctorId})`);
    res.json(scans);
  } catch (err) {
    console.error('Get scans error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// PUT /api/patients/:id/scans/:scanId  (update prediction/confidence)
router.put('/:id/scans/:scanId', auth, async (req, res) => {
  try {
    const doctorId = req.user.doctorId;
    const patientId = parseInt(req.params.id, 10);
    const scanId = parseInt(req.params.scanId, 10);
    if (Number.isNaN(patientId) || Number.isNaN(scanId)) return res.status(400).json({ message: 'Invalid id.' });

    const scan = await get('SELECT Id, PatientId, DoctorId FROM Scans WHERE Id=? AND PatientId=? AND DoctorId=?', [scanId, patientId, doctorId]);
    if (!scan) return res.status(404).json({ message: 'Scan not found.' });

    const { prediction, confidence } = req.body;
    await execute('UPDATE Scans SET Prediction = ?, Confidence = ? WHERE Id = ? AND PatientId = ? AND DoctorId = ?', [prediction || null, confidence || null, scanId, patientId, doctorId]);

    const updated = await get('SELECT Id, ImagePath, PdfPath, Prediction, Confidence, Model, CreatedAt FROM Scans WHERE Id = ?', [scanId]);
    console.log('Scan updated:', updated.Id);
    res.json(updated);
  } catch (err) {
    console.error('Update scan error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/patients/:id/scans/:scanId  (delete a scan)
router.delete('/:id/scans/:scanId', auth, async (req, res) => {
  try {
    const doctorId = req.user.doctorId;
    const patientId = parseInt(req.params.id, 10);
    const scanId = parseInt(req.params.scanId, 10);
    if (Number.isNaN(patientId) || Number.isNaN(scanId)) return res.status(400).json({ message: 'Invalid id.' });

    const scan = await get('SELECT Id, ImagePath, PdfPath FROM Scans WHERE Id=? AND PatientId=? AND DoctorId=?', [scanId, patientId, doctorId]);
    if (!scan) return res.status(404).json({ message: 'Scan not found.' });

    // Delete files if they exist (normalize stored paths that include a leading slash)
    try {
      if (scan.ImagePath) {
        const imgRel = scan.ImagePath.replace(/^\/+/, '');
        const imgFull = path.join(__dirname, '..', imgRel);
        console.log('Deleting image file at', imgFull);
        if (fs.existsSync(imgFull)) fs.unlinkSync(imgFull);
      }
      if (scan.PdfPath) {
        const pdfRel = scan.PdfPath.replace(/^\/+/, '');
        const pdfFull = path.join(__dirname, '..', pdfRel);
        console.log('Deleting pdf file at', pdfFull);
        if (fs.existsSync(pdfFull)) fs.unlinkSync(pdfFull);
      }
    } catch (e) {
      console.warn('Failed to delete scan files:', e.message);
    }

    await execute('DELETE FROM Scans WHERE Id = ? AND PatientId = ? AND DoctorId = ?', [scanId, patientId, doctorId]);
    console.log('Scan deleted:', scanId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete scan error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/patients/:id/scans/:scanId/rerun  (re-run analysis on stored image)
router.post('/:id/scans/:scanId/rerun', auth, async (req, res) => {
  try {
    const doctorId = req.user.doctorId;
    const patientId = parseInt(req.params.id, 10);
    const scanId = parseInt(req.params.scanId, 10);
    if (Number.isNaN(patientId) || Number.isNaN(scanId)) return res.status(400).json({ message: 'Invalid id.' });

    const scan = await get('SELECT Id, ImagePath, PdfPath, PatientId FROM Scans WHERE Id=? AND PatientId=? AND DoctorId=?', [scanId, patientId, doctorId]);
    if (!scan) return res.status(404).json({ message: 'Scan not found.' });
    if (!scan.ImagePath) return res.status(400).json({ message: 'No image available for this scan.' });

    // Choose model: override via body.model, else use scan.Model or default to resnet
    const model = (req.body && req.body.model) || scan.Model || 'resnet';

    // Read the image file
    const imgRel = scan.ImagePath.replace(/^\/+/, '');
    const imageFull = path.join(__dirname, '..', imgRel);
    console.log('Rerun: resolved image path', imageFull);
    if (!fs.existsSync(imageFull)) {
      console.error('Rerun: missing image file at resolved path:', imageFull);
      return res.status(400).json({ message: 'Image file not found on disk.', path: imageFull });
    }

    const buf = fs.readFileSync(imageFull);

    // Build FormData and forward to Python API
    const formData = new FormData();
    const blob = new Blob([buf], { type: 'image/jpeg' });
    formData.append('file', blob, path.basename(imageFull));

    // include patient name if provided (use patient record)
    const patientRow = await get('SELECT FirstName, LastName FROM Patients WHERE Id=? AND DoctorId=?', [patientId, doctorId]);
    if (patientRow) {
      formData.append('patient_name', `${patientRow.FirstName} ${patientRow.LastName}`);
    }

    const pythonApiUrl = `http://127.0.0.1:8000/predict/${model}`;
    let response;
    try {
      response = await fetch(pythonApiUrl, { method: 'POST', body: formData });
    } catch (e) {
      console.error('Python API network error (rerun):', e.message);
      return res.status(502).json({ message: 'Model service unreachable.' });
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error('Python API Error (rerun):', errText);
      return res.status(response.status).json({ message: 'Error from Model Service.' });
    }

    const data = await response.json();

    // Save PDF if included
    let pdfPath = scan.PdfPath;
    if (data?.pdf_base64) {
      try {
        const pdfFilename = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.pdf`;
        const pdfFullPath = path.resolve(__dirname, '..', 'uploads', pdfFilename);
        fs.writeFileSync(pdfFullPath, Buffer.from(data.pdf_base64, 'base64'));
        pdfPath = `/uploads/${pdfFilename}`;
      } catch (e) {
        console.warn('Could not save PDF from rerun:', e.message);
      }
    }

    // Update scan row with prediction/confidence/model/pdf
    await execute('UPDATE Scans SET Prediction=?, Confidence=?, Model=?, PdfPath=? WHERE Id=?', [data.prediction || null, data.confidence || null, model, pdfPath || null, scanId]);

    const updated = await get('SELECT Id, ImagePath, PdfPath, Prediction, Confidence, Model, CreatedAt FROM Scans WHERE Id = ?', [scanId]);
    console.log('Scan rerun completed:', scanId);
    res.json(updated);
  } catch (err) {
    console.error('Rerun scan error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});
// GET /api/patients (list patients for logged-in doctor)
router.get("/", auth, async (req, res) => {
  try {
    const doctorId = req.user.doctorId;

    const result = await query(`
        SELECT Id, FirstName, LastName, Age, Gender, Phone
        FROM Patients
        WHERE DoctorId = ?
        ORDER BY Id DESC
      `, [doctorId]);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});
// GET /api/patients/:id  (details)
router.get("/:id", auth, async (req, res) => {
  try {
    const doctorId = req.user.doctorId;
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id." });

    const patient = await get(`
        SELECT Id, FirstName, LastName, Age, Gender, Phone
        FROM Patients
        WHERE Id = ? AND DoctorId = ?
      `, [id, doctorId]);

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    res.json(patient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// PUT /api/patients/:id  (update)
router.put("/:id", auth, async (req, res) => {
  try {
    const doctorId = req.user.doctorId;
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id." });

    const { firstName, lastName, age, gender, phone } = req.body;
    if (!firstName || !lastName || age === undefined || age === null || !gender || !phone) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const ageInt = parseInt(age, 10);
    if (Number.isNaN(ageInt) || ageInt <= 0 || ageInt > 130) {
      return res.status(400).json({ message: "Invalid age." });
    }

    const result = await execute(`
        UPDATE Patients
        SET FirstName=?, LastName=?, Age=?, Gender=?, Phone=?
        WHERE Id=? AND DoctorId=?
      `, [firstName.trim(), lastName.trim(), ageInt, gender.trim(), phone.trim(), id, doctorId]);

    if (result.changes === 0) {
      return res.status(404).json({ message: "Patient not found." });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// DELETE /api/patients/:id  (delete)
router.delete("/:id", auth, async (req, res) => {
  try {
    const doctorId = req.user.doctorId;
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id." });

    const result = await execute(`
        DELETE FROM Patients
        WHERE Id=? AND DoctorId=?
      `, [id, doctorId]);

    if (result.changes === 0) {
      return res.status(404).json({ message: "Patient not found." });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;

