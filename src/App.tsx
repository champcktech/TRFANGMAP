import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Transformer, 
  SwitchNode, 
  FeederPath, 
  AnnotationLabel, 
  GoogleSheetConfig,
  DiagramSheet
} from './types';
import { 
  INITIAL_TRANSFORMERS, 
  INITIAL_SWITCHES, 
  INITIAL_FEEDER_PATHS, 
  INITIAL_ANNOTATIONS 
} from './data/initialDiagramData';
import { Navbar } from './components/Navbar';
import { SheetTabs } from './components/SheetTabs';
import { SheetModal } from './components/SheetModal';
import { TransformerCanvas } from './components/TransformerCanvas';
import { TransformerTableView } from './components/TransformerTableView';
import { StatisticsPanel } from './components/StatisticsPanel';
import { TransformerModal } from './components/TransformerModal';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { TransformerDetailDrawer } from './components/TransformerDetailDrawer';
import { LineEditorDrawer } from './components/LineEditorDrawer';
import { SwitchDrawer } from './components/SwitchDrawer';
import { AnnotationDrawer } from './components/AnnotationDrawer';
import { SwitchModal } from './components/SwitchModal';
import { AnnotationModal } from './components/AnnotationModal';
import { PrintModal } from './components/PrintModal';
import { ShareModal } from './components/ShareModal';
import { CheckCircle2, AlertCircle, Info, Undo2 } from 'lucide-react';

import { decodeSheetsFromPayload } from './utils/shareUtils';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { saveSheetsToCloudFirestore, fetchSheetsFromCloudFirestore } from './services/firebaseDbService';

const STORAGE_KEY_SHEETS = 'pea_sld_all_sheets_v7_clean';
const STORAGE_KEY_ACTIVE_SHEET_ID = 'pea_sld_active_sheet_id_v7';
const STORAGE_KEY_SHEET_CONFIG = 'pea_sld_cloud_config_v2';
const STORAGE_KEY_THEME = 'pea_sld_theme_v1';
const STORAGE_KEY_CLEARED_CLOUD_TFS = 'pea_sld_cleared_all_transformers_v1';

// Legacy keys to clean up
const LEGACY_STORAGE_KEYS = [
  'pea_sld_all_sheets_v6',
  'pea_sld_sheet_config_v1',
  'pea_sld_transformers_v1',
  'pea_sld_switches_v1',
  'pea_sld_feeder_paths_v1',
  'pea_sld_annotations_v1'
];

