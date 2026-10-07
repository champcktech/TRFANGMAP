import { DiagramData, Transformer, SwitchNode, FeederPath, AnnotationLabel } from '../types';

export const INITIAL_TRANSFORMERS: Transformer[] = [];

export const INITIAL_SWITCHES: SwitchNode[] = [
  { id: 'sw-01', code: '3S-05', type: 'ABS', x: 530, y: 215, feeder: 'ไลน์สวนดอก' },
  { id: 'sw-02', code: '8F-07', type: 'FUSE', x: 670, y: 320, feeder: 'บ้านห้วยบอน' },
  { id: 'sw-03', code: '6S-05', type: 'ABS', x: 395, y: 300, feeder: 'ไลน์สวนดอก' },
  { id: 'sw-04', code: '6S-06', type: 'ABS', x: 375, y: 300, feeder: 'ไลน์สวนดอก' },
  { id: 'sw-05', code: '6S-07', type: 'ABS', x: 310, y: 330, feeder: 'ไลน์สวนดอก' },
  { id: 'sw-06', code: '7S-05', type: 'ABS', x: 350, y: 355, feeder: 'ไลน์สวนดอก' },
  { id: 'sw-07', code: '6S-08', type: 'ABS', x: 370, y: 355, feeder: 'ไลน์สวนดอก' },
  { id: 'sw-08', code: '8S-08', type: 'ABS', x: 415, y: 710, feeder: 'ไลน์สวนดอก' },
  { id: 'sw-09', code: '8F-07', type: 'FUSE', x: 865, y: 675, feeder: 'บ้านห้วยบอน' },
  { id: 'sw-10', code: 'FAA-06', type: 'FEEDER_TAG', x: 840, y: 140 },
  { id: 'sw-11', code: 'FAA-03', type: 'FEEDER_TAG', x: 860, y: 140 },
  { id: 'sw-12', code: 'FAA-07', type: 'FEEDER_TAG', x: 390, y: 940 },
  { id: 'sw-13', code: 'FAA-08', type: 'FEEDER_TAG', x: 410, y: 940 },
  { id: 'sw-14', code: 'FAA-09', type: 'FEEDER_TAG', x: 160, y: 765 },
  // Substation / Crossover Junction Nodes (กล่องสัญลักษณ์สถานีไฟฟ้าย่อย / จุดเชื่อมต่อ)
  { id: 'sw-sub-01', code: 'SUB', type: 'SUBSTATION', x: 654, y: 302, name: 'สถานีไฟฟ้าย่อย / จุดเชื่อมโยง 1 (ด้านบน)' },
  { id: 'sw-sub-02', code: 'SUB', type: 'SUBSTATION', x: 624, y: 687, name: 'สถานีไฟฟ้าย่อย / จุดเชื่อมโยง 2 (กลางขวา)' },
  { id: 'sw-sub-03', code: 'CROSS', type: 'CROSS_BOX', x: 795, y: 803, name: 'กล่องจุดตัดสายส่ง (ล่างขวา)' }
];

