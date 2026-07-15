require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const path      = require('path');
const connectDB = require('./backend/config/database');

const app = express();
connectDB();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.use(morgan('dev'));
app.use(express.json());

// Serve frontend files from /frontend folder
app.use(express.static(path.join(__dirname, 'frontend')));

// API routes
app.use('/api/auth',       require('./backend/routes/auth'));
app.use('/api/trips',      require('./backend/routes/trips'));
app.use('/api/alerts',     require('./backend/routes/alerts'));
app.use('/api/earnings',   require('./backend/routes/earnings'));
app.use('/api/passengers', require('./backend/routes/passengers'));
app.use('/api/ai',         require('./backend/routes/ai'));
app.use('/api/incidents',  require('./backend/routes/incidents'));
app.use('/api/community',  require('./backend/routes/community'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ShieldRide' }));

// All other routes → serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════╗');
  console.log(`║  🛡  ShieldRide is running!           ║`);
  console.log(`║  🌐  http://localhost:${PORT}           ║`);
  console.log(`║  🤖  AI: Anthropic Claude             ║`);
  console.log('╚══════════════════════════════════════╝\n');
});
