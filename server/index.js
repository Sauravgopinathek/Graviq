require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./routes/auth');
const botRoutes = require('./routes/bots');
const leadRoutes = require('./routes/leads');
const conversationRoutes = require('./routes/conversations');
const analyticsRoutes = require('./routes/analytics');
const { authLimiter, conversationCreateLimiter, messageLimiter } = require('./middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Serve widget static files
app.get('/widget.js', (req, res) => {
  res.sendFile(path.join(__dirname, '../widget/dist/widget.js'));
});

// Serve test website
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, '../test-website.html'));
});

// API Routes with rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', analyticsRoutes);
app.use('/api/bots', botRoutes);
app.use('/api', leadRoutes);
app.use('/api/conversations', conversationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Graviq server running on http://localhost:${PORT}`);
});

module.exports = app;
