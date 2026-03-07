const express = require('express');
const router = express.Router();
const { loginDokter, verifyDokter, updateDokter, checkAcakSoal } = require('../controllers/dokterController');

// POST routes for auth
router.post('/dokter/login', loginDokter);
router.post('/dokter/verify', verifyDokter);

// [NEW] PUT route for updating profile
router.put('/dokter/update', updateDokter); 

// [NEW] Route for checking acak_soal value based on kode_seri filtering
router.get('/dokter/acak-soal/:kode_seri', checkAcakSoal);

module.exports = router;