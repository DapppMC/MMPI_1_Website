// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db'); 

// [NEW] Import the worker
const { startWorker } = require('./workers/queueWorker'); 

const app = express();
const port = 3000;

const pesertaRoutes = require('./routes/pesertaRoutes');
const soalRoutes = require('./routes/soalRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const dokterRoutes = require('./routes/dokterRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');

app.use(cors());
app.use(express.json());

db.connect()
  .then(() => console.log('Connected to PostgreSQL successfully!'))
  .catch(err => console.error('Connection error', err.stack));

app.use('/api', pesertaRoutes);
app.use('/api', soalRoutes);
app.use('/api', submissionRoutes);
app.use('/api', dokterRoutes);
app.use('/api', superAdminRoutes);

// [NEW] Start the background bot worker
startWorker();

app.listen(port, () => {
  console.log(`Node server is running on http://localhost:${port}`);
});