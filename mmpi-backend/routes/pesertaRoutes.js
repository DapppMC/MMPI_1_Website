// routes/pesertaRoutes.js
const express = require('express');
const router = express.Router();
const pesertaController = require('../controllers/pesertaController');

// Route: /api/peserta
router.get('/peserta', pesertaController.getAllPeserta);

// Route: /api/peserta/report
router.post('/peserta/report', pesertaController.getPesertaReport);

// Route: /api/pasien (NEW: Create/Update Biodata)
router.post('/pasien', pesertaController.upsertPeserta);

// Route: /api/peserta/delete (NEW: Delete user data)
router.post('/peserta/delete', pesertaController.deletePeserta);

module.exports = router;