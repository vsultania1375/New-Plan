import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { query } from './db/pool.js';
import { analyticsRoutes } from './routes/analyticsRoutes.js';
import { uploadRoutes } from './routes/uploadRoutes.js';
import { v3Routes } from './routes/v3Routes.js';

const app = express();

app.use(cors({
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS origin not allowed: ${origin}`));
  }
}));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    const db = await query('SELECT NOW() AS now');
    res.json({ ok: true, dbConnected: true, dbTime: db.rows[0].now });
  } catch (error) {
    res.status(200).json({ ok: true, dbConnected: false, error: error.message });
  }
});

app.use('/api/uploads', uploadRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/v3', v3Routes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message || 'Internal server error' });
});

app.listen(env.port, () => {
  console.log(`Operations dashboard API running on http://localhost:${env.port}`);
});
