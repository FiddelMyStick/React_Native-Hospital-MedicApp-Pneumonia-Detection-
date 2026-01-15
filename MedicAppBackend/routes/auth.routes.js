const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { get, execute, query } = require("../db");

// POST /api/auth/register
router.post("/register", async (req, res) => {
  console.log("REGISTER HIT");

  console.log("REGISTER BODY:", req.body);

  try {
    const { firstName, lastName, phone, email, password } = req.body;


    if (!firstName || !lastName || !phone || !email || !password) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // check existing email
    const exists = await get("SELECT Id FROM Doctors WHERE Email = ?", [email.toLowerCase()]);

    if (exists) {
      return res.status(409).json({ message: "Email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await execute(`
        INSERT INTO Doctors (FirstName, LastName, Phone, Email, PasswordHash)
        VALUES (?, ?, ?, ?, ?)
      `, [firstName.trim(), lastName.trim(), phone.trim(), email.trim().toLowerCase(), passwordHash]);

    const newDoctorId = result.lastID;

    // optional: return token immediately
    const token = jwt.sign(
      { doctorId: newDoctorId, email: email.trim().toLowerCase() },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      id: newDoctorId,
      email: email.trim().toLowerCase(),
      token,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const doctor = await get("SELECT * FROM Doctors WHERE Email = ?", [email.trim().toLowerCase()]);

    if (!doctor) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const ok = await bcrypt.compare(password, doctor.PasswordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
      { doctorId: doctor.Id, email: doctor.Email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      id: doctor.Id,
      email: doctor.Email,
      token,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
