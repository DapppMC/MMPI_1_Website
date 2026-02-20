const db = require('../config/db');

// Login function for Dokter
const loginDokter = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Query the dokter table to find a match
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

    // If a user is found
    if (result.rows.length > 0) {
      res.json({ 
        success: true, 
        message: "Login berhasil",
        user: result.rows[0] 
      });
    } else {
      res.status(401).json({ 
        success: false, 
        message: "Username atau password salah!" 
      });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Exporting in the same format as pesertaController
module.exports = { loginDokter };