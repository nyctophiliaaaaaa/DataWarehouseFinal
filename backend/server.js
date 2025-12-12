require('dotenv').config();
const express = require('express');
const cors = require('cors');
const uploadRoutes = require('./routes/upload');
const processRoutes = require('./routes/process');
const auditRoutes = require('./routes/audit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Default Vite dev server port
  // OR if you're using Vue CLI:
  // origin: 'http://localhost:8080',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✨ ADD THIS ROOT ROUTE ✨
app.get('/', (req, res) => {
  res.json({
    message: '✈️ Airline ETL API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      upload: 'POST /api/upload',
      process: 'POST /api/process',
      clean: 'POST /api/process/clean',
      load: 'POST /api/process/load',
      auditLogs: 'GET /api/audit/logs',
      errors: 'GET /api/audit/errors',
      stats: 'GET /api/audit/stats'
    }
  });
});

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/process', processRoutes);
app.use('/api/audit', auditRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});