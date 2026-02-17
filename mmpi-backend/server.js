// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;

// Enable CORS so Vite (5173) can communicate with Node (3000)
app.use(cors());
app.use(express.json());

// Set up PostgreSQL Connection
const db = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Test Database Connection
db.connect()
  .then(() => console.log('Connected to PostgreSQL successfully!'))
  .catch(err => console.error('Connection error', err.stack));


// ==========================================
// API ROUTES
// ==========================================

// 1. Endpoint to get all questions (For PengisianDataTest.tsx)
app.get('/api/soal', async (req, res) => {
  try {
    const result = await db.query('SELECT soal FROM soal ORDER BY soal_id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// 2. Endpoint to get all participants (For DaftarPeserta.tsx)
app.get('/api/peserta', async (req, res) => {
  try {
    // We use AS to rename the database columns to match your React TypeScript interface!
    const result = await db.query(`
      SELECT 
        pasien_id AS "idPeserta",
        nama,
        jenis_kelamin AS "jenisKelamin",
        tanggal_pemeriksaan_date AS "tanggalPemeriksaanDate"
      FROM pasien
      ORDER BY tanggal_pemeriksaan_date DESC;
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// 3. Endpoint to get FULL deep data for printing reports
app.post('/api/peserta/report', async (req, res) => {
  try {
    const { ids } = req.body; // Expects an array of IDs like ['xyz-123', 'abc-xxx']
    
    if (!ids || ids.length === 0) {
      return res.json([]);
    }

    // Join the 'pasien' table with 'test_output' to get personal info + test scores
    // ANY($1) allows PostgreSQL to match multiple IDs at once
    const query = `
      SELECT 
        p.pasien_id AS "idPeserta",
        p.nama,
        p.jenis_kelamin AS "jenisKelamin",
        p.tanggal_pemeriksaan_date AS "tanggalPemeriksaanDate",
        p.tanggal_lahir AS "tanggalLahir",
        p.pendidikan,
        p.pekerjaan,
        p.status_perkawinan AS "statusPerkawinan",
        p.tujuan_pemeriksaan AS "tujuanPemeriksaan",
        p.suku_bangsa AS "sukuBangsa",
        p.nomor_hp AS "nomorHp",
        p.alamat,
        p.nik,
        t.hasil_output_ms AS "hasil_output",
        t.durasi_pengerjaan AS "durasiPengerjaan"
      FROM pasien p
      LEFT JOIN test_output t ON p.pasien_id = t.pasien_id
      WHERE p.pasien_id = ANY($1)
    `;
    
    const result = await db.query(query, [ids]);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ==========================================
// NEW: PROGRESS SAVING ENDPOINTS
// ==========================================

// A. Get existing answers for a patient when they load the page
app.get('/api/jawaban-temp/:pasien_id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT soal_id, jawaban FROM jawaban_temp WHERE pasien_id = $1', 
      [req.params.pasien_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// B. Save a single answer when they navigate (Upsert logic)
app.post('/api/jawaban-temp', async (req, res) => {
  const { pasien_id, soal_id, jawaban } = req.body;
  try {
    // ON CONFLICT automatically handles the "if exists update, else insert" logic in one step!
    await db.query(`
      INSERT INTO jawaban_temp (pasien_id, soal_id, jawaban) 
      VALUES ($1, $2, $3)
      ON CONFLICT (pasien_id, soal_id) 
      DO UPDATE SET jawaban = EXCLUDED.jawaban
    `, [pasien_id, soal_id, jawaban]);
    
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// C. Bulk save for the 'P' Debug Hotkey
app.post('/api/jawaban-temp/bulk', async (req, res) => {
  const { pasien_id, answers } = req.body; // answers is a full boolean array
  try {
    // Clear old temp answers for a clean slate
    await db.query('DELETE FROM jawaban_temp WHERE pasien_id = $1', [pasien_id]);
    
    // Insert all 566 instantly
    for (let i = 0; i < answers.length; i++) {
      const jawaban = answers[i] ? 'T' : 'F';
      await db.query(
        'INSERT INTO jawaban_temp (pasien_id, soal_id, jawaban) VALUES ($1, $2, $3)', 
        [pasien_id, i + 1, jawaban] // i + 1 because soal_id starts at 1
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// UPDATED: FINAL SUBMISSION ENDPOINT
// ==========================================

// 4. Endpoint to submit test answers and trigger Python
app.post('/api/submit-test', async (req, res) => {
  const { pasien_id, gender } = req.body; 

  if (!pasien_id || !gender) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const tempAnswers = await db.query(
      'SELECT soal_id, jawaban FROM jawaban_temp WHERE pasien_id = $1 ORDER BY soal_id ASC',
      [pasien_id]
    );

    if (tempAnswers.rows.length < 566) {
       return res.status(400).json({ error: "Incomplete test. Database does not have 566 answers." });
    }

    const jawabanFixString = tempAnswers.rows.map(row => row.jawaban).join('');
    const booleanAnswers = tempAnswers.rows.map(row => row.jawaban === 'T'); 
    
    // --- UPGRADE: Delete old attempts before saving new ones ---
    await db.query('DELETE FROM jawaban_fix WHERE pasien_id = $1', [pasien_id]);
    
    await db.query(
      `INSERT INTO jawaban_fix (pasien_id, jawaban_fix, is_sent) VALUES ($1, $2, $3)`,
      [pasien_id, jawabanFixString, true]
    );

    console.log(`[BOT] Waking up Python DOSBox bot for patient: ${pasien_id}...`);
    
    const pythonResponse = await fetch('http://127.0.0.1:8000/process-mmpi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gender, answers: booleanAnswers })
    });

    if (!pythonResponse.ok) {
      throw new Error(`Python Microservice Error: ${pythonResponse.statusText}`);
    }

    const pythonData = await pythonResponse.json();
    
    if (pythonData.status === "success") {
      const scoresJson = JSON.stringify(pythonData.scores);
      const durasi = "01.30 (one hour and thirty minutes)"; 
      
      // --- UPGRADE: Delete old output before saving new ones ---
      await db.query('DELETE FROM test_output WHERE pasien_id = $1', [pasien_id]);

      await db.query(
        `INSERT INTO test_output (pasien_id, hasil_output_ms, durasi_pengerjaan) VALUES ($1, $2, $3)`,
        [pasien_id, scoresJson, durasi]
      );

      console.log(`[SUCCESS] Scores saved for patient: ${pasien_id}`);
      res.json({ success: true, scores: pythonData.scores });
    } else {
       res.status(500).json({ error: "Python processing failed" });
    }

  } catch (err) {
    console.error("Submission error:", err.message);
    res.status(500).json({ error: 'Server Error', details: err.message });
  }
});

// ==========================================
// START SERVER
// ==========================================
app.listen(port, () => {
  console.log(`Node server is running on http://localhost:${port}`);
});