export const INITIAL_FEEDER_PATHS: FeederPath[] = [
  // 1. Top branch coming from (P3)
  {
    id: 'path-top-p3',
    name: 'สายแยก P3 ด้านบน',
    points: [
      { x: 540, y: 120 },
      { x: 540, y: 215 },
      { x: 860, y: 215 }
    ],
    color: '#000000',
    strokeWidth: 2.5
  },
  // 2. Main Central Trunk: ถนนสาย เชียงใหม่ - ฝาง
  {
    id: 'path-main-trunk',
    name: 'สายเมนหลัก ถนนเชียงใหม่-ฝาง',
    points: [
      { x: 390, y: 230 },
      { x: 390, y: 800 },
      { x: 400, y: 800 },
      { x: 400, y: 935 }
    ],
    color: '#000000',
    strokeWidth: 3
  },
  // 3. Central sub branch upper
  {
    id: 'path-trunk-upper',
    name: 'สายแยกเข้า 8F-07 ด้านบน',
    points: [
      { x: 540, y: 215 },
      { x: 580, y: 215 },
      { x: 580, y: 320 },
      { x: 670, y: 320 }
    ],
    color: '#000000',
    strokeWidth: 2
  },
  // 4. Branch to 3S-05 & Left trunk
  {
    id: 'path-3s05-link',
    name: 'สายเชื่อมสวิตช์ 3S-05',
    points: [
      { x: 540, y: 215 },
      { x: 390, y: 215 },
      { x: 390, y: 300 }
    ],
    color: '#000000',
    strokeWidth: 2.5
  },
  // 5. Left branch (ต้นหนุน)
  {
    id: 'path-left-tonnoon',
    name: 'สายแยกต้นหนุน (บน)',
    points: [
      { x: 310, y: 330 },
      { x: 250, y: 330 },
      { x: 250, y: 170 },
      { x: 190, y: 170 },
      { x: 190, y: 200 }
    ],
    color: '#000000',
    strokeWidth: 2
  },
  {
    id: 'path-left-branch-2',
    name: 'สายแยกต้นหนุน 2 (สายยาว)',
    points: [
      { x: 250, y: 275 },
      { x: 100, y: 275 },
      { x: 100, y: 640 }
    ],
    color: '#000000',
    strokeWidth: 2
  },
  {
    id: 'path-left-branch-3',
    name: 'สายแยกต้นหนุน 3',
    points: [
      { x: 250, y: 355 },
      { x: 100, y: 355 }
    ],
    color: '#000000',
    strokeWidth: 2
  },
  {
    id: 'path-left-branch-4',
    name: 'สายแยกหนองโฮ้ง',
    points: [
      { x: 250, y: 475 },
      { x: 180, y: 475 }
    ],
    color: '#000000',
    strokeWidth: 2
  },
  {
    id: 'path-left-branch-5',
    name: 'สายแยกสันทราย',
    points: [
      { x: 250, y: 635 },
      { x: 100, y: 635 }
    ],
    color: '#000000',
    strokeWidth: 2
  },
  // 6. Lower Left terminal branch -> ไป บ.สันทรายคลองน้อย (P13)
  {
    id: 'path-terminal-p13',
    name: 'สายเชื่อม FAA-09 ไป บ.สันทรายคลองน้อย',
    points: [
      { x: 390, y: 740 },
      { x: 250, y: 740 },
      { x: 250, y: 810 },
      { x: 150, y: 810 }
    ],
    color: '#000000',
    strokeWidth: 2.5
  },
  // 7. Middle branch (อำเภอฝาง)
  {
    id: 'path-district-branch',
    name: 'สายแยกอำเภอฝาง',
    points: [
      { x: 390, y: 540 },
      { x: 280, y: 540 }
    ],
    color: '#000000',
    strokeWidth: 2
  },
  // 8. Right branch (บ้านห้วยบอน / ภูมณี)
  {
    id: 'path-huaybon-main',
    name: 'สายแยกบ้านห้วยบอนหลัก',
    points: [
      { x: 670, y: 320 },
      { x: 740, y: 320 },
      { x: 740, y: 490 },
      { x: 800, y: 490 },
      { x: 800, y: 590 }
    ],
    color: '#000000',
    strokeWidth: 2.5
  },
  {
    id: 'path-huaybon-lower',
    name: 'สายแยกโรงแรมภูมณี - บ้านห้วยบอนใต้',
    points: [
      { x: 390, y: 640 },
      { x: 520, y: 640 },
      { x: 520, y: 675 },
      { x: 865, y: 675 },
      { x: 865, y: 800 }
    ],
    color: '#000000',
    strokeWidth: 2.5
  },
  {
    id: 'path-huaybon-sub-1',
    name: 'สายแยกสันลมจอย',
    points: [
      { x: 740, y: 390 },
      { x: 820, y: 390 }
    ],
    color: '#000000',
    strokeWidth: 2
  },
  {
    id: 'path-huaybon-sub-2',
    name: 'สายแยกบ้านเทิม',
    points: [
      { x: 740, y: 240 },
      { x: 820, y: 240 },
      { x: 820, y: 270 }
    ],
    color: '#000000',
    strokeWidth: 2
  },
  {
    id: 'path-huaybon-sub-3',
    name: 'สายแยกหนองช้างเปียง',
    points: [
      { x: 790, y: 725 },
      { x: 650, y: 725 },
      { x: 650, y: 775 }
    ],
    color: '#000000',
    strokeWidth: 2
  },
  {
    id: 'path-bottom-end',
    name: 'สายปลายไลน์สวนดอก (ด้านล่าง)',
    points: [
      { x: 400, y: 860 },
      { x: 450, y: 860 },
      { x: 450, y: 890 },
      { x: 530, y: 890 }
    ],
    color: '#000000',
    strokeWidth: 2
  }
];

