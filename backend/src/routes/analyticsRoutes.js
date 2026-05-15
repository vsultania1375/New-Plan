import express from 'express';
import XLSX from 'xlsx';
import {
  getBreakdowns,
  getCompletedStillOffline,
  getEngineerLoad,
  getMapMarkers,
  getOfflineWithoutTicket,
  getOverview,
  getServiceAreaRisk,
  getStateMapData,
  getStateRisk,
  getTicketWithoutVisit
} from '../services/analyticsService.js';

export const analyticsRoutes = express.Router();

analyticsRoutes.get('/overview', async (_req, res, next) => {
  try {
    res.json(await getOverview());
  } catch (error) {
    next(error);
  }
});

analyticsRoutes.get('/map/offline', async (_req, res, next) => {
  try {
    res.json(await getMapMarkers());
  } catch (error) {
    next(error);
  }
});

analyticsRoutes.get('/map/states', async (_req, res, next) => {
  try {
    res.json(await getStateMapData());
  } catch (error) {
    next(error);
  }
});

analyticsRoutes.get('/risk/states', async (_req, res, next) => {
  try {
    res.json(await getStateRisk());
  } catch (error) {
    next(error);
  }
});

analyticsRoutes.get('/risk/service-areas', async (_req, res, next) => {
  try {
    res.json(await getServiceAreaRisk());
  } catch (error) {
    next(error);
  }
});

analyticsRoutes.get('/tables/offline-without-ticket', async (_req, res, next) => {
  try {
    res.json(await getOfflineWithoutTicket());
  } catch (error) {
    next(error);
  }
});

analyticsRoutes.get('/tables/ticket-without-visit', async (_req, res, next) => {
  try {
    res.json(await getTicketWithoutVisit());
  } catch (error) {
    next(error);
  }
});

analyticsRoutes.get('/tables/completed-still-offline', async (_req, res, next) => {
  try {
    res.json(await getCompletedStillOffline());
  } catch (error) {
    next(error);
  }
});

analyticsRoutes.get('/tables/engineer-load', async (_req, res, next) => {
  try {
    res.json(await getEngineerLoad());
  } catch (error) {
    next(error);
  }
});

analyticsRoutes.get('/breakdowns', async (_req, res, next) => {
  try {
    res.json(await getBreakdowns());
  } catch (error) {
    next(error);
  }
});

const exportSources = {
  'offline-without-ticket': getOfflineWithoutTicket,
  'ticket-without-visit': getTicketWithoutVisit,
  'completed-still-offline': getCompletedStillOffline,
  'engineer-load': getEngineerLoad,
  'state-risk': getStateRisk,
  'service-area-risk': getServiceAreaRisk
};

analyticsRoutes.get('/export/:name', async (req, res, next) => {
  try {
    const loader = exportSources[req.params.name];
    if (!loader) return res.status(404).json({ error: 'Unknown export' });

    const rows = await loader();
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.name}-${timestamp}.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
});
