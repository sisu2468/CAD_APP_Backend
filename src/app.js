const express = require('express');
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
const { success } = require('./utils/apiResponse');

// Initialize models (reuse existing ones under /models)
glob.sync('./models/**/*.js').forEach((model) => {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  require('../' + model);
});

const app = express();

// Core security middlewares
app.use(helmet());
app.use(cors());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false, limit: '5mb' }));
app.use(bodyParser.json({ limit: '5mb' }));

// Logging
app.use(
  morgan('dev', {
    stream: {
      write: (message) => logger.http ? logger.http(message.trim()) : logger.info(message.trim()),
    },
  })
);

// Health check
app.get('/health', (req, res) => {
  res.json(success({ uptime: process.uptime(), status: 'ok' }));
});

// Routes
const authRoutes = require('./routes/authRoutes');

app.use('/api', authRoutes);

// Global error handler
app.use(errorHandler);

async function start() {
  await mongoose.connect(config.mongo.uri);
  // eslint-disable-next-line no-console
  console.log('MongoDB connected');
  const port = config.port;
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = {
  app,
  start,
};

