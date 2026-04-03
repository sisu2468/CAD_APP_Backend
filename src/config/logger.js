const { createLogger, format, transports } = require('winston');
const config = require('./config');

const logger = createLogger({
  level: config.env === 'development' ? 'debug' : 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console({
      format:
        config.env === 'development'
          ? format.combine(format.colorize(), format.simple())
          : format.json(),
    }),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

module.exports = logger;

