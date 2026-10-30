import { Transformer } from '../types';

/**
 * Ensures all transformers have valid, distinct, and visible coordinates on the diagram.
 */
export function ensureTransformersHaveValidPositions(transformers: Transformer[]): Transformer[] {
  if (!transformers || transformers.length === 0) return [];

  const isCoordValid = (t: Transformer) =>
    t.x !== undefined &&
    t.y !== undefined &&
    !isNaN(Number(t.x)) &&
    !isNaN(Number(t.y)) &&
    Number(t.x) > 50 &&
    Number(t.y) > 50 &&
    Number(t.x) <= 1950 &&
    Number(t.y) <= 1350;

  const validCoords = transformers.filter(isCoordValid);

  const getAutoPosition = (slotIdx: number, totalSlots: number) => {
    const useFourLanes = totalSlots > 28;
    if (!useFourLanes) {
      const isEven = slotIdx % 2 === 0;
      const row = Math.floor(slotIdx / 2);
      const maxRows = Math.max(1, Math.ceil(totalSlots / 2));
      const stepY = Math.min(50, Math.max(28, Math.floor(740 / maxRows)));
      return {
        x: isEven ? 450 : 590,
        y: 135 + (row % 26) * stepY,
        orientation: (isEven ? 'left' : 'right') as 'left' | 'right'
      };
    } else {
      const lane = slotIdx % 4;
      const row = Math.floor(slotIdx / 4);
      const maxRows = Math.max(1, Math.ceil(totalSlots / 4));
      const stepY = Math.min(50, Math.max(28, Math.floor(740 / maxRows)));
      const laneX = [330, 450, 590, 710][lane];
      const laneOrient: ('left' | 'right')[] = ['left', 'left', 'right', 'right'];
      return {
        x: laneX,
        y: 135 + (row % 26) * stepY,
        orientation: laneOrient[lane]
      };
    }
  };

  if (validCoords.length < transformers.length * 0.4) {
    return transformers.map((t, idx) => {
      const pos = getAutoPosition(idx, transformers.length);
      return {
        ...t,
        x: pos.x,
        y: pos.y,
        orientation: t.orientation || pos.orientation
      };
    });
  }

  const occupied = new Set<string>();
  let fallbackSlot = 0;

  return transformers.map((t) => {
    const xNum = Math.round(Number(t.x) || 0);
    const yNum = Math.round(Number(t.y) || 0);
    const key = `${xNum},${yNum}`;

    if (isCoordValid(t) && !occupied.has(key)) {
      occupied.add(key);
      return {
        ...t,
        x: xNum,
        y: yNum
      };
    }

    let pos = getAutoPosition(fallbackSlot, transformers.length);
    while (occupied.has(`${pos.x},${pos.y}`) && fallbackSlot < 200) {
      fallbackSlot++;
      pos = getAutoPosition(fallbackSlot, transformers.length);
    }
    occupied.add(`${pos.x},${pos.y}`);
    fallbackSlot++;

    return {
      ...t,
      x: pos.x,
      y: pos.y,
      orientation: t.orientation || pos.orientation
    };
  });
}

/**
 * Decodes binary data (ArrayBuffer or Uint8Array) into text with automatic detection of:
 * - UTF-8 with BOM
 * - UTF-16 LE / BE with BOM
 * - Strict UTF-8
 * - Windows-874 / TIS-620 (Microsoft Excel on Windows in Thailand)
 */
export function decodeCsvBuffer(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (!bytes || bytes.length === 0) return '';

  // 1. Check for UTF-8 BOM (\xEF\xBB\xBF)
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }

  // 2. Check for UTF-16 LE BOM (\xFF\xFE) or UTF-16 BE BOM (\xFE\xFF)
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  }
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  }

  // 3. Try strict UTF-8
  try {
    const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
    const text = utf8Decoder.decode(bytes);
    if (!text.includes('\uFFFD')) {
      return text;
    }
  } catch {
    // UTF-8 failed, continue to Windows-874
  }

  // 4. Try Windows-874 (TIS-620 Thai ANSI from Excel Windows)
  try {
    const thaiDecoder = new TextDecoder('windows-874');
    const thaiText = thaiDecoder.decode(bytes);
    return thaiText;
  } catch {
    // Fallback to standard UTF-8
    return new TextDecoder('utf-8').decode(bytes);
  }
}

