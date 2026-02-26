// routes/submissionRoutes.js
const express = require('express');
const router = express.Router();
const { submitTest, processTest, addToQueue } = require('../controllers/submissionController');

// Define the route path
router.post('/submit-test', submitTest);

// Process test data
router.post('/process-test', processTest);

// Add data to processing queue
router.post('/queue/add', addToQueue);

module.exports = router;