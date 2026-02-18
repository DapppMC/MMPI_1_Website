// controllers/soalController.js
const db = require('../config/db');

// 1. Get All Questions
const getSoal = async (req, res) => {
  try {
    const result = await db.query('SELECT soal FROM soal ORDER BY soal_id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// 2. Get Existing Answers (Temp)
const getJawabanTemp = async (req, res) => {
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
};

// 3. Save Single Answer
const saveJawabanTemp = async (req, res) => {
  const { pasien_id, soal_id, jawaban } = req.body;
  try {
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
};

// 4. Bulk Save Answers (Debug/Dev)
const saveJawabanBulk = async (req, res) => {
  const { pasien_id, answers } = req.body;
  try {
    await db.query('DELETE FROM jawaban_temp WHERE pasien_id = $1', [pasien_id]);
    
    for (let i = 0; i < answers.length; i++) {
      const jawaban = answers[i] ? 'T' : 'F';
      await db.query(
        'INSERT INTO jawaban_temp (pasien_id, soal_id, jawaban) VALUES ($1, $2, $3)', 
        [pasien_id, i + 1, jawaban]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Submit Final Test
const submitTest = async (req, res) => {
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
    
    // Cleanup old data
    await db.query('DELETE FROM jawaban_fix WHERE pasien_id = $1', [pasien_id]);
    await db.query('DELETE FROM test_output WHERE pasien_id = $1', [pasien_id]);
    
    // Save Fixed Answers
    await db.query(
      `INSERT INTO jawaban_fix (pasien_id, jawaban_fix, is_sent) VALUES ($1, $2, $3)`,
      [pasien_id, jawabanFixString, true]
    );

    console.log(`[BOT] Waking up Python DOSBox bot for patient: ${pasien_id}...`);
    
    // Call Python Microservice
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
};

module.exports = { 
  getSoal, 
  getJawabanTemp, 
  saveJawabanTemp, 
  saveJawabanBulk, 
  submitTest 
};