import XLSX from 'xlsx';

export function readWorkbookInfo(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  return workbook.SheetNames.map((sheetName) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: null,
      raw: false,
      blankrows: false
    });
    const header = rows.find((row) => row.some((cell) => String(cell ?? '').trim())) || [];
    return {
      sheetName,
      headers: header.map((cell) => String(cell ?? '').trim()).filter(Boolean)
    };
  });
}

export function readRows(filePath, sheetName, options = {}) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
  if (!sheet) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }
  return XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    raw: true,
    range: options.headerRow ? options.headerRow - 1 : 0
  });
}
