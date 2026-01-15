const router = require("express").Router();
const { get, execute } = require("../db");
const auth = require("../middleware/auth");

// GET /api/doctors/me
router.get("/me", auth, async (req, res) => {
  try {
    const doctorId = req.user.doctorId;

    const doctor = await get(`
        SELECT d.Id, d.FirstName, d.LastName, d.Email, d.Phone,
               d.SpecialtyId, s.Name AS SpecialtyName
        FROM Doctors d
        LEFT JOIN Specialties s ON s.Id = d.SpecialtyId
        WHERE d.Id = ?
      `, [doctorId]);

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    res.json(doctor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// PUT /api/doctors/me
router.put("/me", auth, async (req, res) => {
  try {
    const { firstName, lastName, phone, specialtyId } = req.body;
    const doctorId = req.user.doctorId;

    if (!firstName || !lastName || !phone) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    await execute(`
        UPDATE Doctors
        SET FirstName=?,
            LastName=?,
            Phone=?,
            SpecialtyId=?
        WHERE Id=?
      `, [firstName.trim(), lastName.trim(), phone.trim(), specialtyId ?? null, doctorId]);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
