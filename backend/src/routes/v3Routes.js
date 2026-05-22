import express from 'express';
import {
  getDashboardSummary,
  getOfflineTrend,
  getRepeatFailureTrend,
  getServiceAreaHealth,
  getSiteIntelligence,
  getStateHealth,
  getUploadsHistory,
  getVisitPerformance
} from '../services/v3Service.js';

export const v3Routes = express.Router();

v3Routes.get('/dashboard/summary', async (req, res, next) => {
  try {
    res.json(await getDashboardSummary(req.query));
  } catch (error) {
    next(error);
  }
});

v3Routes.get('/dashboard/state-health', async (req, res, next) => {
  try {
    res.json(await getStateHealth(req.query));
  } catch (error) {
    next(error);
  }
});

v3Routes.get('/dashboard/service-area-health', async (req, res, next) => {
  try {
    res.json(await getServiceAreaHealth(req.query));
  } catch (error) {
    next(error);
  }
});

v3Routes.get('/dashboard/offline-trend', async (req, res, next) => {
  try {
    res.json(await getOfflineTrend(req.query));
  } catch (error) {
    next(error);
  }
});

v3Routes.get('/dashboard/repeat-failures', async (req, res, next) => {
  try {
    res.json(await getRepeatFailureTrend(req.query));
  } catch (error) {
    next(error);
  }
});

v3Routes.get('/dashboard/visit-performance', async (req, res, next) => {
  try {
    res.json(await getVisitPerformance(req.query));
  } catch (error) {
    next(error);
  }
});

v3Routes.get('/sites/:siteId/intelligence', async (req, res, next) => {
  try {
    res.json(await getSiteIntelligence(req.params.siteId));
  } catch (error) {
    next(error);
  }
});

v3Routes.get('/uploads/history', async (_req, res, next) => {
  try {
    res.json(await getUploadsHistory());
  } catch (error) {
    next(error);
  }
});
