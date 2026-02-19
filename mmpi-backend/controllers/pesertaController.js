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
        p.tanggal_pemeriksaan_time AS "tanggalPemeriksaanTime",
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

// 3. Create or update patient biodata (NEW)
const upsertPeserta = async (req, res) => {
  const { 
    nomorId, nama, nik, jenisKelamin, tanggalLahir, 
    tempatLahir, // Assuming you might have this, but not in your interface yet
    alamat, statusPerkawinan, pendidikan, pekerjaan, 
    sukuBangsa, agama, nomorHp, tujuanPemeriksaan, 
    tanggalPemeriksaanDate, tanggalPemeriksaanTime 
  } = req.body;

  try {
    // Upsert logic: If ID exists, update it. If not, insert it.
    const query = `
      INSERT INTO pasien (
        pasien_id, nama, nik, jenis_kelamin, tanggal_lahir, 
        alamat, status_perkawinan, pendidikan, pekerjaan, 
        suku_bangsa, nomor_hp, tujuan_pemeriksaan, 
        tanggal_pemeriksaan_date, tanggal_pemeriksaan_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (pasien_id) DO UPDATE SET
        nama = EXCLUDED.nama,
        nik = EXCLUDED.nik,
        jenis_kelamin = EXCLUDED.jenis_kelamin,
        tanggal_lahir = EXCLUDED.tanggal_lahir,
        alamat = EXCLUDED.alamat,
        status_perkawinan = EXCLUDED.status_perkawinan,
        pendidikan = EXCLUDED.pendidikan,
        pekerjaan = EXCLUDED.pekerjaan,
        suku_bangsa = EXCLUDED.suku_bangsa,
        nomor_hp = EXCLUDED.nomor_hp,
        tujuan_pemeriksaan = EXCLUDED.tujuan_pemeriksaan,
        tanggal_pemeriksaan_date = EXCLUDED.tanggal_pemeriksaan_date,
        tanggal_pemeriksaan_time = EXCLUDED.tanggal_pemeriksaan_time;
    `;

    const values = [
      nomorId, nama, nik, jenisKelamin, tanggalLahir, 
      alamat, statusPerkawinan, pendidikan, pekerjaan, 
      sukuBangsa, nomorHp, tujuanPemeriksaan, 
      tanggalPemeriksaanDate, tanggalPemeriksaanTime
    ];

    await db.query(query, values);
    res.json({ success: true, message: "Data pasien berhasil disimpan." });

  } catch (err) {
    console.error("Gagal menyimpan biodata:", err.message);
    res.status(500).json({ error: "Gagal menyimpan biodata ke database." });
  }
};

const deletePeserta = async (req, res) => {
  const { ids } = req.body; // Expects an array of IDs like ['TEST-001', 'xyz-123']

  if (!ids || ids.length === 0) {
    return res.status(400).json({ error: "Tidak ada ID yang diberikan" });
  }

  try {
    // Start a SQL Transaction
    await db.query('BEGIN');

    // 1. Delete all associated test data (Child tables)
    await db.query('DELETE FROM jawaban_temp WHERE pasien_id = ANY($1)', [ids]);
    await db.query('DELETE FROM jawaban_fix WHERE pasien_id = ANY($1)', [ids]);
    await db.query('DELETE FROM test_output WHERE pasien_id = ANY($1)', [ids]);

    // 2. Delete the patient biodata (Parent table)
    await db.query('DELETE FROM pasien WHERE pasien_id = ANY($1)', [ids]);

    // Commit the transaction if everything succeeded
    await db.query('COMMIT');
      
    res.json({ success: true, message: "Data peserta berhasil dihapus secara permanen." });
  } catch (err) {
    // Cancel the deletion if anything goes wrong
    await db.query('ROLLBACK');
    console.error("Delete error:", err.message);
    res.status(500).json({ error: "Server Error: Gagal menghapus data" });
  }
};

// Don't forget to export the new function!
module.exports = { getAllPeserta, getPesertaReport, upsertPeserta, deletePeserta };