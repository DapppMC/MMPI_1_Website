// routes/submissionRoutes.js
const express = require('express');
const router = express.Router();
const { submitTest } = require('../controllers/submissionController');

// Define the route path
router.post('/submit-test', submitTest);

module.exports = router;