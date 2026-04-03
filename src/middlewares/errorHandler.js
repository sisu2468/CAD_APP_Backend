const { error } = require('../utils/apiResponse');
const config = require('../config/config');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message =
    statusCode >= 500 && config.env === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  const details =
    err.errors && Array.isArray(err.errors)
      ? err.errors.map((e) => ({ message: e.msg || e.message || String(e) }))
      : undefined;

  res.status(statusCode).json(error(statusCode, message, details));
}

module.exports = errorHandler;

