const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const matchRoutes = require('./routes/matchRoutes');
const playerRoutes = require('./routes/playerRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Admin Authentication Middleware
const adminAuth = (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const adminKey = req.headers['x-admin-key'];
    const expectedKey = process.env.ADMIN_PASSWORD || 'admin123';

    if (adminKey !== expectedKey) {
      return res.status(401).json({ message: 'Unauthorized: Invalid Admin Password.' });
    }
  }
  next();
};

//app.use(adminAuth);

// Routes
app.use('/api/matches', matchRoutes);
app.use('/api/players', playerRoutes);

// Base route for API description
app.get('/', (req, res) => {
  res.json({
    name: 'IPL Sports Score Tracker API',
    version: '1.0.0',
    description: 'REST API serving matches, schedules, live scores, and player statistics for IPL.'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server!' });
});

// Database Connection & Server Start
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ipl_score_tracker';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB Database.');
    app.listen(PORT, () => {
      console.log(`Server is running and listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database connection error:', error.message);
    console.log('Starting server in offline database mode (mock/fallback)...');

    // In case MongoDB isn't running locally, we can still start the Express server
    // so the frontend doesn't crash on start and can report error, or we can warn.
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (Database Offline mode)`);
    });
  });
