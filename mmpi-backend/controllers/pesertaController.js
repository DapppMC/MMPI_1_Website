// controllers/pesertaController.js
const db = require('../config/db');

// 1. Get all participants
const getAllPeserta = async (req, res) => {
  try {
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
};

// 2. Get deep data for reports
const getPesertaReport = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || ids.length === 0) {
      return res.json([]);
    }

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
};

module.exports = { getAllPeserta, getPesertaReport };