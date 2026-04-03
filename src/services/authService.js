const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const config = require('../config/config');

const User = mongoose.model('User');

/**
 * Authenticate user with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: any, accessToken: string, refreshToken: string}>}
 */
async function login(email, password) {
  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.pwd);
  if (!isMatch) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  const roles = user.isAdmin ? ['admin', 'user'] : ['user'];

  const payload = {
    sub: String(user._id),
    email: user.email,
    avatar: user.avatar,
    roles,
  };

  const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
  const refreshToken = jwt.sign({ sub: payload.sub, roles }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });

  return { user, accessToken, refreshToken };
}

/**
 * Register new user.
 * @param {object} data
 * @returns {Promise<any>}
 */
async function register(data) {
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    const err = new Error('User already exists');
    err.statusCode = 409;
    throw err;
  }

  const saltRounds = 12;
  const hashedPwd = await bcrypt.hash(data.pwd, saltRounds);

  const user = await User.create({
    email: data.email,
    name: data.name,
    companyname: data.companyname,
    pwd: hashedPwd,
    birthdate: data.birthdate,
  });

  return user;
}

/**
 * Refresh access token using refresh token.
 * @param {string} token
 * @returns {Promise<{accessToken: string}>}
 */
async function refreshAccessToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret);
    const user = await User.findById(decoded.sub);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 401;
      throw err;
    }

    const roles = user.isAdmin ? ['admin', 'user'] : ['user'];

    const payload = {
      sub: String(user._id),
      email: user.email,
      avatar: user.avatar,
      roles,
    };

    const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresIn,
    });

    return { accessToken };
  } catch (e) {
    const err = new Error('Invalid refresh token');
    err.statusCode = 401;
    throw err;
  }
}

/**
 * Update user profile.
 * @param {string} userId
 * @param {object} updates
 * @returns {Promise<void>}
 */
async function updateProfile(userId, updates) {
  const toUpdate = { ...updates };

  if (toUpdate.pwd) {
    const saltRounds = 12;
    toUpdate.pwd = await bcrypt.hash(toUpdate.pwd, saltRounds);
  }

  const result = await User.updateOne({ _id: userId }, toUpdate);
  if (!result.modifiedCount) {
    const err = new Error('Profile update failed');
    err.statusCode = 500;
    throw err;
  }
}

module.exports = {
  login,
  register,
  refreshAccessToken,
  updateProfile,
};

