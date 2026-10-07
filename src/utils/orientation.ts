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
 */
export function transformTransformerOrientation(
  orientation?: 'left' | 'right' | 'top' | 'bottom',
  toOrientation: DiagramOrientation = 'landscape'
): 'left' | 'right' | 'top' | 'bottom' {
  if (toOrientation === 'landscape') {
    switch (orientation) {
      case 'left': return 'top';
      case 'right': return 'bottom';
      case 'top': return 'right';
      case 'bottom': return 'left';
      default: return 'top';
    }
  } else {
    switch (orientation) {
      case 'top': return 'left';
      case 'bottom': return 'right';
      case 'right': return 'top';
      case 'left': return 'bottom';
      default: return 'left';
    }
  }
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
      orientation: transformTransformerOrientation(t.orientation, 'landscape')
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
