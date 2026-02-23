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

// Route for patient login
router.post('/peserta/login', pesertaController.loginPeserta);

// [CORRECTED] Route for getting a single patient information by ID
// Changed to GET and added /:id to capture the ID from the URL
router.get('/peserta/:id', pesertaController.getPesertaById);

// [NEW] Routes for tracking test duration and status
router.post('/test-status/start', pesertaController.startTestStatus);
router.post('/test-status/finish', pesertaController.finishTestStatus);

module.exports = router;