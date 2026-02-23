// controllers/pesertaController.js
const db = require('../config/db');

// 1. Get all participants (UPDATED WITH DATE FILTERING)
const getAllPeserta = async (req, res) => {
  try {
    // Extract query parameters
    const { kodeSeri, startDate, endDate } = req.query; 

    let query = `
      SELECT 
        pasien_id AS "idPeserta",
        nama,
        jenis_kelamin AS "jenisKelamin",
        tanggal_pemeriksaan_date AS "tanggalPemeriksaanDate"
      FROM pasien
      WHERE 1=1
    `;
    let queryParams = [];
    let paramIndex = 1;

    // Filter by Doctor's Kode Seri
    if (kodeSeri) {
      query += ` AND (pasien_id LIKE $${paramIndex} OR pasien_id NOT LIKE '%-%')`;
      queryParams.push(`${kodeSeri}-%`);
      paramIndex++;
    }

    // Filter by Date Range
    if (startDate && endDate) {
      query += ` AND tanggal_pemeriksaan_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      queryParams.push(startDate, endDate);
      paramIndex += 2;
    }

    query += ` ORDER BY tanggal_pemeriksaan_date DESC;`;

    const result = await db.query(query, queryParams);
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

// [NEW] Login function for Peserta (Patient)
const loginPeserta = async (req, res) => {
  const { pasien_id } = req.body;

  if (!pasien_id) {
    return res.status(400).json({ success: false, message: "Nomor ID wajib diisi" });
  }

  try {
    const query = `
      SELECT 
        pasien_id AS "idPeserta", 
        nama, 
        jenis_kelamin AS "jenisKelamin"
      FROM public.pasien 
      WHERE pasien_id = $1
    `;
    
    const result = await db.query(query, [pasien_id]);

    if (result.rows.length > 0) {
      res.json({ 
        success: true, 
        message: "Login berhasil",
        user: result.rows[0] 
      });
    } else {
      res.status(401).json({ success: false, message: "Nomor ID tidak ditemukan. Silakan hubungi dokter/admin." });
    }
  } catch (err) {
    console.error("Login Peserta error:", err.message);
    res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
  }
};

// 4. Get a single participant by ID (NEW)
const getPesertaById = async (req, res) => {
  try {
    const { id } = req.params; // We will pass the ID in the URL

    const query = `
      SELECT 
        pasien_id AS "nomorId",
        nama,
        nik,
        jenis_kelamin AS "jenisKelamin",
        tanggal_lahir AS "tanggalLahir",
        alamat,
        status_perkawinan AS "statusPerkawinan",
        pendidikan,
        pekerjaan,
        suku_bangsa AS "sukuBangsa",
        nomor_hp AS "nomorHp",
        tujuan_pemeriksaan AS "tujuanPemeriksaan",
        tanggal_pemeriksaan_date AS "tanggalPemeriksaanDate",
        tanggal_pemeriksaan_time AS "tanggalPemeriksaanTime"
      FROM pasien 
      WHERE pasien_id = $1
    `;
    
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Data peserta tidak ditemukan" });
    }

    // Send the single object directly, not an array
    res.json(result.rows[0]); 
  } catch (err) {
    console.error("Error fetching peserta by ID:", err.message);
    res.status(500).send('Server Error');
  }
};

// [NEW] Start the test timer
const startTestStatus = async (req, res) => {
  const { pasien_id } = req.body;
  try {
    // Check if a record already exists for this patient
    const checkQuery = `SELECT pasien_test_status_id FROM public.pasien_test_status WHERE pasien_id = $1`;
    const checkRes = await db.query(checkQuery, [pasien_id]);

    if (checkRes.rows.length > 0) {
      // Update existing record
      await db.query(`
        UPDATE public.pasien_test_status 
        SET status = 'Sedang berlangsung', start_time = CURRENT_TIMESTAMP, finish_time = NULL 
        WHERE pasien_id = $1
      `, [pasien_id]);
    } else {
      // Insert new record
      await db.query(`
        INSERT INTO public.pasien_test_status (pasien_id, status, start_time) 
        VALUES ($1, 'Sedang berlangsung', CURRENT_TIMESTAMP)
      `, [pasien_id]);
    }
    
    res.json({ success: true, message: "Waktu pengerjaan dimulai" });
  } catch (err) {
    console.error("Error starting test status:", err.message);
    res.status(500).json({ error: "Gagal memulai waktu pengerjaan" });
  }
};

// [NEW] Finish the test timer
const finishTestStatus = async (req, res) => {
  const { pasien_id } = req.body;
  try {
    const query = `
      UPDATE public.pasien_test_status 
      SET status = 'Selesai', finish_time = CURRENT_TIMESTAMP 
      WHERE pasien_id = $1
      RETURNING start_time, finish_time;
    `;
    const result = await db.query(query, [pasien_id]);
    
    // Bonus: We can calculate the duration in the backend just in case you need it later
    let durasiMins = 0;
    if (result.rows.length > 0 && result.rows[0].start_time && result.rows[0].finish_time) {
       const start = new Date(result.rows[0].start_time);
       const finish = new Date(result.rows[0].finish_time);
       durasiMins = Math.floor((finish - start) / 60000); // Difference in minutes
    }

    res.json({ 
      success: true, 
      message: "Tes selesai disubmit", 
      durasi_pengerjaan: `${durasiMins} Menit` 
    });
  } catch (err) {
    console.error("Error finishing test status:", err.message);
    res.status(500).json({ error: "Gagal menyimpan waktu selesai" });
  }
};

// Don't forget to export them!
module.exports = { 
  getAllPeserta, 
  getPesertaReport, 
  upsertPeserta, 
  deletePeserta,
  loginPeserta,
  getPesertaById,
  startTestStatus,   // <--- Add this
  finishTestStatus   // <--- Add this
};