// routes/pesertaRoutes.js
const express = require('express');
const router = express.Router();
const pesertaController = require('../controllers/pesertaController');

// Route: /api/peserta
router.get('/peserta', pesertaController.getAllPeserta);

// Route: /api/peserta/report
router.post('/peserta/report', pesertaController.getPesertaReport);

module.exports = router;