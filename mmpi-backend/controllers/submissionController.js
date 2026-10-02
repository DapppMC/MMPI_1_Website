// controllers/submissionController.js
const db = require('../config/db');

// --- 1. JUST SUBMIT THE TEST (Called when patient finishes) ---
const submitTest = async (req, res) => {
  const { pasien_id, durasi } = req.body; 

  if (!pasien_id) {
    return res.status(400).json({ error: "Missing required fields: pasien_id" });
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
    
    // Cleanup old data
    await db.query('DELETE FROM jawaban_fix WHERE pasien_id = $1', [pasien_id]);
    await db.query('DELETE FROM test_output WHERE pasien_id = $1', [pasien_id]);
    
    // Save Fixed Answers (Mark is_sent as false since it hasn't been processed yet)
    await db.query(
      `INSERT INTO jawaban_fix (pasien_id, jawaban_fix, is_sent) VALUES ($1, $2, $3)`,
      [pasien_id, jawabanFixString, false]
    );

    // Save the duration initially (hasil_output_ms will be null for now)
    const finalDurasi = durasi || "-"; 
    await db.query(
      `INSERT INTO test_output (pasien_id, durasi_pengerjaan) VALUES ($1, $2)`,
      [pasien_id, finalDurasi] 
    );

    console.log(`[SUCCESS] Test submitted successfully for: ${pasien_id}`);
    res.json({ success: true, message: "Data tes berhasil disimpan permanen." });

  } catch (err) {
    console.error("Submission error:", err.message);
    res.status(500).json({ error: 'Server Error', details: err.message });
  }
};

// --- 2. TRIGGER THE MICROSERVICE (Called by Admin/System later) ---
const processTest = async (req, res) => {
  // We need gender here because the Python script requires it for scoring
  const { pasien_id, gender } = req.body;

  if (!pasien_id || !gender) {
    return res.status(400).json({ error: "Missing required fields: pasien_id, gender" });
  }

  try {
    // 1. Fetch the locked answers from the database
    const fixResult = await db.query(
      'SELECT jawaban_fix FROM jawaban_fix WHERE pasien_id = $1',
      [pasien_id]
    );

    if (fixResult.rows.length === 0) {
      return res.status(404).json({ error: "No submitted answers found for this patient." });
    }

    const jawabanFixString = fixResult.rows[0].jawaban_fix;
    
    // Convert 'T'/'F' string back into a boolean array for the Python bot
    const booleanAnswers = jawabanFixString.split('').map(char => char === 'T');

    console.log(`[BOT] Waking up Python DOSBox bot for patient: ${pasien_id}...`);
    
    // 2. Call Python Microservice
    const pythonResponse = await fetch(`${process.env.PYTHON_API_URL || 'http://127.0.0.1:8000'}/process-mmpi`, {
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
      
      // 3. UPDATE the existing test_output row with the new scores
      await db.query(
        `UPDATE test_output SET hasil_output_ms = $1 WHERE pasien_id = $2`,
        [scoresJson, pasien_id] 
      );

      // 4. Mark the answers as sent/processed
      await db.query(
        `UPDATE jawaban_fix SET is_sent = true WHERE pasien_id = $1`,
        [pasien_id]
      );

      console.log(`[SUCCESS] Scores saved for patient: ${pasien_id}`);
      res.json({ success: true, scores: pythonData.scores });
    } else {
       res.status(500).json({ error: "Python processing failed" });
    }

  } catch (err) {
    console.error("Microservice processing error:", err.message);
    res.status(500).json({ error: 'Server Error', details: err.message });
  }
};

// [UPDATED] Add bulk patients to the processing queue
const addToQueue = async (req, res) => {
  const { items } = req.body; // Expects an array: [{pasien_id, gender}, ...]

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Data antrean tidak valid" });
  }

  try {
    await db.query('BEGIN');

    for (const item of items) {
      // [FIX] Added CAST($1 AS VARCHAR) so PostgreSQL knows exactly what type the variable is
      await db.query(`
        INSERT INTO antrian_proses (pasien_id, gender, status)
        SELECT CAST($1 AS VARCHAR), CAST($2 AS VARCHAR), 'pending'
        WHERE NOT EXISTS (
            SELECT 1 FROM antrian_proses WHERE pasien_id = CAST($1 AS VARCHAR)
        )
      `, [item.pasien_id, item.gender]);
    }

    await db.query('COMMIT');
    res.json({ success: true, message: "Berhasil ditambahkan ke antrean" });

  } catch (err) {
    await db.query('ROLLBACK');
    console.error("Queue Insert Error:", err.message);
    res.status(500).json({ error: "Gagal memasukkan ke antrean" });
  }
};

module.exports = { submitTest, processTest, addToQueue };