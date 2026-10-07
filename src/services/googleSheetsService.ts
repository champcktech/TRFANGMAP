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

export function parseCsvToTransformers(csvText: string): Transformer[] {
  let cleanCsv = csvText.replace(/^\uFEFF/, '').trim();
  if (!cleanCsv) return [];

  const lines = cleanCsv.split(/\r?\n/);
  if (lines.length <= 1) return [];

  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map(h => h.trim().toLowerCase());

  const getIdx = (candidates: string[]) => {
    return headers.findIndex(h => candidates.some(c => h === c.toLowerCase() || h.includes(c.toLowerCase())));
  };

  const idIdx = getIdx(['id']);
  const peaIdx = getIdx(['peano', 'pea_no', 'peano.', 'รหัสหม้อแปลง', 'รหัส', 'peacode']);
  const nameIdx = getIdx(['name', 'ชื่อ', 'สถานที่', 'ผู้ใช้ไฟ', 'location']);
  const kvaIdx = getIdx(['kva', 'ขนาด', 'ขนาดkva', 'capacity', 'kw']);
  const typeIdx = getIdx(['type', 'ประเภท', 'สามเหลี่ยม']);
  const phaseIdx = getIdx(['phase', 'เฟส']);
  const voltageIdx = getIdx(['voltage', 'แรงดัน']);
  const feederIdx = getIdx(['feeder', 'สายป้อน']);
  const branchIdx = getIdx(['branch', 'สายแยก', 'สาขา']);
  const xIdx = getIdx(['x', 'coord_x', 'pos_x']);
  const yIdx = getIdx(['y', 'coord_y', 'pos_y']);
  const orientIdx = getIdx(['orientation', 'ทิศทาง']);
  const latIdx = getIdx(['latitude', 'lat', 'ละติจูด', 'พิกัดlat', 'พิกัดละติจูด']);
  const lngIdx = getIdx(['longitude', 'lng', 'long', 'ลองจิจูด', 'พิกัดlong', 'พิกัดลองจิจูด']);
  const notesIdx = getIdx(['notes', 'หมายเหตุ', 'remark']);

  const transformers: Transformer[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCsvLine(line);

    const peaNo = peaIdx >= 0 && values[peaIdx] ? values[peaIdx].trim() : `TR-${i}`;
    const name = nameIdx >= 0 && values[nameIdx] ? values[nameIdx].trim() : 'หม้อแปลงใหม่';
    const kva = kvaIdx >= 0 && values[kvaIdx] ? Number(values[kvaIdx].replace(/[^0-9.]/g, '')) || 50 : 50;
    
    let type: 'public' | 'private' = 'public';
    if (typeIdx >= 0 && values[typeIdx]) {
      const typeStr = values[typeIdx].toLowerCase();
      if (typeStr.includes('private') || typeStr.includes('เฉพาะ') || typeStr.includes('ทึบ') || typeStr.includes('ดำ')) {
        type = 'private';
      }
    }

    const x = xIdx >= 0 && values[xIdx] && !isNaN(Number(values[xIdx])) ? Number(values[xIdx]) : 0;
    const y = yIdx >= 0 && values[yIdx] && !isNaN(Number(values[yIdx])) ? Number(values[yIdx]) : 0;
    
    const latVal = latIdx >= 0 && values[latIdx] ? Number(values[latIdx].trim()) : undefined;
    const lngVal = lngIdx >= 0 && values[lngIdx] ? Number(values[lngIdx].trim()) : undefined;

    transformers.push({
      id: idIdx >= 0 && values[idIdx] ? values[idIdx].trim() : `tr-imported-${i}-${Date.now()}`,
      peaNo,
      name,
      kva,
      type,
      phase: (phaseIdx >= 0 && values[phaseIdx] ? values[phaseIdx].trim() as any : '3P'),
      voltage: (voltageIdx >= 0 && values[voltageIdx] ? values[voltageIdx].trim() : '22 kV'),
      feeder: feederIdx >= 0 && values[feederIdx] ? values[feederIdx].trim() : 'ไลน์สวนดอก',
      branch: branchIdx >= 0 && values[branchIdx] ? values[branchIdx].trim() : '',
      x,
      y,
      orientation: (orientIdx >= 0 && values[orientIdx] ? values[orientIdx].trim() as any : 'left'),
      latitude: latVal && !isNaN(latVal) ? latVal : undefined,
      longitude: lngVal && !isNaN(lngVal) ? lngVal : undefined,
      notes: notesIdx >= 0 && values[notesIdx] ? values[notesIdx].trim() : ''
    });
  }

  return ensureTransformersHaveValidPositions(transformers);
}

function parseCsvLine(text: string): string[] {
  if (text.includes('\t') && !text.includes(',')) {
    return text.split('\t').map(v => v.trim().replace(/^"(.*)"$/, '$1'));
  }

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
    } else if ((c === ',' || c === '\t') && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}
