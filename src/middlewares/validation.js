const { validationResult } = require('express-validator');
const { error } = require('../utils/apiResponse');

function validateRequest(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }

  const details = result.array().map((e) => ({
    field: e.param,
    message: e.msg,
  }));

  return res.status(400).json(error(400, 'Validation failed', details));
}

module.exports = validateRequest;

