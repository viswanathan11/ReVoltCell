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
};
