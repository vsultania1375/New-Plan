export function text(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).trim();
  return cleaned === '' ? null : cleaned;
}

export function upper(value) {
  const cleaned = text(value);
  return cleaned ? cleaned.toUpperCase() : null;
}

export function integer(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(String(value).replace(/,/g, '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function decimal(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseFloat(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function excelDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number') {
    const epoch = Date.UTC(1899, 11, 30);
    return new Date(epoch + value * 24 * 60 * 60 * 1000);
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = raw.replace(/\./g, '-');
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const m = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i);
  if (m) {
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    let hour = Number(m[4] || 0);
    const minute = Number(m[5] || 0);
    const ampm = upper(m[6]);
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return new Date(Number(m[3]), months[m[2].slice(0, 3).toLowerCase()], Number(m[1]), hour, minute);
  }
  return null;
}

export function dateOnly(value) {
  const d = excelDate(value);
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

export function deriveBankName(...values) {
  const haystack = values.map((v) => upper(v) || '').join(' ');
  if (haystack.includes('STATE BANK') || haystack.includes('SBI')) return 'STATE BANK OF INDIA';
  if (haystack.includes('INDIAN BANK')) return 'INDIAN BANK';
  if (haystack.includes('CANARA')) return 'CANARA BANK';
  if (haystack.includes('CENTRAL BANK')) return 'CENTRAL BANK OF INDIA';
  if (haystack.includes('KERALA GRAMIN') || haystack.includes('KARELA GRAMIN')) return 'KERALA GRAMIN BANK';
  if (haystack.includes('KARNATAKA GRAMIN')) return 'KARNATAKA GRAMIN BANK';
  return 'UNKNOWN';
}

export function extractIndianBankAtmId(branchCode, bankName) {
  const branch = text(branchCode);
  if (!branch || bankName !== 'INDIAN BANK') return null;
  return branch.replace(/^IB\s+/i, '').trim() || null;
}

export function parseAssignedTo(value) {
  const raw = text(value);
  if (!raw) return { assignedEmployeeName: null, assignedEmployeeId: null };
  const match = raw.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  if (!match) return { assignedEmployeeName: raw, assignedEmployeeId: null };
  return {
    assignedEmployeeName: text(match[1]),
    assignedEmployeeId: text(match[2])
  };
}

export function deriveAttendanceStatus(inDateTime) {
  const d = excelDate(inDateTime);
  if (!d) return 'ABSENT';
  const cutoff = new Date(d);
  cutoff.setHours(10, 0, 0, 0);
  return d <= cutoff ? 'ONTIME' : 'LATE';
}

export function extractOfflineDataDate(filename) {
  const match = filename.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (!match) return new Date().toISOString().slice(0, 10);
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export function activeTicketStatusSql() {
  return "('OPEN','PENDING','COMPLETED','SENTBACK','SENDBACK')";
}
