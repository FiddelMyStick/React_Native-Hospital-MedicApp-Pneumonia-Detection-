const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.resolve(__dirname, 'medicapp.db');

// Create or open the database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database ' + dbPath, err);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Helper function to run queries (generic wrapper)
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Helper to run execute (for insert/update/delete)
function execute(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// Helper to get single row
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

module.exports = { db, query, execute, get };
