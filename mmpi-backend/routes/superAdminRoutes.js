// routes/superAdminRoutes.js
const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController'); // REPLACE path if needed

// Login endpoint (no auth needed)
router.post('/super-admin/login', superAdminController.superAdminLogin);

// Creation endpoint (Protected by authentication middleware)
router.post('/super-admin/create-dokter', superAdminController.authenticateSuperAdmin, superAdminController.createDokterAccount);

module.exports = router;