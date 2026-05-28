import dotenv from 'dotenv';

dotenv.config();

function parseOrigins(value) {
  return String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const nodeEnv = process.env.NODE_ENV || 'development';
const configuredCorsOrigins = parseOrigins(process.env.CORS_ORIGIN || process.env.FRONTEND_ORIGIN || 'http://localhost:5173');
const developmentCorsOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv,
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/operations_dashboard',
  databaseSsl: String(process.env.DATABASE_SSL || '').toLowerCase() === 'true',
  corsOrigins: Array.from(new Set([
    ...configuredCorsOrigins,
    ...(nodeEnv === 'production' ? [] : developmentCorsOrigins)
  ])),
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  adminUploadKey: process.env.ADMIN_UPLOAD_KEY || 'admin123'
};
