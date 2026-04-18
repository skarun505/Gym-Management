require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');
const runMigrations = require('./db/migrate');

const app = express();

// Allow all localhost origins (any port) — safe for local dev
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/members', require('./routes/members'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/reports', require('./routes/reports'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await runMigrations();
    app.listen(PORT, () => {
      console.log('');
      console.log('  ██████╗ ██╗   ██╗███╗   ███╗██████╗ ██████╗  ██████╗ ');
      console.log('  ██╔════╝╚██╗ ██╔╝████╗ ████║██╔══██╗██╔══██╗██╔═══██╗');
      console.log('  ██║  ███╗ ╚████╔╝ ██╔████╔██║██████╔╝██████╔╝██║   ██║');
      console.log('  ██║   ██║  ╚██╔╝  ██║╚██╔╝██║██╔═══╝ ██╔══██╗██║   ██║');
      console.log('  ╚██████╔╝   ██║   ██║ ╚═╝ ██║██║     ██║  ██║╚██████╔╝');
      console.log('   ╚═════╝    ╚═╝   ╚═╝     ╚═╝╚═╝     ╚═╝  ╚═╝ ╚═════╝ ');
      console.log('');
      console.log(`  🚀 API Server: http://localhost:${PORT}/api`);
      console.log(`  📂 Database:   SQLite (server/data/gym.db)`);
      console.log(`  🔑 Login:      admin@gym.com / admin123`);
      console.log('');
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