function createDefaultPresetSheets(legacyTfs: Transformer[] = [], legacySwitches = INITIAL_SWITCHES, legacyPaths = INITIAL_FEEDER_PATHS, legacyAnnotations = INITIAL_ANNOTATIONS): DiagramSheet[] {
  const sheet1: DiagramSheet = {
    id: 'sheet-1',
    sheetNo: '(1)',
    title: 'กฟส.ฝาง (ไลน์สวนดอก)',
    feederCode: 'FAA-06',
    substation: 'สถานีไฟฟ้าฝาง',
    description: 'ผังหม้อแปลง กฟส.ฝาง (1) ไลน์สวนดอก - สายเมนเชียงใหม่-ฝาง',
    transformers: legacyTfs,
    switches: legacySwitches,
    feederPaths: legacyPaths,
    annotations: legacyAnnotations,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const sheet2: DiagramSheet = {
    id: 'sheet-2',
    sheetNo: '(2)',
    title: 'กฟส.ฝาง (ไลน์เวียงฝาง)',
    feederCode: 'FAA-04',
    substation: 'สถานีไฟฟ้าฝาง',
    description: 'ผังหม้อแปลง กฟส.ฝาง (2) ไลน์เวียงฝาง - ตลาดและชุมชน',
    transformers: [],
    switches: [
      {
        id: 'sw-wf-01',
        code: 'SW-WF01',
        name: 'สวิตช์แยกไลน์เวียงฝาง',
        type: 'DISCONNECT',
        status: 'closed',
        x: 550,
        y: 250,
        feeder: 'FAA-04'
      }
    ],
    feederPaths: [
      {
        id: 'path-wf-01',
        name: 'สายเมนเวียงฝาง',
        color: '#2563eb',
        strokeWidth: 3,
        points: [
          { x: 300, y: 250 },
          { x: 800, y: 250 }
        ]
      }
    ],
    annotations: [
      {
        id: 'lbl-wf-01',
        text: 'สถานีไฟฟ้าฝาง (FAA-04)',
        x: 290,
        y: 220,
        orientation: 'horizontal',
        type: 'feeder_title',
        color: '#dc2626',
        fontSize: 14
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const sheet3: DiagramSheet = {
    id: 'sheet-3',
    sheetNo: '(3)',
    title: 'กฟส.ฝาง (ไลน์แม่อาย-ท่าตอน)',
    feederCode: 'FAA-02',
    substation: 'สถานีไฟฟ้าฝาง',
    description: 'ผังหม้อแปลง กฟส.ฝาง (3) ไลน์แม่อาย-ท่าตอน',
    transformers: [],
    switches: [],
    feederPaths: [
      {
        id: 'path-ma-01',
        name: 'สายเมนท่าตอน',
        color: '#059669',
        strokeWidth: 3,
        points: [
          { x: 300, y: 300 },
          { x: 750, y: 300 }
        ]
      }
    ],
    annotations: [
      {
        id: 'lbl-ma-01',
        text: 'สถานีไฟฟ้าฝาง (FAA-02)',
        x: 290,
        y: 270,
        orientation: 'horizontal',
        type: 'feeder_title',
        color: '#059669',
        fontSize: 14
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return [sheet1, sheet2, sheet3];
}

function getInitialSheets(): DiagramSheet[] {
  // Clean up legacy storage keys that held old transformers or Google Sheets URLs
  try {
    if (typeof window !== 'undefined') {
      LEGACY_STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
    }
  } catch (e) {}

  // 1. Check if URL contains embedded share data (#data=... or ?data=...)
  try {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash && hash.includes('data=')) {
        const decoded = decodeSheetsFromPayload(hash);
        if (decoded && decoded.sheets.length > 0) {
          return decoded.sheets;
        }
      }
      if (search && search.includes('data=')) {
        const params = new URLSearchParams(search);
        const dataParam = params.get('data');
        if (dataParam) {
          const decoded = decodeSheetsFromPayload(dataParam);
          if (decoded && decoded.sheets.length > 0) {
            return decoded.sheets;
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse URL share payload', e);
  }

  // 2. Load from clean v7 localStorage
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SHEETS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load sheets from storage', e);
  }

  // 3. Fallback & presets (with 0 transformers)
  return createDefaultPresetSheets([], INITIAL_SWITCHES, INITIAL_FEEDER_PATHS, INITIAL_ANNOTATIONS);
}

function getInitialActiveSheetId(initialSheets: DiagramSheet[]): string {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sheetParam = params.get('sheet') || params.get('sheetId') || params.get('page') || params.get('sheetNo');
      if (sheetParam) {
        const match = initialSheets.find(s => 
          s.id === sheetParam || 
          s.sheetNo === sheetParam || 
          s.sheetNo === `(${sheetParam})` ||
          s.title.toLowerCase().includes(sheetParam.toLowerCase())
        );
        if (match) return match.id;
      }

      // Check hash for #sheet=... or payload
      const hash = window.location.hash;
      if (hash) {
        const hashMatch = hash.match(/sheet=([^&]+)/);
        if (hashMatch) {
          const targetId = decodeURIComponent(hashMatch[1]);
          const match = initialSheets.find(s => s.id === targetId || s.sheetNo === targetId);
          if (match) return match.id;
        }
        if (hash.includes('data=')) {
          const decoded = decodeSheetsFromPayload(hash);
          if (decoded?.activeSheetId && initialSheets.some(s => s.id === decoded.activeSheetId)) {
            return decoded.activeSheetId;
          }
        }
      }

      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_SHEET_ID);
      if (saved && initialSheets.some(s => s.id === saved)) return saved;
    }
  } catch (e) {}

  return initialSheets[0]?.id || 'sheet-1';
}

export default function App() {
  // --- Sheets & Document State ---
  const [sheets, setSheets] = useState<DiagramSheet[]>(getInitialSheets);
  const [activeSheetId, setActiveSheetId] = useState<string>(() => getInitialActiveSheetId(sheets));

  // Ensure active sheet exists
  const activeSheet = useMemo(() => {
    return sheets.find(s => s.id === activeSheetId) || sheets[0] || {
      id: 'sheet-1',
      sheetNo: '(1)',
      title: 'กฟส.ฝาง',
      transformers: [],
      switches: [],
      feederPaths: [],
      annotations: []
    };
  }, [sheets, activeSheetId]);

  // Direct access to active sheet components
  const transformers = activeSheet.transformers || [];
  const switches = activeSheet.switches || [];
  const feederPaths = activeSheet.feederPaths || [];
  const annotations = activeSheet.annotations || [];

  // Update active sheet items safely
  const updateActiveSheet = useCallback((updater: Partial<DiagramSheet> | ((prev: DiagramSheet) => Partial<DiagramSheet>)) => {
    setSheets(prevSheets => {
      return prevSheets.map(sheet => {
        if (sheet.id === activeSheet.id) {
          const updates = typeof updater === 'function' ? updater(sheet) : updater;
          return {
            ...sheet,
            ...updates,
            updatedAt: new Date().toISOString()
          };
        }
        return sheet;
      });
    });
  }, [activeSheet.id]);

  const setTransformers = useCallback((updater: Transformer[] | ((prev: Transformer[]) => Transformer[])) => {
    updateActiveSheet(sheet => ({
      transformers: typeof updater === 'function' ? updater(sheet.transformers || []) : updater
    }));
  }, [updateActiveSheet]);

  const setSwitches = useCallback((updater: SwitchNode[] | ((prev: SwitchNode[]) => SwitchNode[])) => {
    updateActiveSheet(sheet => ({
      switches: typeof updater === 'function' ? updater(sheet.switches || []) : updater
    }));
  }, [updateActiveSheet]);

  const setFeederPaths = useCallback((updater: FeederPath[] | ((prev: FeederPath[]) => FeederPath[])) => {
    updateActiveSheet(sheet => ({
      feederPaths: typeof updater === 'function' ? updater(sheet.feederPaths || []) : updater
    }));
  }, [updateActiveSheet]);

  const setAnnotations = useCallback((updater: AnnotationLabel[] | ((prev: AnnotationLabel[]) => AnnotationLabel[])) => {
    updateActiveSheet(sheet => ({
      annotations: typeof updater === 'function' ? updater(sheet.annotations || []) : updater
    }));
  }, [updateActiveSheet]);

  // Persist sheets in storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SHEETS, JSON.stringify(sheets));
    } catch (e) {}
  }, [sheets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_SHEET_ID, activeSheetId);
    } catch (e) {}
  }, [activeSheetId]);

  const [sheetConfig, setSheetConfig] = useState<GoogleSheetConfig>(() => {
    return {
      syncStatus: 'idle'
    };
  });

  const [theme, setTheme] = useState<'white' | 'blueprint' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved === 'blueprint' || saved === 'dark' || saved === 'white') return saved;
    } catch (e) {}
    return 'white';
  });

  // --- UI View & Interaction States ---
  const [currentView, setCurrentView] = useState<'canvas' | 'table' | 'stats'>('canvas');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKva, setFilterKva] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private'>('all');
  const [isDraggable, setIsDraggable] = useState(true);

  // Read-only share mode (auto-detected from URL or toggled by user)
  const [isReadOnly, setIsReadOnly] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'view' || params.get('readonly') === 'true' || params.get('view') === '1') {
        return true;
      }
      if (window.location.hash.includes('view') || window.location.hash.includes('readonly')) {
        return true;
      }
    } catch (e) {}
    return false;
  });

  const [selectedTransformer, setSelectedTransformer] = useState<Transformer | null>(null);
  const [selectedPath, setSelectedPath] = useState<FeederPath | null>(null);
  const [selectedSwitch, setSelectedSwitch] = useState<SwitchNode | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<AnnotationLabel | null>(null);

  const [editingTransformer, setEditingTransformer] = useState<Transformer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTransformerDefaultPos, setNewTransformerDefaultPos] = useState<{ x: number; y: number } | undefined>();

  const [editingSwitch, setEditingSwitch] = useState<SwitchNode | null>(null);
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [newSwitchDefaultPos, setNewSwitchDefaultPos] = useState<{ x: number; y: number } | undefined>();

  const [editingAnnotation, setEditingAnnotation] = useState<AnnotationLabel | null>(null);
  const [isAnnotationModalOpen, setIsAnnotationModalOpen] = useState(false);
  const [newAnnotationDefaultPos, setNewAnnotationDefaultPos] = useState<{ x: number; y: number } | undefined>();

  // Sheet Modal State
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [editingSheet, setEditingSheet] = useState<DiagramSheet | null>(null);

  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [cloudUser, setCloudUser] = useState<{ uid: string; email?: string | null; displayName?: string | null } | null>(null);
  const [isCloudAutoSync, setIsCloudAutoSync] = useState<boolean>(true);
  const [isCloudInitialLoaded, setIsCloudInitialLoaded] = useState<boolean>(false);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleToggleReadOnly = useCallback(() => {
    setIsReadOnly(prev => {
      const next = !prev;
      showToast(
        next ? 'เข้าสู่โหมดแสดงอย่างเดียว (Read-Only Mode) — สำหรับแชร์ให้คนอื่นดู' : 'เข้าสู่โหมดแก้ไขผังวงจร (Editor Mode)',
        'info'
      );
      return next;
    });
  }, [showToast]);

  const handleToggleDraggable = useCallback(() => {
    setIsDraggable(prev => {
      const next = !prev;
      showToast(
        next ? 'ปลดล็อคโหมดลากย้ายตำแหน่งแล้ว (คลิกลากอุปกรณ์ได้ทันที)' : 'ล็อคตำแหน่งผังวงจรแล้ว',
        'info'
      );
      return next;
    });
  }, [showToast]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SHEET_CONFIG, JSON.stringify(sheetConfig));
    } catch (e) {}
  }, [sheetConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch (e) {}
  }, [theme]);

  // Automatically load & sync shared Cloud Firestore data on mount (no login required)
  useEffect(() => {
    let isMounted = true;
    async function initSharedCloudDb() {
      try {
        const alreadyClearedCloud = localStorage.getItem(STORAGE_KEY_CLEARED_CLOUD_TFS) === 'true';
        const cloudSheets = await fetchSheetsFromCloudFirestore();

        if (!isMounted) return;

        if (!alreadyClearedCloud) {
          const baseSheets = cloudSheets.length > 0 ? cloudSheets : sheets;
          const cleanedSheets = baseSheets.map(s => ({
            ...s,
            transformers: [],
            updatedAt: new Date().toISOString()
          }));
          setSheets(cleanedSheets);
          await saveSheetsToCloudFirestore(cleanedSheets);
          localStorage.setItem(STORAGE_KEY_CLEARED_CLOUD_TFS, 'true');
        } else if (cloudSheets.length > 0) {
          setSheets(cloudSheets);
        } else {
          await saveSheetsToCloudFirestore(sheets);
        }
        if (isMounted) {
          setSheetConfig(prev => ({
            ...prev,
            lastSyncedAt: new Date().toLocaleTimeString('th-TH'),
            syncStatus: 'success'
          }));
        }
      } catch (err) {
        console.warn('Initial Cloud Firestore sync warning:', err);
      } finally {
        if (isMounted) {
          setIsCloudInitialLoaded(true);
        }
      }
    }

    initSharedCloudDb();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCloudUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        });
      } else {
        setCloudUser(null);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Debounced auto-save to shared Cloud Firestore when sheets change (no login required)
  useEffect(() => {
    if (!isCloudAutoSync || !isCloudInitialLoaded || isReadOnly) return;
    const timer = setTimeout(async () => {
      try {
        await saveSheetsToCloudFirestore(sheets);
        setSheetConfig(prev => ({
          ...prev,
          lastSyncedAt: new Date().toLocaleTimeString('th-TH'),
          syncStatus: 'success'
        }));
      } catch (err) {
        console.warn('Auto-save to Cloud Firestore failed:', err);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [sheets, isCloudAutoSync, isCloudInitialLoaded, isReadOnly]);

  // Calculations
  const totalKva = useMemo(() => {
    return transformers.reduce((sum, t) => sum + (t.kva || 0), 0);
  }, [transformers]);

  // --- Sheet Operations ---
  const handleSelectSheet = (id: string) => {
    setActiveSheetId(id);
    setSelectedTransformer(null);
    setSelectedPath(null);
    setSelectedSwitch(null);
    setSelectedAnnotation(null);
    const target = sheets.find(s => s.id === id);
    if (target) {
      showToast(`สลับไปยังหน้า ${target.sheetNo} ${target.title}`);
    }
  };

  const handleOpenNewSheetModal = () => {
    setEditingSheet(null);
    setIsSheetModalOpen(true);
  };

  const handleOpenEditSheetModal = (sheet: DiagramSheet) => {
    setEditingSheet(sheet);
    setIsSheetModalOpen(true);
  };

  const handleSaveSheet = (sheetData: {
    sheetNo: string;
    title: string;
    feederCode?: string;
    substation?: string;
    description?: string;
    cloneFromSheetId?: string;
  }) => {
    if (editingSheet) {
      // Edit existing sheet
      setSheets(prev => prev.map(s => {
        if (s.id === editingSheet.id) {
          return {
            ...s,
            sheetNo: sheetData.sheetNo,
            title: sheetData.title,
            feederCode: sheetData.feederCode,
            substation: sheetData.substation,
            description: sheetData.description,
            updatedAt: new Date().toISOString()
          };
        }
        return s;
      }));
      showToast(`บันทึกข้อมูลหน้า ${sheetData.sheetNo} ${sheetData.title} เรียบร้อยแล้ว`);
    } else {
      // Create new sheet
      const newId = `sheet-${Date.now()}`;
      let initialTfs: Transformer[] = [];
      let initialSw: SwitchNode[] = [];
      let initialPaths: FeederPath[] = [];
      let initialAnn: AnnotationLabel[] = [];

      if (sheetData.cloneFromSheetId) {
        const source = sheets.find(s => s.id === sheetData.cloneFromSheetId);
        if (source) {
          initialTfs = JSON.parse(JSON.stringify(source.transformers || []));
          initialSw = JSON.parse(JSON.stringify(source.switches || []));
          initialPaths = JSON.parse(JSON.stringify(source.feederPaths || []));
          initialAnn = JSON.parse(JSON.stringify(source.annotations || []));
        }
      } else {
        // Default blank sheet elements
        initialAnn = [
          {
            id: `ann-title-${newId}`,
            text: `${sheetData.sheetNo} ผังหม้อแปลง ${sheetData.title}`,
            x: 720,
            y: 940,
            type: 'feeder_title',
            fontSize: 18,
            color: '#000000'
          }
        ];
        initialPaths = [
          {
            id: `path-main-${newId}`,
            name: `${sheetData.title} (สายเมน)`,
            points: [
              { x: 300, y: 500 },
              { x: 500, y: 500 },
              { x: 700, y: 500 },
              { x: 900, y: 500 }
            ],
            style: 'solid',
            color: '#2563eb',
            strokeWidth: 3
          }
        ];
      }

      const newSheet: DiagramSheet = {
        id: newId,
        sheetNo: sheetData.sheetNo,
        title: sheetData.title,
        feederCode: sheetData.feederCode,
        substation: sheetData.substation,
        description: sheetData.description,
        transformers: initialTfs,
        switches: initialSw,
        feederPaths: initialPaths,
        annotations: initialAnn,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setSheets(prev => [...prev, newSheet]);
      setActiveSheetId(newId);
      showToast(`สร้างหน้าใหม่ ${newSheet.sheetNo} ${newSheet.title} เรียบร้อยแล้ว`);
    }
  };

  const handleDuplicateSheet = (sheetId: string) => {
    const source = sheets.find(s => s.id === sheetId);
    if (!source) return;

    const newId = `sheet-${Date.now()}`;
    const newSheet: DiagramSheet = {
      ...JSON.parse(JSON.stringify(source)),
      id: newId,
      sheetNo: `(${sheets.length + 1})`,
      title: `${source.title} (สำเนา)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setSheets(prev => [...prev, newSheet]);
    setActiveSheetId(newId);
    showToast(`คัดลอกหน้า ${newSheet.sheetNo} เรียบร้อยแล้ว`);
  };

  const handleDeleteSheet = (sheetId: string) => {
    if (sheets.length <= 1) {
      showToast('ไม่สามารถลบหน้าสุดท้ายได้', 'error');
      return;
    }

    const target = sheets.find(s => s.id === sheetId);
    if (confirm(`คุณต้องการลบหน้า "${target?.sheetNo} ${target?.title}" ใช่หรือไม่?`)) {
      setSheets(prev => {
        const remaining = prev.filter(s => s.id !== sheetId);
        if (activeSheetId === sheetId) {
          setActiveSheetId(remaining[0].id);
        }
        return remaining;
      });
      showToast(`ลบหน้า ${target?.sheetNo} เรียบร้อยแล้ว`, 'info');
    }
  };

  // --- Actions ---
  const handleThemeToggle = () => {
    setTheme(curr => (curr === 'white' ? 'blueprint' : curr === 'blueprint' ? 'dark' : 'white'));
  };

  const handleUpdatePosition = useCallback((id: string, x: number, y: number) => {
    setTransformers(prev =>
      prev.map(t => (t.id === id ? { ...t, x, y } : t))
    );
  }, [setTransformers]);

  const handleUpdateSwitchPosition = useCallback((id: string, x: number, y: number) => {
    setSwitches(prev =>
      prev.map(s => (s.id === id ? { ...s, x, y } : s))
    );
  }, [setSwitches]);

  const handleUpdateAnnotationPosition = useCallback((id: string, x: number, y: number) => {
    setAnnotations(prev =>
      prev.map(a => (a.id === id ? { ...a, x, y } : a))
    );
  }, [setAnnotations]);

  // Feeder Path Handlers
  const handleUpdateFeederPath = useCallback((updated: FeederPath) => {
    if (isReadOnly) return;
    setFeederPaths(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelectedPath(curr => (curr?.id === updated.id ? updated : curr));
  }, [isReadOnly, setFeederPaths]);

  const handleDeleteFeederPath = useCallback((id: string) => {
    if (isReadOnly) return;
    setFeederPaths(prev => prev.filter(p => p.id !== id));
    setSelectedPath(curr => (curr?.id === id ? null : curr));
    showToast('ลบเส้นวงจรเรียบร้อยแล้ว', 'info');
  }, [isReadOnly, setFeederPaths, showToast]);

  const handleAddFeederPath = useCallback((newPath: FeederPath) => {
    if (isReadOnly) return;
    setFeederPaths(prev => [...prev, newPath]);
    setSelectedPath(newPath);
    showToast(`เพิ่มเส้นวงจร ${newPath.name} เรียบร้อยแล้ว`);
  }, [isReadOnly, setFeederPaths, showToast]);

  const handleAddPointToPath = useCallback((pathId: string) => {
    if (isReadOnly) return;
    setFeederPaths(prev => prev.map(p => {
      if (p.id !== pathId || p.points.length === 0) return p;
      if (p.points.length >= 2) {
        const lastPt = p.points[p.points.length - 1];
        const prevPt = p.points[p.points.length - 2];
        const dx = lastPt.x - prevPt.x;
        const dy = lastPt.y - prevPt.y;
        const len = Math.hypot(dx, dy) || 1;
        // ยืดต่อปลายเส้นออกไป 40px ในทิศทางเดียวกับแนวเดิม
        const extX = Math.round((dx / len) * 40);
        const extY = Math.round((dy / len) * 40);
        const newPoints = [...p.points, { x: lastPt.x + extX, y: lastPt.y + extY }];
        return { ...p, points: newPoints };
      }
      const lastPt = p.points[p.points.length - 1];
      const newPoints = [...p.points, { x: lastPt.x, y: lastPt.y + 30 }];
      return { ...p, points: newPoints };
    }));
  }, [isReadOnly, setFeederPaths]);

  // Switch Handlers
  const handleUpdateSwitch = useCallback((updated: SwitchNode) => {
    if (isReadOnly) return;
    setSwitches(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    setSelectedSwitch(curr => (curr?.id === updated.id ? updated : curr));
  }, [isReadOnly, setSwitches]);

  const handleDeleteSwitch = useCallback((id: string) => {
    if (isReadOnly) return;
    const target = switches.find(s => s.id === id);
    setSwitches(prev => prev.filter(s => s.id !== id));
    setSelectedSwitch(curr => (curr?.id === id ? null : curr));
    showToast(`ลบสวิตช์ ${target ? target.code : ''} เรียบร้อยแล้ว`, 'info');
  }, [isReadOnly, switches, setSwitches, showToast]);

  const handleSaveSwitch = useCallback((sw: SwitchNode) => {
    if (isReadOnly) return;
    const exists = switches.some(s => s.id === sw.id);
    if (exists) {
      setSwitches(prev => prev.map(s => (s.id === sw.id ? sw : s)));
      showToast(`บันทึกการแก้ไขสวิตช์ ${sw.code} สำเร็จ`);
    } else {
      setSwitches(prev => [...prev, sw]);
      showToast(`เพิ่มสวิตช์ ${sw.code} เรียบร้อยแล้ว`);
    }
    setSelectedSwitch(sw);
  }, [isReadOnly, switches, setSwitches, showToast]);

  const handleOpenAddSwitchModal = (pos?: { x: number; y: number }) => {
    if (isReadOnly) return;
    setEditingSwitch(null);
    setNewSwitchDefaultPos(pos || { x: 400, y: 400 });
    setIsSwitchModalOpen(true);
  };

  // Annotation Handlers
  const handleUpdateAnnotation = useCallback((updated: AnnotationLabel) => {
    if (isReadOnly) return;
    setAnnotations(prev => prev.map(a => (a.id === updated.id ? updated : a)));
    setSelectedAnnotation(curr => (curr?.id === updated.id ? updated : curr));
  }, [isReadOnly, setAnnotations]);

  const handleDeleteAnnotation = useCallback((id: string) => {
    if (isReadOnly) return;
    const target = annotations.find(a => a.id === id);
    setAnnotations(prev => prev.filter(a => a.id !== id));
    setSelectedAnnotation(curr => (curr?.id === id ? null : curr));
    showToast(`ลบข้อความ ${target ? target.text : ''} เรียบร้อยแล้ว`, 'info');
  }, [isReadOnly, annotations, setAnnotations, showToast]);

  const handleSaveAnnotation = useCallback((ann: AnnotationLabel) => {
    if (isReadOnly) return;
    const exists = annotations.some(a => a.id === ann.id);
    if (exists) {
      setAnnotations(prev => prev.map(a => (a.id === ann.id ? ann : a)));
      showToast(`บันทึกข้อความ "${ann.text}" สำเร็จ`);
    } else {
      setAnnotations(prev => [...prev, ann]);
      showToast(`เพิ่มข้อความ "${ann.text}" เรียบร้อยแล้ว`);
    }
    setSelectedAnnotation(ann);
  }, [isReadOnly, annotations, setAnnotations, showToast]);

  const handleOpenAddAnnotationModal = (pos?: { x: number; y: number }) => {
    if (isReadOnly) return;
    setEditingAnnotation(null);
    setNewAnnotationDefaultPos(pos || { x: 400, y: 400 });
    setIsAnnotationModalOpen(true);
  };

  // Transformer Handlers
  const handleSaveTransformer = (t: Transformer) => {
    if (isReadOnly) return;
    const exists = transformers.some(item => item.id === t.id);
    if (exists) {
      setTransformers(prev => prev.map(item => (item.id === t.id ? t : item)));
      showToast(`บันทึกการแก้ไขหม้อแปลง ${t.peaNo} (${t.name}) สำเร็จ`);
    } else {
      setTransformers(prev => [t, ...prev]);
      showToast(`เพิ่มหม้อแปลง ${t.peaNo} (${t.name}) เรียบร้อยแล้ว`);
    }
    setSelectedTransformer(t);
  };

  const handleDeleteTransformer = (id: string) => {
    if (isReadOnly) return;
    const target = transformers.find(t => t.id === id);
    setTransformers(prev => prev.filter(t => t.id !== id));
    if (selectedTransformer?.id === id) {
      setSelectedTransformer(null);
    }
    showToast(`ลบหม้อแปลง ${target ? target.peaNo : ''} เรียบร้อยแล้ว`, 'info');
  };

  const handleDeleteMultiple = (ids: string[]) => {
    if (isReadOnly) return;
    setTransformers(prev => prev.filter(t => !ids.includes(t.id)));
    setSelectedTransformer(null);
    showToast(`ลบหม้อแปลงจำนวน ${ids.length} รายการเรียบร้อยแล้ว`, 'info');
  };

  const handleOpenAddModal = (pos?: { x: number; y: number }) => {
    setEditingTransformer(null);
    setNewTransformerDefaultPos(pos || { x: 400, y: 400 });
    setIsModalOpen(true);
  };

  const handleEditTransformer = (t: Transformer) => {
    const original = transformers.find(item => item.id === t.id) || t;
    setEditingTransformer(original);
    setIsModalOpen(true);
  };

  const handleSwitchToCanvasWithFocus = (t: Transformer) => {
    setSelectedTransformer(t);
    setCurrentView('canvas');
  };

  const handleResetToDefault = () => {
    if (confirm('คุณต้องการรีเซ็ตข้อมูลผังหน้าปัจจุบัน และล้างหม้อแปลงในหน้านี้ออกทั้งหมดหรือไม่?')) {
      setTransformers([]);
      setSwitches(INITIAL_SWITCHES);
      setAnnotations(INITIAL_ANNOTATIONS);
      setFeederPaths(INITIAL_FEEDER_PATHS);
      setSelectedTransformer(null);
      setSelectedPath(null);
      setSelectedSwitch(null);
      setSelectedAnnotation(null);
      showToast('รีเซ็ตผังวงจรและล้างข้อมูลหม้อแปลงในหน้านี้เรียบร้อยแล้ว');
    }
  };

  const handleClearAllTransformers = () => {
    setSheets(prev => prev.map(sheet => ({
      ...sheet,
      transformers: [],
      updatedAt: new Date().toISOString()
    })));
    setSelectedTransformer(null);
    showToast('ลบข้อมูลหม้อแปลงทั้งหมดในทุกหน้าผังเรียบร้อยแล้ว (0 ลูก)', 'info');
  };

  // Sync active sheet when URL hash or params change
  useEffect(() => {
    const handleUrlChange = () => {
      const targetId = getInitialActiveSheetId(sheets);
      if (targetId && targetId !== activeSheetId) {
        setActiveSheetId(targetId);
      }
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, [sheets, activeSheetId]);

  return (
    <div className={`w-screen h-screen flex flex-col overflow-hidden font-sans ${theme === 'dark' || theme === 'blueprint' ? 'dark' : ''}`}>
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        searchQuery={searchQuery}
        theme={theme}
        isDraggable={isDraggable}
        isReadOnly={isReadOnly}
        transformerCount={transformers.length}
        totalKva={totalKva}
        sheetConfig={sheetConfig}
        sheetTitle={activeSheet.title}
        sheetNo={activeSheet.sheetNo}
        activeSheetId={activeSheet.id}
        sheets={sheets}
        totalSheets={sheets.length}
        onSelectView={setCurrentView}
        onSelectSheet={handleSelectSheet}
        onSearchChange={setSearchQuery}
        onThemeToggle={handleThemeToggle}
        onToggleDraggable={handleToggleDraggable}
        onToggleReadOnly={handleToggleReadOnly}
        onOpenAddModal={() => handleOpenAddModal()}
        onOpenGoogleSheetsModal={() => setIsSheetsModalOpen(true)}
        onPrintDiagram={() => setIsPrintModalOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
      />

      {/* Multi-Sheet Tab Bar */}
      <SheetTabs
        sheets={sheets}
        activeSheetId={activeSheet.id}
        isReadOnly={isReadOnly}
        onSelectSheet={handleSelectSheet}
        onOpenNewSheetModal={handleOpenNewSheetModal}
        onOpenEditSheetModal={handleOpenEditSheetModal}
        onDuplicateSheet={handleDuplicateSheet}
        onDeleteSheet={handleDeleteSheet}
      />

      {/* Main View Container */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {currentView === 'canvas' && (
          <>
            <TransformerCanvas
              sheetId={activeSheet.id}
              isReadOnly={isReadOnly}
              transformers={transformers}
              switches={switches}
              feederPaths={feederPaths}
              annotations={annotations}
              selectedId={selectedTransformer?.id || null}
              selectedPathId={selectedPath?.id || null}
              selectedSwitchId={selectedSwitch?.id || null}
              selectedAnnotationId={selectedAnnotation?.id || null}
              searchQuery={searchQuery}
              filterKva={filterKva}
              filterType={filterType}
              theme={theme}
              isDraggable={isDraggable}
              onToggleDraggable={handleToggleDraggable}
              onSelectTransformer={(t) => {
                setSelectedTransformer(t);
                if (t) {
                  setSelectedPath(null);
                  setSelectedSwitch(null);
                  setSelectedAnnotation(null);
                }
              }}
              onSelectPath={(path) => {
                setSelectedPath(path);
                if (path) {
                  setSelectedTransformer(null);
                  setSelectedSwitch(null);
                  setSelectedAnnotation(null);
                }
              }}
              onSelectSwitch={(sw) => {
                setSelectedSwitch(sw);
                if (sw) {
                  setSelectedTransformer(null);
                  setSelectedPath(null);
                  setSelectedAnnotation(null);
                }
              }}
              onSelectAnnotation={(ann) => {
                setSelectedAnnotation(ann);
                if (ann) {
                  setSelectedTransformer(null);
                  setSelectedPath(null);
                  setSelectedSwitch(null);
                }
              }}
              onUpdateTransformerPosition={isReadOnly ? () => {} : handleUpdatePosition}
              onUpdateSwitchPosition={isReadOnly ? undefined : handleUpdateSwitchPosition}
              onUpdateAnnotationPosition={isReadOnly ? undefined : handleUpdateAnnotationPosition}
              onUpdateFeederPath={isReadOnly ? undefined : handleUpdateFeederPath}
              onDeleteFeederPath={isReadOnly ? undefined : handleDeleteFeederPath}
              onAddFeederPath={isReadOnly ? undefined : handleAddFeederPath}
              onDeleteSwitch={isReadOnly ? undefined : handleDeleteSwitch}
              onDeleteAnnotation={isReadOnly ? undefined : handleDeleteAnnotation}
              onEditAnnotation={isReadOnly ? undefined : (ann) => {
                setEditingAnnotation(ann);
                setIsAnnotationModalOpen(true);
              }}
              onAddSwitchAt={isReadOnly ? undefined : (x, y) => handleOpenAddSwitchModal({ x, y })}
              onAddAnnotationAt={isReadOnly ? undefined : (x, y) => handleOpenAddAnnotationModal({ x, y })}
              onEditTransformer={isReadOnly ? () => {} : handleEditTransformer}
              onDeleteTransformer={isReadOnly ? () => {} : handleDeleteTransformer}
              onAddTransformerAt={isReadOnly ? () => {} : (x, y) => handleOpenAddModal({ x, y })}
            />

            {/* Selected Transformer Detail Drawer */}
            <TransformerDetailDrawer
              transformer={selectedTransformer}
              isReadOnly={isReadOnly}
              onClose={() => setSelectedTransformer(null)}
              onEdit={handleEditTransformer}
              onDelete={handleDeleteTransformer}
              onUpdatePosition={handleUpdatePosition}
            />

            {/* Selected Feeder Line Detail Drawer */}
            <LineEditorDrawer
              selectedPath={selectedPath}
              isReadOnly={isReadOnly}
              onClose={() => setSelectedPath(null)}
              onUpdatePath={handleUpdateFeederPath}
              onDeletePath={handleDeleteFeederPath}
              onAddPointToPath={handleAddPointToPath}
            />

            {/* Selected Switch Detail Drawer */}
            <SwitchDrawer
              selectedSwitch={selectedSwitch}
              isReadOnly={isReadOnly}
              onClose={() => setSelectedSwitch(null)}
              onUpdateSwitch={handleUpdateSwitch}
              onDeleteSwitch={handleDeleteSwitch}
            />

            {/* Selected Annotation Detail Drawer */}
            <AnnotationDrawer
              selectedAnnotation={selectedAnnotation}
              isReadOnly={isReadOnly}
              onClose={() => setSelectedAnnotation(null)}
              onUpdateAnnotation={handleUpdateAnnotation}
              onDeleteAnnotation={handleDeleteAnnotation}
            />
          </>
        )}

        {currentView === 'table' && (
          <TransformerTableView
            transformers={transformers}
            isReadOnly={isReadOnly}
            sheetUrl={sheetConfig.sheetUrl}
            onSelectTransformer={setSelectedTransformer}
            onEditTransformer={handleEditTransformer}
            onDeleteTransformer={handleDeleteTransformer}
            onDeleteMultiple={handleDeleteMultiple}
            onAddNewTransformer={() => handleOpenAddModal()}
            onSwitchToCanvasWithFocus={handleSwitchToCanvasWithFocus}
          />
        )}

        {currentView === 'stats' && (
          <StatisticsPanel
            transformers={transformers}
            switches={switches}
            onSelectKvaFilter={(k) => {
              setFilterKva(k);
              setCurrentView('canvas');
            }}
            onSelectTypeFilter={(t) => {
              setFilterType(t);
              setCurrentView('canvas');
            }}
          />
        )}
      </main>

      {/* Quick Reset Floating Link (Bottom Right - Editor only) */}
      {!isReadOnly && (
        <div className="fixed bottom-3 right-4 z-20 flex items-center gap-2">
          <button
            onClick={handleResetToDefault}
            className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm transition-all cursor-pointer"
          >
            รีเซ็ตผังหน้านี้
          </button>
        </div>
      )}

      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-150 ${
          toast.type === 'success'
            ? 'bg-emerald-600 text-white'
            : toast.type === 'error'
            ? 'bg-red-600 text-white'
            : 'bg-slate-800 text-white'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Info className="w-4 h-4" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Sheet Add / Edit Modal */}
      <SheetModal
        isOpen={isSheetModalOpen}
        sheet={editingSheet}
        sheetsCount={sheets.length}
        allSheets={sheets}
        onClose={() => setIsSheetModalOpen(false)}
        onSave={handleSaveSheet}
      />

      {/* Transformer Add / Edit Modal */}
      <TransformerModal
        isOpen={isModalOpen}
        transformer={editingTransformer}
        defaultPosition={newTransformerDefaultPos}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransformer}
        onDelete={handleDeleteTransformer}
      />

      {/* Switch Add / Edit Modal */}
      <SwitchModal
        isOpen={isSwitchModalOpen}
        switchNode={editingSwitch}
        defaultPosition={newSwitchDefaultPos}
        onClose={() => setIsSwitchModalOpen(false)}
        onSave={handleSaveSwitch}
        onDelete={handleDeleteSwitch}
      />

      {/* Annotation Add / Edit Modal */}
      <AnnotationModal
        isOpen={isAnnotationModalOpen}
        annotation={editingAnnotation}
        defaultPosition={newAnnotationDefaultPos}
        onClose={() => setIsAnnotationModalOpen(false)}
        onSave={handleSaveAnnotation}
        onDelete={handleDeleteAnnotation}
      />

      {/* Google Sheets & Cloud Database Sync Modal */}
      <GoogleSheetsSyncModal
        isOpen={isSheetsModalOpen}
        transformers={transformers}
        config={sheetConfig}
        allSheets={sheets}
        activeSheetId={activeSheetId}
        cloudUser={cloudUser}
        isCloudAutoSync={isCloudAutoSync}
        onToggleCloudAutoSync={setIsCloudAutoSync}
        onClose={() => setIsSheetsModalOpen(false)}
        onUpdateConfig={setSheetConfig}
        onUpdateTransformers={(newItems) => {
          const prevIds = new Set(transformers.map(t => t.id));
          const defaultIds = new Set(INITIAL_TRANSFORMERS.map(t => t.id));
          const newlyAdded = newItems.find(t => !prevIds.has(t.id)) || newItems.find(t => !defaultIds.has(t.id));

          updateActiveSheet(sheet => {
            const hasPaths = sheet.feederPaths && sheet.feederPaths.length > 0;
            const updatedPaths = hasPaths ? sheet.feederPaths : [
              {
                id: `path-main-${Date.now()}`,
                name: 'สายเมนหลัก',
                color: '#000000',
                strokeWidth: 3,
                points: [
                  { x: 520, y: 100 },
                  { x: 520, y: 880 }
                ]
              }
            ];
            return {
              transformers: newItems,
              feederPaths: updatedPaths
            };
          });
          setSearchQuery('');
          setFilterKva(null);
          setFilterType('all');
          setCurrentView('canvas');
          if (newlyAdded) {
            setSelectedTransformer(newlyAdded);
          }
          showToast(`อัปเดตข้อมูลหม้อแปลง ${newItems.length} รายการลงในผังหน้า "${activeSheet.title}" แล้ว`);
        }}
        onUpdateAllSheetsTransformers={(updatedSheets) => {
          const prevActiveTfs = activeSheet.transformers || [];
          const prevIds = new Set(prevActiveTfs.map(t => t.id));
          const defaultIds = new Set(INITIAL_TRANSFORMERS.map(t => t.id));

          // Ensure sheets have feeder lines if empty
          const withPaths = updatedSheets.map(s => {
            const hasPaths = s.feederPaths && s.feederPaths.length > 0;
            if (!hasPaths && s.transformers && s.transformers.length > 0) {
              return {
                ...s,
                feederPaths: [
                  {
                    id: `path-main-${Date.now()}-${s.id}`,
                    name: 'สายเมนหลัก',
                    color: '#000000',
                    strokeWidth: 3,
                    points: [
                      { x: 520, y: 100 },
                      { x: 520, y: 880 }
                    ]
                  }
                ]
              };
            }
            return s;
          });
          setSheets(withPaths);
          setSearchQuery('');
          setFilterKva(null);
          setFilterType('all');
          setCurrentView('canvas');

          const updatedActive = withPaths.find(s => s.id === activeSheet.id) || withPaths[0];
          const newlyAdded = updatedActive?.transformers?.find(t => !prevIds.has(t.id)) ||
                             updatedActive?.transformers?.find(t => !defaultIds.has(t.id));
          if (newlyAdded) {
            setSelectedTransformer(newlyAdded);
          }

          const totalCount = withPaths.reduce((sum, s) => sum + (s.transformers?.length || 0), 0);
          showToast(`อัปเดตข้อมูลหม้อแปลงทุกหน้า (${withPaths.length} หน้า รวม ${totalCount} ตัว) เรียบร้อยแล้ว`);
        }}
        onClearAllTransformers={handleClearAllTransformers}
      />

      {/* Print & Export Modal */}
      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        transformers={transformers}
        switches={switches}
        feederPaths={feederPaths}
        annotations={annotations}
        transformerCount={transformers.length}
        totalKva={totalKva}
        sheetTitle={activeSheet.title}
        sheetNo={activeSheet.sheetNo}
        feederCode={activeSheet.feederCode || 'FAA-06'}
      />

      {/* Share Read-Only Link Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        sheets={sheets}
        activeSheetId={activeSheet.id}
        sheetId={activeSheet.id}
        sheetTitle={`${activeSheet.sheetNo} ${activeSheet.title}`}
        onEnterViewerMode={() => {
          setIsReadOnly(true);
          setIsShareModalOpen(false);
          showToast('เข้าสู่โหมดแสดงอย่างเดียว (Read-Only Viewer)', 'info');
        }}
        onImportSheets={(importedSheets) => {
          setSheets(importedSheets);
          if (importedSheets[0]) {
            setActiveSheetId(importedSheets[0].id);
          }
          showToast(`นำเข้าผังสำเร็จ ${importedSheets.length} หน้า`, 'success');
        }}
      />
    </div>
  );
}
