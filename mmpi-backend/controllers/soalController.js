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

module.exports = { 
  getSoal, 
  getJawabanTemp, 
  saveJawabanTemp, 
  saveJawabanBulk, 
};