/**
 * Reads a File or Blob with automatic Thai Windows-874 / UTF-8 encoding detection.
 */
export async function readCsvFileWithEncoding(file: File | Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  return decodeCsvBuffer(buffer);
}

export function exportToCsvString(transformers: Transformer[]): string {
  const headers = [
    'id',
    'peaNo',
    'name',
    'kva',
    'type',
    'phase',
    'voltage',
    'feeder',
    'branch',
    'poleNo',
    'x',
    'y',
    'orientation',
    'latitude',
    'longitude',
    'notes'
  ];

  const escapeCsv = (str: any) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = transformers.map(t => [
    escapeCsv(t.id),
    escapeCsv(t.peaNo),
    escapeCsv(t.name),
    t.kva,
    escapeCsv(t.type),
    escapeCsv(t.phase || '3P'),
    escapeCsv(t.voltage || '22 kV'),
    escapeCsv(t.feeder || ''),
    escapeCsv(t.branch || ''),
    escapeCsv(t.poleNo || ''),
    t.x,
    t.y,
    escapeCsv(t.orientation || 'left'),
    t.latitude !== undefined && t.latitude !== null ? t.latitude : '',
    t.longitude !== undefined && t.longitude !== null ? t.longitude : '',
    escapeCsv(t.notes || '')
  ].join(','));

  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

export function downloadCsvFile(transformers: Transformer[], filename = 'transformers_database.csv') {
  const csvContent = exportToCsvString(transformers);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s\-_()./\\\[\]"'`]/g, '');
}

function detectDelimiter(text: string): string {
  let inQuotes = false;
  let commas = 0;
  let semicolons = 0;
  let tabs = 0;

  for (let i = 0; i < Math.min(text.length, 1000); i++) {
    const c = text[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (!inQuotes) {
      if (c === ',') commas++;
      else if (c === ';') semicolons++;
      else if (c === '\t') tabs++;
      else if (c === '\n') break;
    }
  }

  if (tabs > commas && tabs > semicolons) return '\t';
  if (semicolons > commas) return ';';
  return ',';
}

export function parseCsvLine(text: string, forcedDelimiter?: string): string[] {
  const delimiter = forcedDelimiter || detectDelimiter(text);

  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === delimiter && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

const COMMON_KVA_RATINGS = new Set([
  10, 15, 20, 22.5, 30, 45, 50, 75, 100, 160, 250, 315, 400, 500, 750, 1000, 1250, 1500, 2000, 2500
]);

/**
 * Robust CSV parser that handles:
 * - Header row search (skipping title rows)
 * - Broad PEA Thai and English header synonyms
 * - Smart heuristic inference if headers are missing
 * - Automated column correction if values were shifted or swapped
 */
export function parseCsvToTransformers(csvText: string): Transformer[] {
  let cleanCsv = csvText.replace(/^\uFEFF/, '').trim();
  if (!cleanCsv) return [];

  const rawLines = cleanCsv.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (rawLines.length === 0) return [];

  const delimiter = detectDelimiter(cleanCsv);

  // 1. Identify header row (scan first 10 lines for known column keywords)
  const headerKeywords = [
    'pea', 'peano', 'รหัสหม้อแปลง', 'รหัส', 'หม้อแปลง', 'ทรัพย์สิน', 'ลำดับ', 'no',
    'name', 'ชื่อ', 'สถานที่', 'ผู้ใช้ไฟ', 'รายละเอียด', 'location',
    'kva', 'ขนาด', 'พิกัด', 'capacity', 'kw',
    'type', 'ประเภท', 'การใช้งาน', 'จำหน่าย',
    'phase', 'เฟส', 'ระบบเฟส',
    'voltage', 'แรงดัน', 'feeder', 'สายป้อน', 'branch', 'สายแยก', 'สาขา', 'pole', 'เสา',
    'lat', 'latitude', 'lng', 'long', 'longitude', 'พิกัดx', 'พิกัดy'
  ];

  let headerRowIndex = 0;
  let maxKeywordScore = 0;

  for (let i = 0; i < Math.min(rawLines.length, 10); i++) {
    const cols = parseCsvLine(rawLines[i], delimiter).map(normalizeHeader);
    let score = 0;
    for (const col of cols) {
      if (headerKeywords.some(k => col === k || col.includes(k))) {
        score++;
      }
    }
    if (score > maxKeywordScore) {
      maxKeywordScore = score;
      headerRowIndex = i;
    }
  }

  const hasHeaderRow = maxKeywordScore >= 2;
  const headerLine = hasHeaderRow ? rawLines[headerRowIndex] : '';
  const headers = hasHeaderRow ? parseCsvLine(headerLine, delimiter).map(normalizeHeader) : [];

  const getIdx = (candidates: string[]) => {
    if (!hasHeaderRow) return -1;
    return headers.findIndex(h => candidates.some(c => {
      const nc = normalizeHeader(c);
      return h === nc || h.includes(nc);
    }));
  };

  let idIdx = getIdx(['id', 'ไอดี', 'ลำดับ']);
  let peaIdx = getIdx(['peano', 'pea_no', 'peano.', 'รหัสหม้อแปลง', 'รหัสpea', 'รหัส', 'peacode', 'เลขที่หม้อแปลง', 'หม้อแปลง', 'รหัสอุปกรณ์', 'รหัสทรัพย์สิน', 'pea']);
  let nameIdx = getIdx(['name', 'ชื่อสถานที่ผู้ใช้ไฟ', 'ชื่อสถานที่', 'ชื่อผู้ใช้ไฟ', 'ชื่อหม้อแปลง', 'สถานที่ติดตั้ง', 'สถานที่', 'ผู้ใช้ไฟ', 'ชื่อ', 'รายละเอียด', 'location', 'description']);
  let kvaIdx = getIdx(['kva', 'ขนาดkva', 'ขนาด(kva)', 'พิกัดkva', 'พิกัด(kva)', 'ขนาดพิกัด', 'ขนาดหม้อแปลง', 'พิกัดหม้อแปลง', 'ขนาดติดตั้ง', 'ขนาด', 'พิกัด', 'capacity', 'kw']);
  let typeIdx = getIdx(['type', 'ประเภทหม้อแปลง', 'ประเภท', 'การใช้งาน', 'จำหน่ายเฉพาะราย', 'จำหน่าย', 'ชนิด', 'สามเหลี่ยม']);
  let phaseIdx = getIdx(['phase', 'ระบบเฟส', 'จำนวนเฟส', 'เฟส']);
  let voltageIdx = getIdx(['voltage', 'ระบบแรงดัน', 'ระดับแรงดัน', 'แรงดัน', 'kv']);
  let feederIdx = getIdx(['feeder', 'สายป้อน', 'ฟีดเดอร์', 'วงจร']);
  let branchIdx = getIdx(['branch', 'สายแยก', 'สาขา', 'แยก']);
  let poleIdx = getIdx(['pole', 'poleno', 'ต้นเสา', 'เสา', 'เลขเสา', 'หมายเลขเสา', 'เสาที่']);
  let xIdx = getIdx(['pos_x', 'coord_x', 'x', 'พิกัดx']);
  let yIdx = getIdx(['pos_y', 'coord_y', 'y', 'พิกัดy']);
  let orientIdx = getIdx(['orientation', 'ทิศทาง', 'orient']);
  let latIdx = getIdx(['latitude', 'lat', 'ละติจูด', 'พิกัดlat', 'พิกัดละติจูด', 'พิกัดn']);
  let lngIdx = getIdx(['longitude', 'lng', 'long', 'ลองจิจูด', 'พิกัดlong', 'พิกัดลองจิจูด', 'พิกัดe']);
  let notesIdx = getIdx(['notes', 'note', 'หมายเหตุ', 'remark', 'remarks', 'คำอธิบาย']);

  const startDataRow = hasHeaderRow ? headerRowIndex + 1 : 0;
  const sampleDataRows: string[][] = [];
  for (let i = startDataRow; i < Math.min(rawLines.length, startDataRow + 10); i++) {
    sampleDataRows.push(parseCsvLine(rawLines[i], delimiter));
  }

  // 2. Smart heuristics if key columns are missing
  if (sampleDataRows.length > 0) {
    const numCols = Math.max(...sampleDataRows.map(r => r.length));

    // Guess kva column if missing
    if (kvaIdx === -1) {
      for (let c = 0; c < numCols; c++) {
        if (c === peaIdx || c === nameIdx) continue;
        const matches = sampleDataRows.filter(row => {
          const val = Number((row[c] || '').replace(/[^0-9.]/g, ''));
          return COMMON_KVA_RATINGS.has(val) || (val >= 10 && val <= 3000);
        });
        if (matches.length >= Math.ceil(sampleDataRows.length * 0.6)) {
          kvaIdx = c;
          break;
        }
      }
    }

    // Guess peaNo column if missing
    if (peaIdx === -1) {
      for (let c = 0; c < numCols; c++) {
        if (c === kvaIdx || c === nameIdx) continue;
        const matches = sampleDataRows.filter(row => {
          const val = (row[c] || '').trim();
          return /^\d{2}-\d{6}$/.test(val) || /^\d{8,10}$/.test(val) || /^TR-/i.test(val);
        });
        if (matches.length >= Math.ceil(sampleDataRows.length * 0.5)) {
          peaIdx = c;
          break;
        }
      }
    }

    // Guess name column if missing
    if (nameIdx === -1) {
      for (let c = 0; c < numCols; c++) {
        if (c === peaIdx || c === kvaIdx || c === idIdx) continue;
        const matches = sampleDataRows.filter(row => {
          const val = (row[c] || '').trim();
          return val.length > 2 && isNaN(Number(val));
        });
        if (matches.length >= Math.ceil(sampleDataRows.length * 0.5)) {
          nameIdx = c;
          break;
        }
      }
    }

    // Guess Lat / Lng if missing
    if (latIdx === -1 || lngIdx === -1) {
      for (let c = 0; c < numCols; c++) {
        if (c === kvaIdx || c === peaIdx || c === nameIdx) continue;
        const numMatches = sampleDataRows.map(r => Number(r[c] || 0)).filter(n => !isNaN(n) && n > 0);
        if (numMatches.length >= Math.ceil(sampleDataRows.length * 0.5)) {
          const avg = numMatches.reduce((a, b) => a + b, 0) / numMatches.length;
          if (avg >= 5 && avg <= 21 && latIdx === -1) {
            latIdx = c;
          } else if (avg >= 97 && avg <= 106 && lngIdx === -1) {
            lngIdx = c;
          }
        }
      }
    }
  }

  const transformers: Transformer[] = [];
  const seenIds = new Set<string>();

  for (let i = startDataRow; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue;
    const values = parseCsvLine(line, delimiter);
    if (values.length === 0 || values.every(v => !v)) continue;

    let rawPea = peaIdx >= 0 && values[peaIdx] ? values[peaIdx].trim() : '';
    let rawName = nameIdx >= 0 && values[nameIdx] ? values[nameIdx].trim() : '';
    let rawKvaStr = kvaIdx >= 0 && values[kvaIdx] ? values[kvaIdx].trim() : '';

    let kva = Number(rawKvaStr.replace(/[^0-9.]/g, '')) || 0;

    const isKvaValid = (n: number) => COMMON_KVA_RATINGS.has(n) || (n >= 10 && n <= 3000);

    // Smart Column Misalignment Auto-Correction:
    // If kVA is invalid/default or rawKvaStr looks like an ID (e.g. "TR-1") and rawName is a valid kVA rating
    const nameAsNumber = Number(rawName);
    if ((!isKvaValid(kva) || kva === 50) && isKvaValid(nameAsNumber)) {
      kva = nameAsNumber;
      if (/^TR-|\d{2}-\d{6}/i.test(rawKvaStr)) {
        rawPea = rawKvaStr;
      }
      if (rawPea && (/[ก-๙]|7-11|บ้าน|วัด|อบต|รร\.|ม\./i.test(rawPea) || rawPea.includes(' ') || rawPea.length > 8)) {
        rawName = rawPea;
        rawPea = `TR-${i + 1}`;
      } else if (!rawName || rawName === String(kva)) {
        rawName = `หม้อแปลง ${rawPea || i + 1}`;
      }
    }

    // If kva is still invalid, check other columns for standard kVA numbers
    if (!isKvaValid(kva)) {
      for (let c = 0; c < values.length; c++) {
        if (c === peaIdx || c === nameIdx) continue;
        const candidateNum = Number((values[c] || '').replace(/[^0-9.]/g, ''));
        if (isKvaValid(candidateNum)) {
          kva = candidateNum;
          break;
        }
      }
    }
    if (kva === 0) kva = 50;

    // Scan other columns for proper PEA number if rawPea is missing or looks like a placeholder
    if (!rawPea || rawPea.startsWith('TR-')) {
      for (let c = 0; c < values.length; c++) {
        if (c === kvaIdx || c === nameIdx) continue;
        const val = (values[c] || '').trim();
        if (/^\d{2}-\d{6}$/.test(val) || /^\d{8,10}$/.test(val)) {
          rawPea = val;
          break;
        }
      }
    }

    // Finalize peaNo and name
    const peaNo = rawPea || `TR-${i + 1}`;
    const name = rawName || `หม้อแปลง ${peaNo}`;

    // Type detection
    let type: 'public' | 'private' = 'public';
    if (typeIdx >= 0 && values[typeIdx]) {
      const typeStr = values[typeIdx].toLowerCase();
      if (
        typeStr.includes('private') ||
        typeStr.includes('เฉพาะ') ||
        typeStr.includes('ทึบ') ||
        typeStr.includes('ดำ') ||
        typeStr.includes('ลูกค้า')
      ) {
        type = 'private';
      }
    }

    // Phase detection
    let phase: '1P' | '2x1P' | '3P' | 'AC' = '3P';
    if (phaseIdx >= 0 && values[phaseIdx]) {
      const pStr = values[phaseIdx].toLowerCase();
      if (pStr.includes('2x1') || pStr.includes('2*1')) phase = '2x1P';
      else if (pStr.includes('1p') || pStr.includes('1ø') || pStr.includes('1 เฟส')) phase = '1P';
      else if (pStr.includes('ac')) phase = 'AC';
      else phase = '3P';
    }

    // Voltage
    const voltage = (voltageIdx >= 0 && values[voltageIdx])
      ? (values[voltageIdx].includes('33') ? '33 kV' : '22 kV')
      : '22 kV';

    // Feeder & Branch
    const feeder = feederIdx >= 0 && values[feederIdx] ? values[feederIdx].trim() : 'ไลน์สวนดอก';
    const branch = branchIdx >= 0 && values[branchIdx] ? values[branchIdx].trim() : '';
    const poleNo = poleIdx >= 0 && values[poleIdx] ? values[poleIdx].trim() : '';

    // Coordinates
    const x = xIdx >= 0 && values[xIdx] && !isNaN(Number(values[xIdx])) ? Number(values[xIdx]) : 0;
    const y = yIdx >= 0 && values[yIdx] && !isNaN(Number(values[yIdx])) ? Number(values[yIdx]) : 0;

    // GPS Lat / Lng with auto inversion check
    let latVal = latIdx >= 0 && values[latIdx] ? Number(values[latIdx].trim()) : undefined;
    let lngVal = lngIdx >= 0 && values[lngIdx] ? Number(values[lngIdx].trim()) : undefined;

    if (latVal !== undefined && lngVal !== undefined && !isNaN(latVal) && !isNaN(lngVal)) {
      if (latVal > 30 && lngVal < 30) {
        const temp = latVal;
        latVal = lngVal;
        lngVal = temp;
      }
    }

    let rawAssignedId = idIdx >= 0 && values[idIdx] && values[idIdx].trim().length > 0
      ? values[idIdx].trim()
      : `tr-imported-${i + 1}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    
    // Ensure uniqueness across imported batch
    if (seenIds.has(rawAssignedId)) {
      rawAssignedId = `${rawAssignedId}-dup-${i + 1}-${Math.random().toString(36).substring(2, 6)}`;
    }
    seenIds.add(rawAssignedId);

    transformers.push({
      id: rawAssignedId,
      peaNo,
      name,
      kva,
      type,
      phase,
      voltage,
      feeder,
      branch,
      poleNo: poleNo || undefined,
      x,
      y,
      orientation: orientIdx >= 0 && values[orientIdx] ? (values[orientIdx].trim() as any) : 'left',
      latitude: latVal && !isNaN(latVal) ? latVal : undefined,
      longitude: lngVal && !isNaN(lngVal) ? lngVal : undefined,
      notes: notesIdx >= 0 && values[notesIdx] ? values[notesIdx].trim() : ''
    });
  }

  return ensureTransformersHaveValidPositions(transformers);
}
