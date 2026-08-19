const env = require('./env');

module.exports = {
  env: env.NODE_ENV,
  port: env.PORT,
  mongo: {
    uri: env.MONGODB_URI
  },
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN
  },
  dbCollectionPrefix: env.DB_COLLECTION_PREFIX,
  cadModel: {
    apiUrl: String(env.CAD_MODEL_API_URL).replace(/\/$/, ''),
    timeoutMs: env.CAD_MODEL_TIMEOUT_MS,
  },
};

