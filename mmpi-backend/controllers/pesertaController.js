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

// [UPDATED] Login function for Peserta (Patient)
const loginPeserta = async (req, res) => {
  const { pasien_id } = req.body;

  if (!pasien_id) {
    return res.status(400).json({ success: false, message: "Nomor ID wajib diisi" });
  }

  try {
    // JOIN with pasien_test_status to get the current test status
    const query = `
      SELECT 
        p.pasien_id AS "idPeserta", 
        p.nama, 
        p.jenis_kelamin AS "jenisKelamin",
        pts.status
      FROM public.pasien p
      LEFT JOIN public.pasien_test_status pts ON p.pasien_id = pts.pasien_id
      WHERE p.pasien_id = $1
    `;
    
    const result = await db.query(query, [pasien_id]);

    if (result.rows.length > 0) {
      const user = result.rows[0];

      // Check if the user has already finished the test
      if (user.status === 'Selesai') {
        return res.status(403).json({ 
          success: false, 
          message: "Akun ini telah menyelesaikan test. Harap hubungi staf kesehatan jika merasa terdapat kesalahan" 
        });
      }

      res.json({ 
        success: true, 
        message: "Login berhasil",
        user: {
          idPeserta: user.idPeserta,
          nama: user.nama,
          jenisKelamin: user.jenisKelamin
        } 
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

// [NEW] Helper function to format milliseconds into HH:MM string
const formatDurationHHMM = (startMs, finishMs) => {
  const diffMs = finishMs - startMs;
  if (diffMs <= 0) return "00:00"; // Should not happen normally

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // Pad with leading zeros (e.g., 1 hour 5 mins becomes "01:05")
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');

  return `${hh}:${mm}`;
};

// [UPDATED] Start the test timer (Manual check to avoid ON CONFLICT database errors)
const startTestStatus = async (req, res) => {
  const { pasien_id } = req.body;
  try {
    // 1. Check if a record already exists for this patient
    const checkQuery = `SELECT pasien_test_status_id FROM public.pasien_test_status WHERE pasien_id = $1`;
    const checkRes = await db.query(checkQuery, [pasien_id]);

    if (checkRes.rows.length > 0) {
      // 2a. Record exists! They probably hit "Back" or refreshed.
      // Update the status to 'Sedang berlangsung', but DO NOT touch the start_time.
      await db.query(`
        UPDATE public.pasien_test_status 
        SET status = 'Sedang berlangsung'
        WHERE pasien_id = $1
      `, [pasien_id]);
      
      console.log(`[BACKEND] Timer resumed for patient: ${pasien_id} (Start time preserved)`);
    } else {
      // 2b. No record exists. This is their first time starting the test.
      await db.query(`
        INSERT INTO public.pasien_test_status (pasien_id, status, start_time) 
        VALUES ($1, 'Sedang berlangsung', CURRENT_TIMESTAMP)
      `, [pasien_id]);
      
      console.log(`[BACKEND] Timer started for patient: ${pasien_id}`);
    }
    
    res.json({ success: true, message: "Waktu pengerjaan dimulai/dilanjutkan." });
  } catch (err) {
    console.error("[BACKEND] Error starting test status:", err.message);
    res.status(500).json({ error: "Gagal memulai waktu pengerjaan" });
  }
};

// [UPDATED] Finish timer, calculate HH:MM duration, update two tables
const finishTestStatus = async (req, res) => {
  const { pasien_id } = req.body;
  
  try {
    // 1. Start a transaction because we are updating two related tables
    await db.query('BEGIN');

    // 2. Update status table and fetch start/finish times immediately
    const updateStatusQuery = `
      UPDATE public.pasien_test_status 
      SET status = 'Selesai', finish_time = CURRENT_TIMESTAMP 
      WHERE pasien_id = $1
      RETURNING start_time, finish_time;
    `;
    const statusRes = await db.query(updateStatusQuery, [pasien_id]);

    if (statusRes.rows.length === 0 || !statusRes.rows[0].start_time) {
       throw new Error("Data waktu mulai tidak ditemukan. Tidak bisa menghitung durasi.");
    }

    // 3. Calculate Duration String (HH:MM) in Node.js
    const startTime = new Date(statusRes.rows[0].start_time);
    const finishTime = new Date(statusRes.rows[0].finish_time);
    const formattedDuration = formatDurationHHMM(startTime, finishTime);

    console.log(`[BACKEND] Calculated duration for ${pasien_id}: ${formattedDuration}`);

    // 4. Update the test_output table with the formatted duration string
    // Note: This assumes a record already exists in test_output for this patient.
    const updateOutputQuery = `
        UPDATE public.test_output
        SET durasi_pengerjaan = $2
        WHERE pasien_id = $1;
    `;
    await db.query(updateOutputQuery, [pasien_id, formattedDuration]);

    // 5. Commit the transaction if both updates succeeded
    await db.query('COMMIT');

    res.json({ 
      success: true, 
      message: "Tes selesai dan durasi telah disimpan.", 
      durasi_formatted: formattedDuration 
    });
  } catch (err) {
    // Rollback both updates if anything fails
    await db.query('ROLLBACK');
    console.error("[BACKEND] Error finishing test status:", err.message);
    res.status(500).json({ error: "Gagal menyimpan data akhir tes." });
  }
};

// [NEW] Get participants specifically for Proses Data (Only those in jawaban_fix)
const getPesertaForProses = async (req, res) => {
  try {
    const { kodeSeri, startDate, endDate } = req.query; 

    // INNER JOIN guarantees we ONLY fetch patients who exist in jawaban_fix
    // It also lets us grab the is_sent status in the exact same trip!
    let query = `
      SELECT 
        p.pasien_id AS "idPeserta",
        p.nama,
        p.jenis_kelamin AS "jenisKelamin",
        p.tanggal_pemeriksaan_date AS "tanggalPemeriksaanDate",
        j.is_sent
      FROM pasien p
      INNER JOIN jawaban_fix j ON p.pasien_id = j.pasien_id
      WHERE 1=1
    `;
    let queryParams = [];
    let paramIndex = 1;

    // Filter by Doctor's Kode Seri
    if (kodeSeri) {
      query += ` AND (p.pasien_id LIKE $${paramIndex} OR p.pasien_id NOT LIKE '%-%')`;
      queryParams.push(`${kodeSeri}-%`);
      paramIndex++;
    }

    // Filter by Date Range
    if (startDate && endDate) {
      query += ` AND p.tanggal_pemeriksaan_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      queryParams.push(startDate, endDate);
      paramIndex += 2;
    }

    query += ` ORDER BY p.tanggal_pemeriksaan_date DESC;`;

    const result = await db.query(query, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error("Error in getPesertaForProses:", err.message);
    res.status(500).send('Server Error');
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
  finishTestStatus,   // <--- Add this
  getPesertaForProses
};