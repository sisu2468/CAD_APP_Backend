const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const bodyParser = require('body-parser');
const glob = require('glob');

const config = require('./config/config');
const logger = require('./config/logger');
const errorHandler = require('./middlewares/errorHandler');

glob.sync('./models/**/*.js').forEach((model) => {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  require('../' + model);
});

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Disposition', 'Content-Type'],
  })
);
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false, limit: '25mb' }));
app.use(bodyParser.json({ limit: '25mb' }));

app.use(
  morgan('dev', {
    stream: {
      write: (message) => (logger.http ? logger.http(message.trim()) : logger.info(message.trim())),
    },
  })
);

app.get('/', (_req, res) => {
  res.json({
    name: 'CAD Extraction API',
    version: '1.0.0',
    status: 'healthy',
    message: 'CAD Extraction API is running',
    endpoints: {
      'GET /health': 'Health check',
      'GET /api/cad/health': 'CAD model health',
      'POST /api/process-image': 'Process single image',
      'POST /api/process-multi-view': 'Process multiple views',
      'POST /api/process-with-pdf': 'Process and return PDF',
    },
  });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    message: 'CAD Extraction API is running',
    data: { uptime: process.uptime(), status: 'ok' },
  });
});

app.use(
  '/cad-previews',
  express.static(path.join(process.cwd(), 'cad-previews'), {
    setHeaders(res) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'public, max-age=120');
    },
  })
);

const authRoutes = require('./routes/authRoutes');
const cadRoutes = require('./routes/cadRoutes');

app.use('/api', authRoutes);
app.use('/api', cadRoutes);

app.use(errorHandler);

async function start() {
  await mongoose.connect(config.mongo.uri);
  // eslint-disable-next-line no-console
  console.log('MongoDB connected');
  const port = config.port;
  const server = app.listen(port, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on port ${port}`);
  });
  server.timeout = 180000;
  server.keepAliveTimeout = 180000;
  server.headersTimeout = 181000;
}

module.exports = {
  app,
  start,
};
