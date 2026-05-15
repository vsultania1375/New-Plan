import fs from 'node:fs';
import path from 'node:path';
import { pool } from '../db/pool.js';
import {
  ingestAttendance,
  ingestCustomerSites,
  ingestEngineers,
  ingestOffline,
  ingestServiceAreas,
  ingestTicketActivity,
  ingestTickets
} from '../services/ingestionService.js';

const root = path.resolve(process.cwd(), '..');
const files = fs.readdirSync(root);

function findFile(fragment) {
  const found = files.find((name) => name.toLowerCase().includes(fragment.toLowerCase()));
  if (!found) throw new Error(`Missing sample file containing: ${fragment}`);
  return path.join(root, found);
}

try {
  const imports = [
    ['service areas', () => ingestServiceAreas(findFile('ServiceAreaMaster'))],
    ['sites', () => ingestCustomerSites(findFile('CustomerSiteMaster'))],
    ['engineers', () => ingestEngineers(findFile('EmployeeMaster'))],
    ['tickets', () => ingestTickets(findFile('ViewTicket'))],
    ['ticket activity visits', () => ingestTicketActivity(findFile('TicketActivity'), path.basename(findFile('TicketActivity')))],
    ['attendance', () => ingestAttendance(findFile('AttendanceReport'), path.basename(findFile('AttendanceReport')))],
    ['offline', () => ingestOffline(findFile('B2B Offline'), path.basename(findFile('B2B Offline')))]
  ];

  for (const [label, work] of imports) {
    console.log(`Importing ${label}...`);
    console.log(await work());
  }
  console.log('Sample data import completed.');
} finally {
  await pool.end();
}
