// routes/soalRoutes.js
const express = require('express');
const router = express.Router();
const soalController = require('../controllers/soalController');

// Route: /api/soal
router.get('/soal', soalController.getSoal);

// Routes: /api/jawaban-temp
router.get('/jawaban-temp/:pasien_id', soalController.getJawabanTemp);
router.post('/jawaban-temp', soalController.saveJawabanTemp);
router.post('/jawaban-temp/bulk', soalController.saveJawabanBulk);

// Route: /api/submit-test
router.post('/submit-test', soalController.submitTest);

module.exports = router;