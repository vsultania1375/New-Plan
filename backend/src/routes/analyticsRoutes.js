import express from 'express';
import XLSX from 'xlsx';
import {
  getBreakdowns,
  getCompletedStillOffline,
  getEngineerLoad,
  getEngineerWiseDetail,
  getEngineerWiseReport,
  getMapMarkers,
  getOfflineWithoutTicket,
  getOverview,
  getServiceAreaProfile,
  getServiceAreaRisk,
  getServiceAreaTerritories,
  getStateWiseReport,
  getStateMapData,
  getStateRisk,
  getTerritoryCoverageAudit,
  getTicketWithoutVisit,
  getV3CommandCenter,
  getV3SiteIntelligence
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

analyticsRoutes.get('/state-wise', async (_req, res, next) => {
  try {
    res.json(await getStateWiseReport());
  } catch (error) {
    next(error);
  }
});

analyticsRoutes.get('/engineer-wise', async (_req, res, next) => {
  try {
    res.json(await getEngineerWiseReport());
  } catch (error) {
    next(error);
  }
});

analyticsRoutes.get('/engineer-wise/:engineerId', async (req, res, next) => {
  try {
    res.json(await getEngineerWiseDetail(req.params.engineerId));
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

analyticsRoutes.get('/service-area-profile', async (req, res, next) => {
  try {
    res.json(await getServiceAreaProfile({
      state: req.query.state,
      serviceArea: req.query.serviceArea
    }));
  } catch (error) {
    next(error);
  }
});

analyticsRoutes.get('/territory-coverage-audit', async (_req, res, next) => {
  try {
    res.json(await getTerritoryCoverageAudit());
  } catch (error) {
    next(error);
  }
});

analyticsRoutes.get('/territories/service-areas', async (req, res, next) => {
  try {
    res.json(await getServiceAreaTerritories({ state: req.query.state }));
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

analyticsRoutes.get('/v3/command-center', async (req, res, next) => {
  try {
    res.json(await getV3CommandCenter({
      state: req.query.state,
      serviceArea: req.query.serviceArea
    }));
  } catch (error) {
    next(error);
  }
});

analyticsRoutes.get('/v3/site-intelligence', async (req, res, next) => {
  try {
    res.json(await getV3SiteIntelligence({ siteId: req.query.siteId }));
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
