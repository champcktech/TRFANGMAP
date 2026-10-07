import { Transformer, SwitchNode, FeederPath, AnnotationLabel } from '../types';

export type DiagramOrientation = 'landscape' | 'portrait';

/**
 * แปลงพิกัดจากแนวตั้ง (Portrait) เป็นแนวนอน (Landscape)
 * สายเมนหลักที่เคยวิ่งแนวตั้งจากบนลงล่าง (Y: 100 -> 950)
 * จะถูกหมุนและขยายให้วิ่งแนวนอนจากซ้ายไปขวา (X: 120 -> 1800)
 */
export function transformPointToLandscape(x: number, y: number): { x: number; y: number } {
  const newX = Math.round((y - 80) * 1.95 + 100);
  const newY = Math.round(420 + (x - 520) * 0.85);
  return { x: newX, y: newY };
}

/**
 * แปลงพิกัดจากแนวนอน (Landscape) เป็นแนวตั้ง (Portrait)
 */
export function transformPointToPortrait(x: number, y: number): { x: number; y: number } {
  const newY = Math.round((x - 100) / 1.95 + 80);
  const newX = Math.round(520 + (y - 420) / 0.85);
  return { x: newX, y: newY };
}

/**
 * แปลงทิศทางสัญลักษณ์หม้อแปลงเมื่อหมุนผัง
 * คงค่าทิศทางจริงตามที่ผู้ใช้กำหนด (บน, ล่าง, ซ้าย, ขวา) ไม่หมุนทิศทางซ้ำซ้อน
 */
export function transformTransformerOrientation(
  orientation?: 'left' | 'right' | 'top' | 'bottom',
  _toOrientation: DiagramOrientation = 'landscape'
): 'left' | 'right' | 'top' | 'bottom' {
  return orientation || 'top';
}

/**
 * คำนวณพิกัดรูปทรงสามเหลี่ยมและเส้นก้านต่อสายที่ออกมาจากสัญลักษณ์หม้อแปลง 4 ทิศ
 */
export function getTransformerGeometry(
  orientation: 'left' | 'right' | 'top' | 'bottom' = 'top',
  stemDirection?: 'top' | 'bottom' | 'left' | 'right' | 'none'
): {
  triPoints: string;
  stemLine: { x1: number; y1: number; x2: number; y2: number } | null;
  effStemDir: 'top' | 'bottom' | 'left' | 'right' | 'none';
} {
  let triPoints = "0,-14 12,10 -12,10";
  if (orientation === 'left') {
    triPoints = "-14,0 10,-12 10,12";
  } else if (orientation === 'right') {
    triPoints = "14,0 -10,-12 -10,12";
  } else if (orientation === 'top') {
    triPoints = "0,-14 12,10 -12,10";
  } else if (orientation === 'bottom') {
    triPoints = "0,14 12,-10 -12,-10";
  }

  const effStemDir: 'top' | 'bottom' | 'left' | 'right' | 'none' = stemDirection !== undefined ? stemDirection : (
    orientation === 'top' ? 'bottom' :
    orientation === 'bottom' ? 'top' :
    orientation === 'left' ? 'right' : 'left'
  );

  let stemLine: { x1: number; y1: number; x2: number; y2: number } | null = null;
  if (effStemDir === 'top') {
    stemLine = { x1: 0, y1: 0, x2: 0, y2: -25 };
  } else if (effStemDir === 'bottom') {
    stemLine = { x1: 0, y1: 0, x2: 0, y2: 25 };
  } else if (effStemDir === 'left') {
    stemLine = { x1: 0, y1: 0, x2: -25, y2: 0 };
  } else if (effStemDir === 'right') {
    stemLine = { x1: 0, y1: 0, x2: 25, y2: 0 };
  } else if (effStemDir === 'none') {
    stemLine = null;
  }

  return { triPoints, stemLine, effStemDir };
}

/**
 * แปลงข้อมูลชุดอุปกรณ์ทั้งหมดเป็นแนวนอน
 */
export function transformDataToLandscape(
  transformers: Transformer[],
  switches: SwitchNode[],
  feederPaths: FeederPath[],
  annotations: AnnotationLabel[]
): {
  transformers: Transformer[];
  switches: SwitchNode[];
  feederPaths: FeederPath[];
  annotations: AnnotationLabel[];
} {
  const trans = transformers.map(t => {
    const { x, y } = transformPointToLandscape(t.x, t.y);
    return {
      ...t,
      x,
      y,
      orientation: t.orientation || 'top'
    };
  });

  const sws = switches.map(s => {
    const { x, y } = transformPointToLandscape(s.x, s.y);
    return {
      ...s,
      x,
      y,
      rotation: s.rotation === 90 ? 0 : (s.rotation === 0 ? 90 : s.rotation)
    };
  });

  const paths = feederPaths.map(p => ({
    ...p,
    points: p.points.map(pt => transformPointToLandscape(pt.x, pt.y))
  }));

  const annos = annotations.map(a => {
    const { x, y } = transformPointToLandscape(a.x, a.y);
    return {
      ...a,
      x,
      y,
      orientation: a.orientation || 'horizontal'
    };
  });

  return {
    transformers: trans,
    switches: sws,
    feederPaths: paths,
    annotations: annos
  };
}
