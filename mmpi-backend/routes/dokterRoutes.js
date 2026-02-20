const express = require('express');
const router = express.Router();
const { loginDokter } = require('../controllers/dokterController');

// POST route for login
router.post('/auth/login', loginDokter);

module.exports = router;