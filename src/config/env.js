const dotenv = require('dotenv');
const Joi = require('joi');

dotenv.config();

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(4000),
  MONGODB_URI: Joi.string().uri().required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  DB_COLLECTION_PREFIX: Joi.string().default(''),
  PAY_AMOUNT: Joi.string().optional(),
  PRIVATE_API_KEY: Joi.string().optional(),
  PAYPAL_CLIENT_ID: Joi.string().optional(),
  GOOGLE_OAUTH_CLIENT_ID: Joi.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: Joi.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: Joi.string().optional()
})
  .unknown(true);

const { value: env, error } = envSchema.validate(process.env);

if (error) {
  // Fail fast but avoid leaking implementation details in responses
  // eslint-disable-next-line no-console
  console.error('Environment validation error:', error.message);
  throw new Error('Invalid environment configuration');
}

module.exports = env;

