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

// ==========================================
// START SERVER
// ==========================================
app.listen(port, () => {
  console.log(`Node server is running on http://localhost:${port}`);
});