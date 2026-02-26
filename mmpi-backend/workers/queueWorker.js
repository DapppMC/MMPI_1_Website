// queueWorker.js
const db = require('../config/db');

// Flag to prevent the worker from triggering twice if DOSBox takes a long time
let isProcessingQueue = false;

const processQueue = async () => {
  if (isProcessingQueue) return; // Skip if DOSBox is currently running

  try {
    isProcessingQueue = true;

    // 1. Grab ONE pending item from the queue (Oldest first)
    const getQuery = `
      SELECT id, pasien_id, gender 
      FROM antrian_proses 
      WHERE status = 'pending' 
      ORDER BY created_at ASC 
      LIMIT 1
    `;
    const res = await db.query(getQuery);
    
    // If queue is empty, do nothing and quietly exit
    if (res.rows.length === 0) {
      isProcessingQueue = false;
      return; 
    }

    const job = res.rows[0];
    const { id, pasien_id, gender } = job;

    // 2. Lock this row by changing status to 'processing'
    await db.query(`UPDATE antrian_proses SET status = 'processing' WHERE id = $1`, [id]);
    console.log(`\n[QUEUE] ⚙️ Memulai proses bot untuk ID: ${pasien_id}...`);

    // =========================================================
    // 3. THIS IS YOUR ORIGINAL processTest LOGIC
    // =========================================================
    const fixResult = await db.query('SELECT jawaban_fix FROM jawaban_fix WHERE pasien_id = $1', [pasien_id]);

    if (fixResult.rows.length > 0) {
      const jawabanFixString = fixResult.rows[0].jawaban_fix;
      const booleanAnswers = jawabanFixString.split('').map(char => char === 'T');

      const pythonResponse = await fetch('http://127.0.0.1:8000/process-mmpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender, answers: booleanAnswers })
      });

      if (pythonResponse.ok) {
        const pythonData = await pythonResponse.json();
        
        if (pythonData.status === "success") {
          const scoresJson = JSON.stringify(pythonData.scores);
          
          await db.query(`UPDATE test_output SET hasil_output_ms = $1 WHERE pasien_id = $2`, [scoresJson, pasien_id]);
          await db.query(`UPDATE jawaban_fix SET is_sent = true WHERE pasien_id = $1`, [pasien_id]);
          
          console.log(`[QUEUE] ✅ Berhasil dinilai untuk: ${pasien_id}`);
        } else {
          console.error(`[QUEUE] ❌ Bot Python gagal (Internal) untuk: ${pasien_id}`);
        }
      } else {
        console.error(`[QUEUE] ❌ Koneksi Microservice gagal untuk: ${pasien_id}`);
      }
    } else {
      console.error(`[QUEUE] ❌ Data jawaban_fix tidak ditemukan untuk: ${pasien_id}`);
    }
    // =========================================================

    // 4. Finally, remove the item from the queue regardless of success/fail
    // so the queue doesn't get stuck forever.
    await db.query(`DELETE FROM antrian_proses WHERE id = $1`, [id]);

  } catch (err) {
    console.error("[QUEUE] Worker Error:", err.message);
  } finally {
    // 5. Unlock the worker so it can grab the next item in the next cycle
    isProcessingQueue = false;
  }
};

// Function to ignite the worker loop
const startWorker = () => {
  console.log('🤖 Background Queue Worker Started. Checking every 5 seconds...');
  // Runs processQueue every 5 seconds
  setInterval(processQueue, 5000); 
};

module.exports = { startWorker };