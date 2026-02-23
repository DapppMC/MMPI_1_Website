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
  const { dokterId, nama, username, password } = req.body;

  if (!dokterId || !nama || !username || !password) {
    return res.status(400).json({ success: false, message: "Semua data wajib diisi!" });
  }

  try {
    // [NEW] Hash the new password before saving it to the database
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

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
    
    // [UPDATED] Pass the hashedPassword instead of the plain password
    const result = await db.query(query, [nama, username, hashedPassword, dokterId]);

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

module.exports = { loginDokter, verifyDokter, updateDokter };