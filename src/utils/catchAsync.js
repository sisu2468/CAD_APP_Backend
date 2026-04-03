/**
 * Wrap async route handlers and forward errors to Express error middleware.
 * @param {Function} fn
 * @returns {Function}
 */
module.exports = function catchAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

