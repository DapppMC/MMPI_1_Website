const db = require('../config/db');
const bcrypt = require('bcrypt'); // [NEW] Import bcrypt

// 1. Login function for Dokter
const loginDokter = async (req, res) => {
  const { username, password } = req.body;

  try {
    // [UPDATED] We only search by username now, NOT password
    const query = `
      SELECT 
        dokter_id AS "dokterId", 
        nama, 
        username,
        password, 
        pasien_code_id AS "pasienCodeId", 
        kode_seri AS "kodeSeri"
      FROM public.dokter 
      WHERE username = $1
    `;
    
    const result = await db.query(query, [username]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      // [NEW] Securely compare the typed password with the hashed database password
      const isMatch = await bcrypt.compare(password, user.password);

      if (isMatch) {
        // Remove password from the user object before sending to React
        delete user.password; 

        res.json({ 
          success: true, 
          message: "Login berhasil",
          user: user 
        });
      } else {
        res.status(401).json({ success: false, message: "Username atau password salah!" });
      }
    } else {
      res.status(401).json({ success: false, message: "Username atau password salah!" });
    }
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).send('Server Error');
  }
};

// 2. Verify function (Check password for sensitive actions)
const verifyDokter = async (req, res) => {
  const { username, password } = req.body;

  try {
    // [UPDATED] Only search by username
    const query = `SELECT password FROM public.dokter WHERE username = $1`;
    const result = await db.query(query, [username]);

    if (result.rows.length > 0) {
      // [NEW] Securely compare hashes
      const isMatch = await bcrypt.compare(password, result.rows[0].password);
      
      if (isMatch) {
        res.json({ success: true, message: "Verifikasi berhasil" });
      } else {
        res.status(401).json({ success: false, message: "Password salah!" });
      }
    } else {
      res.status(401).json({ success: false, message: "Password salah!" });
    }
  } catch (err) {
    console.error("Verify error:", err.message);
    res.status(500).send('Server Error');
  }
};

// 3. Update function for Profile
const updateDokter = async (req, res) => {
  // [UPDATED] Added acak_soal to the destructured body
  const { dokterId, nama, username, password, acak_soal } = req.body;

  if (!dokterId || !nama || !username || !password) {
    return res.status(400).json({ success: false, message: "Semua data wajib diisi!" });
  }

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // [UPDATED] Added acak_soal to the UPDATE statement and RETURNING clause
    const query = `
      UPDATE public.dokter 
      SET nama = $1, username = $2, password = $3, acak_soal = $4
      WHERE dokter_id = $5
      RETURNING 
        dokter_id AS "dokterId", 
        nama, 
        username, 
        pasien_code_id AS "pasienCodeId", 
        kode_seri AS "kodeSeri",
        acak_soal AS "acakSoal"
    `;
    
    // [UPDATED] Added acak_soal to the parameter array
    const result = await db.query(query, [nama, username, hashedPassword, acak_soal, dokterId]);

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
    if (err.code === '23505') {
       return res.status(400).json({ success: false, message: "Username sudah digunakan oleh dokter lain!" });
    }
    res.status(500).send('Server Error');
  }
};

// [UPDATED] Get acak_soal status by kode_seri (Bulletproof version)
const checkAcakSoal = async (req, res) => {
  const { kode_seri } = req.params;

  if (!kode_seri) {
    return res.status(400).json({ error: "kode_seri is required" });
  }

  try {
    // 1. Use ILIKE for case-insensitivity
    // 2. Use ORDER BY DESC LIMIT 1 to bypass duplicate dummy accounts
    const query = `
      SELECT acak_soal 
      FROM public.dokter 
      WHERE kode_seri ILIKE $1 
      ORDER BY dokter_id DESC 
      LIMIT 1
    `;
    
    const result = await db.query(query, [kode_seri]);

    if (result.rows.length > 0) {
      // Force it to a strict boolean just in case the DB returns a string or null
      const rawValue = result.rows[0].acak_soal;
      const isAcak = rawValue === true || rawValue === 'true' || rawValue === 't' || rawValue === 1;
      
      console.log(`[SYSTEM] Cek Acak Soal untuk '${kode_seri}': ${isAcak}`);
      res.json({ success: true, acak_soal: isAcak });
    } else {
      res.status(404).json({ error: "Dokter tidak ditemukan" });
    }
  } catch (err) {
    console.error("Check Acak Soal Error:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

module.exports = { loginDokter, verifyDokter, updateDokter, checkAcakSoal };