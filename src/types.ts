export type TransformerType = 'public' | 'private'; // public = สามเหลี่ยมโปร่ง (จำหน่ายทั่วไป), private = สามเหลี่ยมทึบ (เฉพาะราย)

export interface Transformer {
  id: string;
  peaNo: string; // เช่น "54-003396", "66-001009"
  name: string; // เช่น "สวนดอก 1", "สำนักงานฝาง"
  kva: number; // เช่น 30, 50, 100, 160, 250
  type: TransformerType;
  phase?: '1P' | '3P' | 'AC';
  voltage?: string; // เช่น "22 kV", "33 kV"
  feeder: string; // เช่น "ไลน์สวนดอก", "สายป้อน 3", "FAA-06"
  branch?: string; // เช่น "สายเมน เชียงใหม่-ฝาง", "บ้านห้วยบอน", "สันทรายคลองน้อย"
  x: number; // canvas coordinate X
  y: number; // canvas coordinate Y
  orientation?: 'left' | 'right' | 'top' | 'bottom'; // ทิศทางของสัญลักษณ์หม้อแปลง
  stemDirection?: 'top' | 'bottom' | 'left' | 'right' | 'none'; // ทิศทางของเส้นที่ออกมาจากสัญลักษณ์หม้อแปลง (4 ทิศ: บน, ล่าง, ซ้าย, ขวา หรือไม่มีเส้น)
  textPosition?: 'auto' | 'right' | 'left' | 'top' | 'bottom'; // ตำแหน่งข้อความ (ขวา, ซ้าย, บน, ล่าง)
  notes?: string;
  poleNo?: string; // เลขเสา (ถ้ามี)
  latitude?: number; // พิกัดละติจูด (Lat) เช่น 19.917456
  longitude?: number; // พิกัดลองจิจูด (Long) เช่น 99.214532
  installDate?: string;
  meterCount?: number;
  status?: 'active' | 'maintenance' | 'inactive';
}

export type SwitchType = 'ABS' | 'FUSE' | 'RECLOSER' | 'SECTIONALIZER' | 'DISCONNECT' | 'FEEDER_TAG' | 'SUBSTATION' | 'CROSS_BOX';

export interface SwitchNode {
  id: string;
  code: string; // เช่น "3S-05", "8F-07", "6S-05", "FAA-06", "SUBSTATION"
  name?: string;
  type: SwitchType;
  x: number;
  y: number;
  rotation?: number;
  status?: 'closed' | 'opened';
  feeder?: string;
}

export interface FeederPath {
  id: string;
  name?: string;
  points: { x: number; y: number }[];
  style?: 'solid' | 'dashed';
  color?: string;
  strokeWidth?: number;
  label?: string;
}

export interface AnnotationLabel {
  id: string;
  text: string;
  subText?: string;
  x: number;
  y: number;
  orientation?: 'horizontal' | 'vertical';
  type?: 'road' | 'location' | 'feeder_title' | 'terminal';
  color?: string;
  fontSize?: number;
}

export interface GoogleSheetConfig {
  sheetUrl?: string;
  webAppUrl?: string; // Apps Script Web App Endpoint for full 2-way sync
  csvUrl?: string;
  autoSync?: boolean;
  syncIntervalMin?: number;
  lastSyncedAt?: string;
  syncStatus?: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage?: string;
}

export interface DiagramSheet {
  id: string;
  sheetNo: string; // เช่น "(1)", "(2)", "หน้า 1", "หน้า 2"
  title: string; // เช่น "ไลน์สวนดอก", "ไลน์แม่สูน", "ไลน์ฝาง 2"
  feederCode?: string; // เช่น "FAA-06", "FAA-07"
  substation?: string; // เช่น "สถานีไฟฟ้าฝาง"
  description?: string;
  transformers: Transformer[];
  switches: SwitchNode[];
  feederPaths: FeederPath[];
  annotations: AnnotationLabel[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DiagramData {
  title: string;
  subtitle: string;
  sheetNo: string; // เช่น "(1)"
  lastUpdated: string;
  transformers: Transformer[];
  switches: SwitchNode[];
  feederPaths: FeederPath[];
  annotations: AnnotationLabel[];
}
