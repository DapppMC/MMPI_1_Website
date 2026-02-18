// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db'); // Import purely to test connection on startup

const app = express();
const port = 3000;

// Import Route Files
const pesertaRoutes = require('./routes/pesertaRoutes');
const soalRoutes = require('./routes/soalRoutes');

// Middleware
app.use(cors());
app.use(express.json());

// Test Database Connection (Optional, but good for logs)
db.connect()
  .then(() => console.log('Connected to PostgreSQL successfully!'))
  .catch(err => console.error('Connection error', err.stack));

// Use Routes
// Note: We mount them at '/api' so we don't need to write '/api' in the route files
app.use('/api', pesertaRoutes);
app.use('/api', soalRoutes);

app.listen(port, () => {
  console.log(`Node server is running on http://localhost:${port}`);
});