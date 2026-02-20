const express = require('express');
const router = express.Router();
const { loginDokter, verifyDokter, updateDokter } = require('../controllers/dokterController');

// POST routes for auth
router.post('/dokter/login', loginDokter);
router.post('/dokter/verify', verifyDokter);

// [NEW] PUT route for updating profile
router.put('/dokter/update', updateDokter); 

module.exports = router;