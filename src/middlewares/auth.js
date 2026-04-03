const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const config = require('../config/config');

const User = mongoose.model('User');

function authenticateAccessToken(req, res, next) {
  const authHeader = req.headers.authorization;
  let token;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token) {
    return res.status(401).json({
      status: 'error',
      code: 401,
      message: 'Authentication required',
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({
      status: 'error',
      code: 401,
      message: 'Invalid or expired token',
    });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'Authentication required',
      });
    }

    const { roles } = req.user;
    const roleList = Array.isArray(roles) ? roles : [];

    const hasRole = roleList.some((r) => allowedRoles.includes(r));

    if (!hasRole) {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: 'Forbidden',
      });
    }

    return next();
  };
}

module.exports = {
  authenticateAccessToken,
  authorizeRoles,
};

