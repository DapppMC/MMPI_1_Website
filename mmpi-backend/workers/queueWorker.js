// queueWorker.js
const db = require('../config/db');

let isProcessingQueue = false;
let isDosboxOpen = false;
let idleTimer = null;

const IDLE_TIMEOUT_MS = 5000; // Close DOSBox if queue is empty for 5 seconds

// Helper to interact with Python API
// Helper to interact with Python API
const callPythonApi = async (endpoint, payload = null) => {
  const url = `http://127.0.0.1:8000/${endpoint}`;
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  };
  if (payload) options.body = JSON.stringify(payload);

  const response = await fetch(url, options);
  if (!response.ok) {
    // [UPDATED] Extract the actual error message from Python!
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(`[${response.status}] ${errorBody.detail || response.statusText}`);
  }
  return await response.json();
};

const processQueue = async () => {
  if (isProcessingQueue) return; 

  try {
    isProcessingQueue = true;

    // 1. Grab ONE pending item
    const getQuery = `
      SELECT id, pasien_id, gender 
      FROM antrian_proses 
      WHERE status = 'pending' 
      ORDER BY created_at ASC 
      LIMIT 1
    `;
    const res = await db.query(getQuery);
    
    // If queue is empty:
    if (res.rows.length === 0) {
      isProcessingQueue = false;
      
      // If DOSBox is open and we aren't already counting down, start the idle timer
      if (isDosboxOpen && !idleTimer) {
        console.log(`[QUEUE] Antrean kosong. Menunggu ${IDLE_TIMEOUT_MS/1000} detik sebelum mematikan DOSBox...`);
        idleTimer = setTimeout(async () => {
          try {
            console.log('[QUEUE] 🛑 Mematikan DOSBox karena tidak ada aktivitas.');
            await callPythonApi('stop-dosbox');
            isDosboxOpen = false;
          } catch (err) {
            console.error('[QUEUE] Gagal mematikan DOSBox:', err.message);
          }
          idleTimer = null;
        }, IDLE_TIMEOUT_MS);
      }
      return; 
    }

    // --- WE HAVE A JOB ---
    // If we have a job, cancel the shutdown timer immediately!
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }

    const job = res.rows[0];
    const { id, pasien_id, gender } = job;

    // 2. Lock this row
    await db.query(`UPDATE antrian_proses SET status = 'processing' WHERE id = $1`, [id]);
    console.log(`\n[QUEUE] ⚙️ Memulai proses bot untuk ID: ${pasien_id}...`);

    // 3. WAKE UP DOSBOX IF NEEDED
    if (!isDosboxOpen) {
      console.log('[QUEUE] 🚀 Memulai instance DOSBox baru...');
      await callPythonApi('start-dosbox');
      isDosboxOpen = true;
    }

    // 4. GRAB ANSWERS AND SEND TO PROCESSOR
    const fixResult = await db.query('SELECT jawaban_fix FROM jawaban_fix WHERE pasien_id = $1', [pasien_id]);

    if (fixResult.rows.length > 0) {
      const jawabanFixString = fixResult.rows[0].jawaban_fix;
      const booleanAnswers = jawabanFixString.split('').map(char => char === 'T');

      try {
        const pythonData = await callPythonApi('process-mmpi', { gender, answers: booleanAnswers });
        
        if (pythonData.status === "success") {
          const scoresJson = JSON.stringify(pythonData.scores);
          await db.query(`UPDATE test_output SET hasil_output_ms = $1 WHERE pasien_id = $2`, [scoresJson, pasien_id]);
          await db.query(`UPDATE jawaban_fix SET is_sent = true WHERE pasien_id = $1`, [pasien_id]);
          console.log(`[QUEUE] ✅ Berhasil dinilai untuk: ${pasien_id}`);
        } else {
          console.error(`[QUEUE] ❌ Bot Python gagal (Internal) untuk: ${pasien_id}`);
        }
      } catch (err) {
        console.error(`[QUEUE] ❌ Koneksi Microservice / Bot gagal untuk: ${pasien_id}. Error: ${err.message}`);
      }
    } else {
      console.error(`[QUEUE] ❌ Data jawaban_fix tidak ditemukan untuk: ${pasien_id}`);
    }

    // 5. Remove the processed item
    await db.query(`DELETE FROM antrian_proses WHERE id = $1`, [id]);

  } catch (err) {
    console.error("[QUEUE] Worker Error:", err.message);
  } finally {
    isProcessingQueue = false;
  }
};

const startWorker = () => {
  console.log('🤖 Background Queue Worker Started. Checking every 3 detik...');
  // Reduced to 3 seconds for faster consecutive processing
  setInterval(processQueue, 3000); 
};

module.exports = { startWorker };