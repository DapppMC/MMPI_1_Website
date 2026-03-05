// controllers/superAdminController.js
const db = require('../config/db');
const bcrypt = require('bcrypt'); // Or 'bcrypt'. This is for hashing the new doctor's password.

// --- SUPER ADMIN LOGIN LOGIC (Hardcoded for single account) ---
// Define your hardcoded Super Admin credentials here
const SUPER_ADMIN_USERNAME = 's4y4Bvk4nSvp3r4dm1n'; // User needs to REPLACE this
const SUPER_ADMIN_PASSWORD = 'GnyI5ddLsByiZ2GUKE'; // Generate this hash once and REPLACE it.

const superAdminLogin = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username dan password wajib diisi." });
    }

    // Direct plain-text comparison for the hardcoded SA account
    if (username === SUPER_ADMIN_USERNAME && password === SUPER_ADMIN_PASSWORD) {
        // Generate a simple hardcoded token
        const hardcodedToken = 'super-admin-secure-token-123';
        return res.json({ success: true, token: hardcodedToken, message: "Login Super Admin berhasil." });
    } else {
        return res.status(401).json({ error: "Username atau password salah." });
    }
};

// --- CREATE DOKTER ACCOUNT LOGIC ---
const createDokterAccount = async (req, res) => {
    const { nama, username, password, kode_seri } = req.body;

    // 1. Validate mandatory fields
    if (!nama || !username || !password || !kode_seri) {
        return res.status(400).json({ error: "Semua data wajib diisi (Nama, Username, Password, Kode Seri)." });
    }

    if (kode_seri.length !== 3) {
        return res.status(400).json({ error: "Kode Seri harus terdiri dari 3 karakter.", field: "kodeSeri" });
    }

    const uppercaseKodeSeri = kode_seri.toUpperCase();

    try {
        await db.query('BEGIN'); 

        // 2. [NEW] Check if Kode Seri is already used
        const checkKodeQuery = 'SELECT 1 FROM public.dokter WHERE kode_seri = $1';
        const checkKodeRes = await db.query(checkKodeQuery, [uppercaseKodeSeri]);
        
        if (checkKodeRes.rows.length > 0) {
            await db.query('ROLLBACK');
            // Send back a 'field' property so the frontend knows what to highlight in red
            return res.status(400).json({ error: "Kode Seri ini sudah digunakan oleh dokter lain.", field: "kodeSeri" });
        }

        // 3. [FIXED] Increment Logic - explicitly force Integer parsing to prevent string concatenation ("1" + 1 = "11")
        const maxIdQuery = 'SELECT MAX(pasien_code_id) AS max_id FROM public.dokter';
        const maxIdRes = await db.query(maxIdQuery);
        
        const rawMaxId = maxIdRes.rows[0].max_id;
        // Parse it explicitly, fallback to 0 if the table is completely empty
        const currentMaxId = rawMaxId ? parseInt(rawMaxId, 10) : 0; 
        const nextId = currentMaxId + 1;

        // 4. Securely Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 5. Insert Data
        const insertQuery = `
            INSERT INTO public.dokter (pasien_code_id, nama, username, password, kode_seri)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING pasien_code_id
        `;
        const insertParams = [nextId, nama, username, hashedPassword, uppercaseKodeSeri];
        const insertRes = await db.query(insertQuery, insertParams);
        const createdId = insertRes.rows[0].pasien_code_id;

        await db.query('COMMIT');
        console.log(`[SUCCESS] Dokter account created: ${username} (ID: ${createdId})`);
        res.status(201).json({ success: true, message: "Akun Dokter berhasil dibuat.", dokterId: createdId });

    } catch (err) {
        await db.query('ROLLBACK');
        console.error("Dokter Creation Error:", err.message);
        res.status(500).json({ error: "Gagal membuat akun dokter karena kesalahan sistem." });
    }
};

// --- AUTH MIDDLEWARE for Super Admin endpoints ---
const authenticateSuperAdmin = (req, res, next) => {
    const token = req.headers['authorization']; // Look for token in headers

    // Compare with the hardcoded token generated during login
    if (token === 'super-admin-secure-token-123') {
        next(); // Token matches, proceed
    } else {
        res.status(403).json({ error: "Akses ditolak. Token tidak valid atau kadaluarsa." });
    }
};

module.exports = { superAdminLogin, createDokterAccount, authenticateSuperAdmin };