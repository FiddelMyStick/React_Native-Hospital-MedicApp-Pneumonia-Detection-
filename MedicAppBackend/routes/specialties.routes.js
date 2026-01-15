const router = require("express").Router();
const { query } = require("../db");

router.get("/", async (req, res) => {
  try {
    const result = await query(`
      SELECT Id, Name
      FROM Specialties
      ORDER BY Name
    `);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
