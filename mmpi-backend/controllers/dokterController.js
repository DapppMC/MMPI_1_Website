const db = require('../config/db');

// 1. Login function for Dokter
const loginDokter = async (req, res) => {
  const { username, password } = req.body;

  try {
    const query = `
      SELECT 
        dokter_id AS "dokterId", 
        nama, 
        username, 
        pasien_code_id AS "pasienCodeId", 
        kode_seri AS "kodeSeri"
      FROM public.dokter 
      WHERE username = $1 AND password = $2
    `;
    
    const result = await db.query(query, [username, password]);

    if (result.rows.length > 0) {
      res.json({ 
        success: true, 
        message: "Login berhasil",
        user: result.rows[0] 
      });
    } else {
      res.status(401).json({ success: false, message: "Username atau password salah!" });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// 2. Verify function (Check password for sensitive actions)
const verifyDokter = async (req, res) => {
  const { username, password } = req.body;

  try {
    const query = `SELECT dokter_id FROM public.dokter WHERE username = $1 AND password = $2`;
    const result = await db.query(query, [username, password]);

    if (result.rows.length > 0) {
      res.json({ success: true, message: "Verifikasi berhasil" });
    } else {
      res.status(401).json({ success: false, message: "Password salah!" });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// 3. [NEW] Update function for Profile
const updateDokter = async (req, res) => {
  const { dokterId, nama, username, password } = req.body;

  // Basic validation to ensure no empty fields are sent
  if (!dokterId || !nama || !username || !password) {
    return res.status(400).json({ success: false, message: "Semua data wajib diisi!" });
  }

  try {
    // Update the record and instantly return the new safe data (excluding password)
    const query = `
      UPDATE public.dokter 
      SET nama = $1, username = $2, password = $3
      WHERE dokter_id = $4
      RETURNING 
        dokter_id AS "dokterId", 
        nama, 
        username, 
        pasien_code_id AS "pasienCodeId", 
        kode_seri AS "kodeSeri"
    `;
    
    const result = await db.query(query, [nama, username, password, dokterId]);

    if (result.rows.length > 0) {
      res.json({ 
        success: true, 
        message: "Profil berhasil diperbarui",
        user: result.rows[0] 
      });
    } else {
      res.status(404).json({ success: false, message: "Akun tidak ditemukan" });
    }
  } catch (err) {
    console.error("Update Error:", err.message);
    // Handle unique constraint violation if username is already taken
    if (err.code === '23505') {
       return res.status(400).json({ success: false, message: "Username sudah digunakan oleh dokter lain!" });
    }
    res.status(500).send('Server Error');
  }
};

// Exporting in the same format
module.exports = { loginDokter, verifyDokter, updateDokter };