export const INITIAL_ANNOTATIONS: AnnotationLabel[] = [
  {
    id: 'lbl-title-doc',
    text: '(1) ผังหม้อแปลง ไลน์สวนดอก',
    x: 120,
    y: 120,
    orientation: 'horizontal',
    type: 'feeder_title',
    fontSize: 20
  },
  {
    id: 'lbl-road-main',
    text: 'ถนนสาย เชียงใหม่ - ฝาง',
    x: 490,
    y: 450,
    orientation: 'horizontal',
    type: 'road',
    color: '#1d4ed8',
    fontSize: 16
  },
  {
    id: 'lbl-road-huaybon',
    text: 'บ้านห้วยบอน',
    x: 685,
    y: 735,
    orientation: 'horizontal',
    type: 'road',
    color: '#1d4ed8',
    fontSize: 16
  },
  {
    id: 'lbl-terminal-p13',
    text: 'ไป บ.สันทรายคลองน้อย (P13)',
    x: 160,
    y: 840,
    orientation: 'vertical',
    type: 'terminal',
    color: '#1d4ed8',
    fontSize: 14
  },
  {
    id: 'lbl-tag-p3-top',
    text: '(P3)',
    x: 540,
    y: 95,
    orientation: 'horizontal',
    type: 'terminal',
    color: '#2563eb',
    fontSize: 14
  },
  {
    id: 'lbl-tag-p3-right',
    text: '(P3)',
    x: 850,
    y: 95,
    orientation: 'horizontal',
    type: 'terminal',
    color: '#2563eb',
    fontSize: 14
  },
  {
    id: 'lbl-tag-p3-midright',
    text: '(P3)',
    x: 890,
    y: 670,
    orientation: 'horizontal',
    type: 'terminal',
    color: '#2563eb',
    fontSize: 14
  },
  {
    id: 'lbl-tag-p2-botright',
    text: '(P2)',
    x: 835,
    y: 880,
    orientation: 'horizontal',
    type: 'terminal',
    color: '#2563eb',
    fontSize: 14
  },
  {
    id: 'lbl-tag-p2-bot',
    text: '(P2)',
    x: 395,
    y: 970,
    orientation: 'horizontal',
    type: 'terminal',
    color: '#2563eb',
    fontSize: 14
  },
  {
    id: 'lbl-tag-p7',
    text: '(P7)',
    x: 390,
    y: 220,
    orientation: 'horizontal',
    type: 'terminal',
    color: '#2563eb',
    fontSize: 14
  }
];

export const INITIAL_DIAGRAM_DATA: DiagramData = {
  title: 'ผังหม้อแปลง กฟส.ฝาง',
  subtitle: 'การไฟฟ้าส่วนภูมิภาคสาขาอำเภอฝาง (PEA FANG)',
  sheetNo: '(1)',
  lastUpdated: new Date().toISOString(),
  transformers: INITIAL_TRANSFORMERS,
  switches: INITIAL_SWITCHES,
  feederPaths: INITIAL_FEEDER_PATHS,
  annotations: INITIAL_ANNOTATIONS
};
