import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
  PASSPORT_BASE_URL: process.env.PASSPORT_BASE_URL || 'http://localhost:5173/passport',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // VoltIQ AI Configuration
  LLM_PROVIDER: (process.env.LLM_PROVIDER ||
    (process.env.GEMINI_API_KEY ? 'gemini' : process.env.OPENAI_API_KEY ? 'openai' : 'mock')).toLowerCase(),
  LLM_MODEL: process.env.LLM_MODEL || 'gemini-flash-lite-latest',
  LLM_API_KEY: process.env.LLM_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '',
  LLM_TIMEOUT_MS: parseInt(process.env.LLM_TIMEOUT_MS || '20000', 10),
  AI_MAX_INPUT_CHARS: parseInt(process.env.AI_MAX_INPUT_CHARS || '1000', 10),
  AI_MAX_OUTPUT_TOKENS: parseInt(process.env.AI_MAX_OUTPUT_TOKENS || '800', 10),
  AI_RATE_LIMIT_PER_MINUTE: parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE || '30', 10),
};
