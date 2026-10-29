import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Transformer, 
  SwitchNode, 
  FeederPath, 
  AnnotationLabel, 
  AnnotationType,
  GoogleSheetConfig,
  DiagramSheet,
  TransformerDraft
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
import { LoginPage } from './components/LoginPage';
import { TransformerDraftModal } from './components/TransformerDraftModal';
import { DraftApprovalModal } from './components/DraftApprovalModal';
import { DataRecoveryModal } from './components/DataRecoveryModal';
import { ConfirmModal } from './components/ConfirmModal';
import { FANG_PRESET_SHEETS, scanLocalStorageForBackups } from './data/fangSubstationPresetData';
import { CheckCircle2, AlertCircle, Info, Undo2, Zap, RotateCcw, AlertTriangle, Sparkles } from 'lucide-react';

import { decodeSheetsFromPayload } from './utils/shareUtils';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import { 
  saveSheetsToCloudFirestore, 
  fetchSheetsFromCloudFirestore,
  subscribeToCloudSheets,
  signOutFromCloud,
  isQuotaError,
  isCloudWriteQuotaExhausted,
  recordQuotaExhausted,
  resetQuotaExhausted,
  subscribeToTransformerDrafts,
  approveTransformerDraft
} from './services/firebaseDbService';

const STORAGE_KEY_SHEETS = 'pea_sld_all_sheets_v8_cloud_authoritative';
const STORAGE_KEY_ACTIVE_SHEET_ID = 'pea_sld_active_sheet_id_v8';
const STORAGE_KEY_SHEET_CONFIG = 'pea_sld_cloud_config_v2';
const STORAGE_KEY_THEME = 'pea_sld_theme_v1';
const STORAGE_KEY_CLEARED_CLOUD_TFS = 'pea_sld_cleared_all_transformers_v1';

// Legacy keys to clean up
const LEGACY_STORAGE_KEYS = [
  'pea_sld_all_sheets_v7_clean',
  'pea_sld_active_sheet_id_v7',
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
  let loadedSheets: DiagramSheet[] | null = null;

  // 1. Check if URL contains embedded share data (#data=... or ?data=...)
  try {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash && hash.includes('data=')) {
        const decoded = decodeSheetsFromPayload(hash);
        if (decoded && decoded.sheets.length > 0) {
          loadedSheets = decoded.sheets;
        }
      }
      if (!loadedSheets && search && search.includes('data=')) {
        const params = new URLSearchParams(search);
        const dataParam = params.get('data');
        if (dataParam) {
          const decoded = decodeSheetsFromPayload(dataParam);
          if (decoded && decoded.sheets.length > 0) {
            loadedSheets = decoded.sheets;
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse URL share payload', e);
  }

  // Clean up old legacy keys
  try {
    LEGACY_STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
  } catch (e) {}

  // 2. Load from v8 localStorage
  if (!loadedSheets) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHEETS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedSheets = parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load sheets from storage', e);
    }
  }


  // 4. If still no sheets, return default preset sheets with empty transformers
  if (!loadedSheets || loadedSheets.length === 0) {
    return createDefaultPresetSheets([], INITIAL_SWITCHES, INITIAL_FEEDER_PATHS, INITIAL_ANNOTATIONS);
  }

  return loadedSheets;
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

  // Track if user explicitly performed an edit in the current session
  const hasUserEditedRef = useRef<boolean>(false);

  // Update active sheet items safely
  const updateActiveSheet = useCallback((updater: Partial<DiagramSheet> | ((prev: DiagramSheet) => Partial<DiagramSheet>)) => {
    hasUserEditedRef.current = true;
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
    hasUserEditedRef.current = true;
    updateActiveSheet(sheet => ({
      transformers: typeof updater === 'function' ? updater(sheet.transformers || []) : updater
    }));
  }, [updateActiveSheet]);

  const setSwitches = useCallback((updater: SwitchNode[] | ((prev: SwitchNode[]) => SwitchNode[])) => {
    hasUserEditedRef.current = true;
    updateActiveSheet(sheet => ({
      switches: typeof updater === 'function' ? updater(sheet.switches || []) : updater
    }));
  }, [updateActiveSheet]);

  const setFeederPaths = useCallback((updater: FeederPath[] | ((prev: FeederPath[]) => FeederPath[])) => {
    hasUserEditedRef.current = true;
    updateActiveSheet(sheet => ({
      feederPaths: typeof updater === 'function' ? updater(sheet.feederPaths || []) : updater
    }));
  }, [updateActiveSheet]);

  const setAnnotations = useCallback((updater: AnnotationLabel[] | ((prev: AnnotationLabel[]) => AnnotationLabel[])) => {
    hasUserEditedRef.current = true;
    updateActiveSheet(sheet => ({
      annotations: typeof updater === 'function' ? updater(sheet.annotations || []) : updater
    }));
  }, [updateActiveSheet]);


  // Persist sheets in storage (debounced to prevent UI lag during dragging)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_SHEETS, JSON.stringify(sheets));
      } catch (e) {}
    }, 400);
    return () => clearTimeout(timer);
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
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private' | 'none'>('all');
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [cloudUser, setCloudUser] = useState<{ uid: string; email?: string | null; displayName?: string | null } | null>(null);
  const [isCloudAutoSync, setIsCloudAutoSync] = useState<boolean>(true);
  const [isCloudInitialLoaded, setIsCloudInitialLoaded] = useState<boolean>(false);
  const [isSavingToCloud, setIsSavingToCloud] = useState<boolean>(false);
  const [lastSavedCloudTime, setLastSavedCloudTime] = useState<string>(() => {
    try {
      return localStorage.getItem('pea_last_cloud_save_time') || '';
    } catch {
      return '';
    }
  });
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);

  // Draft Proposals & Approval States
  const [drafts, setDrafts] = useState<TransformerDraft[]>([]);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [draftModalActionType, setDraftModalActionType] = useState<'create' | 'update'>('create');
  const [draftInitialTransformer, setDraftInitialTransformer] = useState<Transformer | null>(null);
  const [draftProposedPosition, setDraftProposedPosition] = useState<{ x: number; y: number } | undefined>();
  const [isDraftApprovalModalOpen, setIsDraftApprovalModalOpen] = useState(false);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);

  const totalAllTransformers = useMemo(() => {
    return sheets.reduce((sum, s) => sum + (s.transformers?.length || 0), 0);
  }, [sheets]);

  // Subscribe to real-time transformer drafts
  useEffect(() => {
    const unsubscribe = subscribeToTransformerDrafts((updatedDrafts) => {
      setDrafts(updatedDrafts);
    });
    return () => unsubscribe();
  }, []);

  const pendingDraftsCount = useMemo(() => {
    return drafts.filter(d => d.status === 'pending').length;
  }, [drafts]);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // In-App Confirm Modal State (replaces window.confirm which is blocked in iframes)
  const [appConfirmModal, setAppConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleSignOut = useCallback(() => {
    setAppConfirmModal({
      isOpen: true,
      title: 'ออกจากระบบ',
      message: 'คุณต้องการออกจากระบบการจัดการผังหม้อแปลงหรือไม่?',
      confirmText: 'ออกจากระบบ',
      confirmVariant: 'warning',
      onConfirm: async () => {
        try {
          await signOutFromCloud();
          showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
        } catch (err: any) {
          showToast('เกิดข้อผิดพลาดในการออกจากระบบ', 'error');
        }
      }
    });
  }, [showToast]);

  const handleToggleReadOnly = useCallback(() => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      showToast('กรุณาเข้าสู่ระบบก่อนเพื่อแก้ไขผังวงจร', 'info');
      return;
    }
    setIsReadOnly(prev => {
      const next = !prev;
      showToast(
        next ? 'เข้าสู่โหมดแสดงอย่างเดียว (Read-Only Mode) — สำหรับแชร์ให้คนอื่นดู' : 'เข้าสู่โหมดแก้ไขผังวงจร (Editor Mode)',
        'info'
      );
      return next;
    });
  }, [currentUser, showToast]);

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

  const handleManualSaveToCloud = useCallback(async () => {
    if (isSavingToCloud) return;
    setIsSavingToCloud(true);
    const sheetsJson = JSON.stringify(sheets);
    const nowStr = new Date().toLocaleTimeString('th-TH');

    // 1. Always save to LocalStorage and rolling backup first
    try {
      localStorage.setItem(STORAGE_KEY_SHEETS, sheetsJson);
      localStorage.setItem('pea_last_cloud_save_time', nowStr);
      localStorage.setItem(`pea_sld_backup_${Date.now()}`, sheetsJson);
    } catch {}

    try {
      // Force retry if user explicitly clicks the manual save button
      await saveSheetsToCloudFirestore(sheets, { forceRetry: true });
      resetQuotaExhausted();
      setLastSavedCloudTime(nowStr);
      setCloudSyncError(null);
      hasUserEditedRef.current = false;
      lastSavedSheetsJsonRef.current = sheetsJson;
      setSheetConfig(prev => ({
        ...prev,
        lastSyncedAt: nowStr,
        syncStatus: 'success',
        errorMessage: undefined
      }));
      showToast(`บันทึกข้อมูลผังวงจรลง Firebase สำเร็จแล้ว (${nowStr}) ครบทุกหน้า (${totalAllTransformers} เครื่อง)`, 'success');
    } catch (err: any) {
      const isQuota = isQuotaError(err);
      if (isQuota) {
        recordQuotaExhausted();
      }
      hasUserEditedRef.current = false;
      lastSavedSheetsJsonRef.current = sheetsJson;
      setLastSavedCloudTime(nowStr);

      const msg = isQuota 
        ? 'โควตา Cloud ประจำวันเต็ม ข้อมูลทั้งหมดถูกบันทึกลงในเครื่อง (LocalStorage) อย่างปลอดภัย'
        : (err?.message || 'ไม่สามารถบันทึกลง Firebase ได้ (บันทึกในเครื่องปลอดภัย)');
      setCloudSyncError(msg);
      setSheetConfig(prev => ({
        ...prev,
        lastSyncedAt: nowStr,
        syncStatus: isQuota ? 'cached' : 'error',
        errorMessage: msg
      }));
      showToast(msg, isQuota ? 'info' : 'error');
    } finally {
      setIsSavingToCloud(false);
    }
  }, [sheets, totalAllTransformers, isSavingToCloud, showToast]);

  const handleRestoreFullFangDataset = useCallback(async () => {
    let total = 0;
    const updated = sheets.map((s, idx) => {
      let preset = FANG_PRESET_SHEETS[s.id];
      if (!preset) {
        if (s.title?.includes('สวนดอก') || idx === 0) preset = FANG_PRESET_SHEETS['sheet-1'];
        else if (s.title?.includes('ป่าบง') || idx === 1) preset = FANG_PRESET_SHEETS['sheet-2'];
        else if (s.title?.includes('โป่งน้ำร้อน') || idx === 2) preset = FANG_PRESET_SHEETS['sheet-3'];
        else if (s.title?.includes('ม่อบปิ่น') || s.title?.includes('ม่อนปิ่น') || idx === 3) preset = FANG_PRESET_SHEETS['sheet-1792469878954'];
        else if (s.title?.includes('บ้านลาน') || idx === 4) preset = FANG_PRESET_SHEETS['sheet-1792570504182'];
        else if (s.title?.includes('ศรีดอนชัย') || idx === 5) preset = FANG_PRESET_SHEETS['sheet-3-sridonchai'];
      }
      if (preset?.transformers && preset.transformers.length > 0) {
        total += preset.transformers.length;
        return {
          ...s,
          title: preset.title || s.title,
          feederCode: preset.feederCode || s.feederCode,
          transformers: preset.transformers as Transformer[],
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    });

    const updatedJson = JSON.stringify(updated);
    hasUserEditedRef.current = true;
    lastSavedSheetsJsonRef.current = updatedJson;
    setSheets(updated);
    try {
      await saveSheetsToCloudFirestore(updated);
    } catch {}
    showToast(`คืนค่าฐานข้อมูลเต็ม กฟส.ฝาง สำเร็จ (${total} เครื่อง ครบ 6 ผัง)`, 'success');
  }, [sheets, showToast]);

  const executeClearAllTransformers = useCallback(async () => {
    const emptySheets = sheets.map(s => ({
      ...s,
      transformers: [],
      updatedAt: new Date().toISOString()
    }));
    const emptyJson = JSON.stringify(emptySheets);
    hasUserEditedRef.current = true;
    lastSavedSheetsJsonRef.current = emptyJson;
    setSheets(emptySheets);
    setSelectedTransformer(null);
    try {
      localStorage.setItem(STORAGE_KEY_SHEETS, emptyJson);
      await saveSheetsToCloudFirestore(emptySheets);
      showToast('ลบหม้อแปลงทั้งหมดเรียบร้อยแล้ว (0 เครื่อง)', 'info');
    } catch (err: any) {
      showToast('ลบหม้อแปลงในเครื่องเรียบร้อยแล้ว', 'info');
    }
  }, [sheets, showToast]);

  const handleClearAllTransformers = useCallback(() => {
    setAppConfirmModal({
      isOpen: true,
      title: 'ยืนยันการลบหม้อแปลงทั้งหมด',
      message: 'คุณต้องการลบหม้อแปลงทั้งหมดในทุกหน้าผังวงจรให้เหลือ 0 เครื่อง ใช่หรือไม่?\n(ผังสายส่ง สวิตช์ และป้ายชื่อสถานที่สำคัญจะยังคงอยู่ครบถ้วน)',
      confirmText: 'ยืนยันลบทั้งหมด (0 เครื่อง)',
      confirmVariant: 'danger',
      onConfirm: executeClearAllTransformers
    });
  }, [executeClearAllTransformers]);

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

  // Track Firebase Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
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

    return () => unsubscribe();
  }, []);

  // Live Synchronization with Firebase Firestore as Primary Source of Truth (SSOT)
  const lastSavedSheetsJsonRef = useRef<string>('');
  const isCloudSyncingRef = useRef<boolean>(false);
  const quotaExceededToastShownRef = useRef<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    // 1. Immediate fetch from Firebase Firestore as primary
    async function loadPrimaryFromFirebase() {
      try {
        const cloudSheets = await fetchSheetsFromCloudFirestore();
        if (!isMounted) return;

        if (cloudSheets && cloudSheets.length > 0) {
          // Check local sheets in localStorage to prevent wiping offline or local edits
          let currentLocalSheets: DiagramSheet[] = [];
          try {
            const raw = localStorage.getItem(STORAGE_KEY_SHEETS);
            if (raw) currentLocalSheets = JSON.parse(raw);
          } catch {}

          // Create an automatic rolling backup snapshot before updating
          if (currentLocalSheets.length > 0) {
            try {
              localStorage.setItem(`pea_sld_backup_${Date.now()}`, JSON.stringify(currentLocalSheets));
            } catch {}
          }

          let hasLocalKeep = false;
          const mergedSheets = cloudSheets.map(cs => {
            const ls = currentLocalSheets.find(l => l.id === cs.id || l.sheetNo === cs.sheetNo);
            // If local sheet has transformers while cloud sheet is empty (e.g. offline edits or quota exceeded)
            if (ls && (ls.transformers?.length || 0) > 0 && (!cs.transformers || cs.transformers.length === 0)) {
              hasLocalKeep = true;
              return {
                ...cs,
                transformers: ls.transformers,
                updatedAt: ls.updatedAt || new Date().toISOString()
              };
            }
            return cs;
          });

          const finalSheets = hasLocalKeep ? mergedSheets : cloudSheets;
          const finalJson = JSON.stringify(finalSheets);
          lastSavedSheetsJsonRef.current = finalJson;
          setSheets(finalSheets);
          try {
            localStorage.setItem(STORAGE_KEY_SHEETS, finalJson);
          } catch {}
          setSheetConfig(prev => ({
            ...prev,
            lastSyncedAt: new Date().toLocaleTimeString('th-TH'),
            syncStatus: 'success',
            errorMessage: undefined
          }));

          if (hasLocalKeep) {
            try {
              localStorage.setItem(STORAGE_KEY_SHEETS, finalJson);
            } catch {}
            if (!isCloudWriteQuotaExhausted()) {
              saveSheetsToCloudFirestore(finalSheets).catch(() => {});
            }
          }
        }
      } catch (err: any) {
        console.warn('Initial Cloud Firestore fetch notice:', err);
      } finally {
        if (isMounted) {
          setIsCloudInitialLoaded(true);
        }
      }
    }

    loadPrimaryFromFirebase();

    // 2. Real-time live listener from Firebase Firestore (instant cross-tab & multi-device sync)
    const unsubscribeCloud = subscribeToCloudSheets(
      (remoteSheets) => {
        if (!isMounted || !remoteSheets || remoteSheets.length === 0) return;
        const remoteJson = JSON.stringify(remoteSheets);

        // Only update local state if remote changed compared to our last saved version
        if (remoteJson !== lastSavedSheetsJsonRef.current) {
          lastSavedSheetsJsonRef.current = remoteJson;
          setSheets(remoteSheets);
          try {
            localStorage.setItem(STORAGE_KEY_SHEETS, remoteJson);
          } catch {}
          setSheetConfig(prev => ({
            ...prev,
            lastSyncedAt: new Date().toLocaleTimeString('th-TH'),
            syncStatus: 'success',
            errorMessage: undefined
          }));
        }
      },
      (err) => {
        console.warn('Real-time subscription warning:', err);
      }
    );

    return () => {
      isMounted = false;
      unsubscribeCloud();
    };
  }, []);

  // Auto-save any local edits directly to Firebase Firestore as Primary Database
  useEffect(() => {
    // CRITICAL: Do NOT auto-save if cloud hasn't initially loaded, or if the user has NOT made any manual edits in this session!
    // This prevents stale localStorage on other devices from overwriting authoritative Cloud Firestore data upon simply opening the app.
    if (!isCloudAutoSync || !isCloudInitialLoaded || isReadOnly || !hasUserEditedRef.current) return;

    // Check if sheets data has actually changed compared to the last saved payload
    const currentJson = JSON.stringify(sheets);
    if (currentJson === lastSavedSheetsJsonRef.current) return;

    const timer = setTimeout(async () => {
      if (isCloudSyncingRef.current) return;

      // 1. Always guarantee LocalStorage is saved
      try {
        localStorage.setItem(STORAGE_KEY_SHEETS, currentJson);
      } catch {}

      // 2. Check if Firestore write quota is already exhausted: if so, keep local and don't spam backend!
      if (isCloudWriteQuotaExhausted()) {
        lastSavedSheetsJsonRef.current = currentJson;
        hasUserEditedRef.current = false;
        const nowStr = new Date().toLocaleTimeString('th-TH');
        setLastSavedCloudTime(nowStr);
        setCloudSyncError(null);
        setSheetConfig(prev => ({
          ...prev,
          lastSyncedAt: nowStr,
          syncStatus: 'cached',
          errorMessage: 'บันทึกในเครื่องปลอดภัย (โควตา Cloud ประจำวันเต็ม)'
        }));
        return;
      }

      isCloudSyncingRef.current = true;
      setIsSavingToCloud(true);
      try {
        await saveSheetsToCloudFirestore(sheets);
        lastSavedSheetsJsonRef.current = currentJson;
        hasUserEditedRef.current = false;
        const nowStr = new Date().toLocaleTimeString('th-TH');
        setLastSavedCloudTime(nowStr);
        setCloudSyncError(null);
        try {
          localStorage.setItem('pea_last_cloud_save_time', nowStr);
        } catch {}
        setSheetConfig(prev => ({
          ...prev,
          lastSyncedAt: nowStr,
          syncStatus: 'success',
          errorMessage: undefined
        }));
      } catch (err: any) {
        console.warn('Auto-save to Cloud Firestore notice:', err);
        const isQuota = isQuotaError(err);
        if (isQuota) {
          recordQuotaExhausted();
        }
        // Always reset user edited ref and set lastSavedSheetsJsonRef to avoid infinite re-render loops!
        lastSavedSheetsJsonRef.current = currentJson;
        hasUserEditedRef.current = false;

        const errorMsg = isQuota
          ? 'โควตา Cloud ประจำวันเต็ม (ทำงานในโหมดแคชในเครื่อง)'
          : 'บันทึกลง Cloud ไม่สำเร็จ (ทำงานในโหมดออฟไลน์)';
        setCloudSyncError(errorMsg);
        setSheetConfig(prev => ({
          ...prev,
          syncStatus: isQuota ? 'cached' : 'error',
          errorMessage: errorMsg
        }));

        if (isQuota && !quotaExceededToastShownRef.current) {
          quotaExceededToastShownRef.current = true;
          showToast('โควตา Firebase ประจำวันเต็ม ระบบบันทึกข้อมูลลงในเครื่องอย่างปลอดภัย', 'info');
        }
      } finally {
        isCloudSyncingRef.current = false;
        setIsSavingToCloud(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [sheets, isCloudAutoSync, isCloudInitialLoaded, isReadOnly, showToast]);

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

  const handleSelectTransformerFromSearch = (transformer: Transformer, targetSheetId?: string) => {
    if (targetSheetId && targetSheetId !== activeSheetId) {
      setActiveSheetId(targetSheetId);
    }
    setCurrentView('canvas');
    setSelectedTransformer(transformer);
    setSelectedPath(null);
    setSelectedSwitch(null);
    setSelectedAnnotation(null);
    showToast(`ไปยังหม้อแปลง PEA: ${transformer.peaNo} (${transformer.name})`, 'info');
  };

  const handleSelectAnnotationFromSearch = (ann: AnnotationLabel, targetSheetId?: string) => {
    if (targetSheetId && targetSheetId !== activeSheetId) {
      setActiveSheetId(targetSheetId);
    }
    setCurrentView('canvas');
    setSelectedAnnotation(ann);
    setSelectedTransformer(null);
    setSelectedPath(null);
    setSelectedSwitch(null);
    showToast(`ไปยังสถานที่: ${ann.text}`, 'info');
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
    hasUserEditedRef.current = true;
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
    hasUserEditedRef.current = true;
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
    setAppConfirmModal({
      isOpen: true,
      title: 'ยืนยันการลบหน้าผังวงจร',
      message: `คุณต้องการลบหน้าผัง "${target?.sheetNo} ${target?.title}" ใช่หรือไม่?`,
      confirmText: 'ลบหน้านี้',
      confirmVariant: 'danger',
      onConfirm: () => {
        hasUserEditedRef.current = true;
        setSheets(prev => {
          const remaining = prev.filter(s => s.id !== sheetId);
          if (activeSheetId === sheetId) {
            setActiveSheetId(remaining[0].id);
          }
          return remaining;
        });
        showToast(`ลบหน้า ${target?.sheetNo} เรียบร้อยแล้ว`, 'info');
      }
    });
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

  // Batch Handlers for Multi-Selection Move, Delete, and Duplicate
  const handleBatchUpdatePositions = useCallback((updates: {
    transformers?: { id: string; x: number; y: number }[];
    switches?: { id: string; x: number; y: number }[];
    annotations?: { id: string; x: number; y: number }[];
    feederPaths?: FeederPath[];
  }) => {
    if (isReadOnly) return;
    updateActiveSheet(sheet => {
      let tfs = sheet.transformers || [];
      let sws = sheet.switches || [];
      let anns = sheet.annotations || [];
      let paths = sheet.feederPaths || [];

      if (updates.transformers && updates.transformers.length > 0) {
        const map = new Map(updates.transformers.map(u => [u.id, u]));
        tfs = tfs.map(t => {
          const u = map.get(t.id);
          return u ? { ...t, x: u.x, y: u.y } : t;
        });
      }
      if (updates.switches && updates.switches.length > 0) {
        const map = new Map(updates.switches.map(u => [u.id, u]));
        sws = sws.map(s => {
          const u = map.get(s.id);
          return u ? { ...s, x: u.x, y: u.y } : s;
        });
      }
      if (updates.annotations && updates.annotations.length > 0) {
        const map = new Map(updates.annotations.map(u => [u.id, u]));
        anns = anns.map(a => {
          const u = map.get(a.id);
          return u ? { ...a, x: u.x, y: u.y } : a;
        });
      }
      if (updates.feederPaths && updates.feederPaths.length > 0) {
        const map = new Map(updates.feederPaths.map(p => [p.id, p]));
        paths = paths.map(p => map.get(p.id) || p);
      }

      return {
        transformers: tfs,
        switches: sws,
        annotations: anns,
        feederPaths: paths
      };
    });
  }, [isReadOnly, updateActiveSheet]);

  const handleBatchDelete = useCallback((selection: {
    transformerIds: string[];
    switchIds: string[];
    annotationIds: string[];
    pathIds: string[];
  }) => {
    if (isReadOnly) return;
    const total = selection.transformerIds.length + selection.switchIds.length + selection.annotationIds.length + selection.pathIds.length;
    if (total === 0) return;

    if (selection.transformerIds.length > 0) {
      const set = new Set(selection.transformerIds);
      setTransformers(prev => prev.filter(t => !set.has(t.id)));
    }
    if (selection.switchIds.length > 0) {
      const set = new Set(selection.switchIds);
      setSwitches(prev => prev.filter(s => !set.has(s.id)));
    }
    if (selection.annotationIds.length > 0) {
      const set = new Set(selection.annotationIds);
      setAnnotations(prev => prev.filter(a => !set.has(a.id)));
    }
    if (selection.pathIds.length > 0) {
      const set = new Set(selection.pathIds);
      setFeederPaths(prev => prev.filter(p => !set.has(p.id)));
    }
    setSelectedTransformer(null);
    setSelectedPath(null);
    setSelectedSwitch(null);
    setSelectedAnnotation(null);
    showToast(`ลบรายการที่เลือก ${total} รายการ เรียบร้อยแล้ว`, 'info');
  }, [isReadOnly, setTransformers, setSwitches, setAnnotations, setFeederPaths, showToast]);

  const handleBatchDuplicate = useCallback((selection: {
    transformerIds: string[];
    switchIds: string[];
    annotationIds: string[];
    pathIds: string[];
  }) => {
    if (isReadOnly) return;
    const offset = 20;

    const newTransformers: Transformer[] = [];
    const newSwitches: SwitchNode[] = [];
    const newAnnotations: AnnotationLabel[] = [];
    const newPaths: FeederPath[] = [];

    if (selection.transformerIds.length > 0) {
      const set = new Set(selection.transformerIds);
      transformers.filter(t => set.has(t.id)).forEach(t => {
        newTransformers.push({
          ...t,
          id: `tf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: `${t.name} (สำเนา)`,
          x: t.x + offset,
          y: t.y + offset
        });
      });
      setTransformers(prev => [...prev, ...newTransformers]);
    }

    if (selection.switchIds.length > 0) {
      const set = new Set(selection.switchIds);
      switches.filter(s => set.has(s.id)).forEach(s => {
        newSwitches.push({
          ...s,
          id: `sw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          code: `${s.code}-สำเนา`,
          x: s.x + offset,
          y: s.y + offset
        });
      });
      setSwitches(prev => [...prev, ...newSwitches]);
    }

    if (selection.annotationIds.length > 0) {
      const set = new Set(selection.annotationIds);
      annotations.filter(a => set.has(a.id)).forEach(a => {
        newAnnotations.push({
          ...a,
          id: `ann-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          text: `${a.text} (สำเนา)`,
          x: a.x + offset,
          y: a.y + offset
        });
      });
      setAnnotations(prev => [...prev, ...newAnnotations]);
    }

    if (selection.pathIds.length > 0) {
      const set = new Set(selection.pathIds);
      feederPaths.filter(p => set.has(p.id)).forEach(p => {
        newPaths.push({
          ...p,
          id: `path-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: p.name ? `${p.name} (สำเนา)` : undefined,
          points: p.points.map(pt => ({ x: pt.x + offset, y: pt.y + offset }))
        });
      });
      setFeederPaths(prev => [...prev, ...newPaths]);
    }

    const total = newTransformers.length + newSwitches.length + newAnnotations.length + newPaths.length;
    if (total > 0) {
      showToast(`ทำซ้ำรายการที่เลือก ${total} รายการ เรียบร้อยแล้ว`);
    }
  }, [isReadOnly, transformers, switches, annotations, feederPaths, setTransformers, setSwitches, setAnnotations, setFeederPaths, showToast]);

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

  const handleOpenAddAnnotationModal = (pos?: { x: number; y: number }, initialType?: AnnotationType) => {
    if (isReadOnly) return;
    const defaultColors: Record<string, string> = {
      school: '#1d4ed8',
      temple: '#d97706',
      hospital: '#dc2626',
      government: '#0284c7',
      makro: '#e11d48',
      lotus: '#059669',
      seven_eleven: '#ea580c'
    };
    const defaultTexts: Record<string, string> = {
      school: 'รร.ฝางชนูปถัมภ์',
      temple: 'วัดสวนดอก',
      hospital: 'รพ.ฝาง',
      government: 'ที่ว่าการอำเภอฝาง',
      makro: 'แมคโคร ฝาง',
      lotus: 'โลตัส ฝาง',
      seven_eleven: '7-Eleven สาขาสวนดอก'
    };

    if (initialType) {
      setEditingAnnotation({
        id: `ann-${Date.now()}`,
        text: defaultTexts[initialType] || '',
        type: initialType,
        color: defaultColors[initialType] || '#1d4ed8',
        x: pos?.x || 400,
        y: pos?.y || 400,
        orientation: 'horizontal',
        fontSize: 13
      });
    } else {
      setEditingAnnotation(null);
    }
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

  const handleOpenProposeCreateDraft = (pos?: { x: number; y: number }) => {
    setDraftModalActionType('create');
    setDraftInitialTransformer(null);
    setDraftProposedPosition(pos || { x: 500, y: 400 });
    setIsDraftModalOpen(true);
  };

  const handleOpenProposeEditDraft = (t: Transformer) => {
    setDraftModalActionType('update');
    setDraftInitialTransformer(t);
    setDraftProposedPosition({ x: t.x, y: t.y });
    setIsDraftModalOpen(true);
  };

  const handleApproveAndApplyDraft = async (draft: TransformerDraft) => {
    try {
      const targetSheetId = draft.sheetId;
      const proposed = draft.transformerData;

      setSheets(prevSheets => {
        return prevSheets.map(sheet => {
          if (sheet.id !== targetSheetId) return sheet;

          const currentTfs = sheet.transformers || [];
          let updatedTfs = [...currentTfs];

          if (draft.actionType === 'create') {
            const newTf: Transformer = {
              id: `tf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              peaNo: proposed.peaNo || 'PEA-DRAFT',
              name: proposed.name || 'หม้อแปลงใหม่',
              kva: proposed.kva || 100,
              type: proposed.type || 'public',
              phase: proposed.phase || '3P',
              poleNo: proposed.poleNo || '',
              feeder: proposed.feeder || sheet.feederCode || 'FAA-06',
              branch: proposed.branch || '',
              x: proposed.x || 500,
              y: proposed.y || 400,
              latitude: proposed.latitude,
              longitude: proposed.longitude,
              orientation: proposed.orientation || 'top',
              textPosition: proposed.textPosition || 'auto',
              notes: proposed.notes || (draft.requesterName ? `เสนอโดย: ${draft.requesterName}` : undefined)
            };
            updatedTfs = [newTf, ...updatedTfs];
          } else if (draft.actionType === 'update') {
            const originalId = draft.targetTransformerId;
            updatedTfs = updatedTfs.map(t => {
              if (t.id === originalId || (t.peaNo && t.peaNo === proposed.peaNo)) {
                return {
                  ...t,
                  ...proposed,
                  id: t.id,
                  x: proposed.x !== undefined ? proposed.x : t.x,
                  y: proposed.y !== undefined ? proposed.y : t.y
                };
              }
              return t;
            });
          }

          return {
            ...sheet,
            transformers: updatedTfs,
            updatedAt: new Date().toISOString()
          };
        });
      });

      const adminEmail = currentUser?.email || currentUser?.displayName || 'admin';
      await approveTransformerDraft(draft.id, adminEmail);

      showToast(`อนุมัติและนำหม้อแปลง ${proposed.peaNo || ''} เข้าสู่ผังแล้ว`, 'success');
    } catch (err: any) {
      console.error('Failed to approve draft:', err);
      showToast(err.message || 'เกิดข้อผิดพลาดในการอนุมัติแบบร่าง', 'error');
      throw err;
    }
  };

  const handleOpenAddModal = (pos?: { x: number; y: number }) => {
    if (isReadOnly && !currentUser) {
      handleOpenProposeCreateDraft(pos);
      return;
    }
    setEditingTransformer(null);
    setNewTransformerDefaultPos(pos || { x: 400, y: 400 });
    setIsModalOpen(true);
  };

  const handleEditTransformer = (t: Transformer) => {
    if (isReadOnly && !currentUser) {
      handleOpenProposeEditDraft(t);
      return;
    }
    const original = transformers.find(item => item.id === t.id) || t;
    setEditingTransformer(original);
    setIsModalOpen(true);
  };

  const handleSwitchToCanvasWithFocus = (t: Transformer) => {
    setSelectedTransformer(t);
    setCurrentView('canvas');
  };

  const handleResetToDefault = () => {
    setAppConfirmModal({
      isOpen: true,
      title: 'รีเซ็ตผังหน้าปัจจุบัน',
      message: 'คุณต้องการรีเซ็ตข้อมูลผังหน้าปัจจุบัน และล้างหม้อแปลงในหน้านี้ออกทั้งหมดหรือไม่?',
      confirmText: 'รีเซ็ตหน้านี้',
      confirmVariant: 'danger',
      onConfirm: () => {
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
    });
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

  // 1. Auth Loading Splash Screen
  if (isAuthLoading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white font-sans select-none p-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/25 mb-4 animate-bounce">
          <Zap className="w-8 h-8 fill-white text-white" />
        </div>
        <h2 className="text-base font-bold text-slate-100 mb-1">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</h2>
        <p className="text-xs text-slate-400">ระบบผังหม้อแปลงและวงจรจำหน่ายไฟฟ้า (กฟส.ฝาง)</p>
      </div>
    );
  }

  // 2. Authentication Gate: Require Login only for editing; allow View-Only access without login
  if (!currentUser && !isReadOnly) {
    return (
      <LoginPage 
        onSuccess={() => showToast('เข้าสู่ระบบสำเร็จ ยินดีต้อนรับสู่ระบบผังวงจรไฟฟ้า')} 
        onEnterViewOnly={() => {
          setIsReadOnly(true);
          showToast('เข้าสู่โหมดดูผังวงจรอย่างเดียว (ไม่ต้องเข้าสู่ระบบ)', 'info');
        }}
      />
    );
  }

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
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        sheetConfig={sheetConfig}
        sheetTitle={activeSheet.title}
        sheetNo={activeSheet.sheetNo}
        activeSheetId={activeSheet.id}
        sheets={sheets}
        totalSheets={sheets.length}
        currentUser={currentUser}
        onSignIn={() => setIsLoginModalOpen(true)}
        onSignOut={handleSignOut}
        onSelectView={setCurrentView}
        onSelectSheet={handleSelectSheet}
        onSearchChange={setSearchQuery}
        onSelectTransformer={handleSelectTransformerFromSearch}
        onSelectAnnotation={handleSelectAnnotationFromSearch}
        onThemeToggle={handleThemeToggle}
        onToggleDraggable={handleToggleDraggable}
        onToggleReadOnly={handleToggleReadOnly}
        onOpenAddModal={() => handleOpenAddModal()}
        onOpenGoogleSheetsModal={() => setIsSheetsModalOpen(true)}
        onPrintDiagram={() => setIsPrintModalOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenEditSheetModal={() => handleOpenEditSheetModal(activeSheet)}
        pendingDraftsCount={pendingDraftsCount}
        onOpenDraftApprovalModal={() => setIsDraftApprovalModalOpen(true)}
        onOpenProposeDraft={() => handleOpenProposeCreateDraft()}
        onOpenRecoveryModal={() => setIsRecoveryModalOpen(true)}
        isSavingToCloud={isSavingToCloud}
        lastSavedCloudTime={lastSavedCloudTime}
        cloudSyncError={cloudSyncError}
        onManualSaveToCloud={handleManualSaveToCloud}
      />

      {/* Transformers Status Banner */}
      {totalAllTransformers === 0 && (
        <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 dark:text-slate-300 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span>
              <b>ผังวงจรว่าง (0 หม้อแปลง):</b> ลบหม้อแปลงทั้งหมดออกเรียบร้อยแล้ว ท่านสามารถคลิกบนเส้นสายส่งเพื่อวางหม้อแปลงใหม่ นำเข้าไฟล์ CSV หรือโหลดชุดข้อมูลมาตรฐาน กฟส.ฝาง ได้ทุกเมื่อ
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestoreFullFangDataset}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>โหลดชุดข้อมูล กฟส.ฝาง (100 เครื่อง)</span>
            </button>
            <button
              onClick={() => setIsRecoveryModalOpen(true)}
              className="px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ศูนย์กู้คืน / นำเข้าไฟล์</span>
            </button>
          </div>
        </div>
      )}

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
              onFilterTypeChange={setFilterType}
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
              onUpdateAnnotation={isReadOnly ? undefined : handleUpdateAnnotation}
              onAddSwitchAt={isReadOnly ? undefined : (x, y) => handleOpenAddSwitchModal({ x, y })}
              onAddAnnotationAt={isReadOnly ? undefined : (x, y, initialType) => handleOpenAddAnnotationModal({ x, y }, initialType)}
              onEditTransformer={isReadOnly ? () => {} : handleEditTransformer}
              onDeleteTransformer={isReadOnly ? () => {} : handleDeleteTransformer}
              onAddTransformerAt={isReadOnly ? () => {} : (x, y) => handleOpenAddModal({ x, y })}
              onBatchUpdatePositions={isReadOnly ? undefined : handleBatchUpdatePositions}
              onBatchDelete={isReadOnly ? undefined : handleBatchDelete}
              onBatchDuplicate={isReadOnly ? undefined : handleBatchDuplicate}
            />

            {/* Selected Transformer Detail Drawer */}
            <TransformerDetailDrawer
              transformer={selectedTransformer}
              isReadOnly={isReadOnly}
              onClose={() => setSelectedTransformer(null)}
              onEdit={handleEditTransformer}
              onDelete={handleDeleteTransformer}
              onUpdatePosition={handleUpdatePosition}
              onProposeDraftEdit={handleOpenProposeEditDraft}
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
          hasUserEditedRef.current = true;
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
          showToast(`อัปเดตข้อมูลหม้อแปลงทุกหน้า (${withPaths.length} หน้า รวม ${totalCount} เครื่อง) เรียบร้อยแล้ว`);
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

      {/* Login Modal for unauthenticated users in View Mode who want to log in & edit */}
      {isLoginModalOpen && !currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <LoginPage
            onSuccess={() => {
              setIsLoginModalOpen(false);
              setIsReadOnly(false);
              showToast('เข้าสู่ระบบสำเร็จ ยินดีต้อนรับสู่โหมดแก้ไขผังวงจร');
            }}
            onEnterViewOnly={() => {
              setIsLoginModalOpen(false);
              setIsReadOnly(true);
            }}
            onClose={() => setIsLoginModalOpen(false)}
          />
        </div>
      )}

      {/* Transformer Draft Proposal Modal (For Guest or View-only users) */}
      <TransformerDraftModal
        isOpen={isDraftModalOpen}
        onClose={() => setIsDraftModalOpen(false)}
        sheetId={activeSheet.id}
        sheetTitle={activeSheet.title}
        actionType={draftModalActionType}
        initialTransformer={draftInitialTransformer}
        proposedPosition={draftProposedPosition}
        onDraftSubmitted={() => {
          showToast('ส่งแบบร่างเรียบร้อยแล้ว รอผู้ดูแลระบบตรวจสอบและอนุมัติ', 'success');
        }}
        showToast={showToast}
      />

      {/* Admin Review / User Tracking Drafts Modal */}
      <DraftApprovalModal
        isOpen={isDraftApprovalModalOpen}
        onClose={() => setIsDraftApprovalModalOpen(false)}
        drafts={drafts}
        sheets={sheets}
        currentUser={currentUser ? {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName
        } : null}
        onApproveAndApply={handleApproveAndApplyDraft}
        onNavigateToTransformer={(targetSheetId, transformerId) => {
          setActiveSheetId(targetSheetId);
          if (transformerId) {
            const sh = sheets.find(s => s.id === targetSheetId);
            const tf = sh?.transformers?.find(t => t.id === transformerId);
            if (tf) setSelectedTransformer(tf);
          }
          setIsDraftApprovalModalOpen(false);
          showToast('ไปยังตำแหน่งหม้อแปลงที่เลือกแล้ว', 'info');
        }}
        showToast={showToast}
      />

      {/* Emergency Data Recovery Modal */}
      <DataRecoveryModal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        currentSheets={sheets}
        onRestoreSheets={(restored) => {
          setSheets(restored);
          try {
            localStorage.setItem(STORAGE_KEY_SHEETS, JSON.stringify(restored));
          } catch {}
          if (restored[0]) {
            setActiveSheetId(restored[0].id);
          }
        }}
        showToast={showToast}
      />

      {/* Global In-App Confirmation Modal */}
      <ConfirmModal
        isOpen={appConfirmModal.isOpen}
        title={appConfirmModal.title}
        message={appConfirmModal.message}
        confirmText={appConfirmModal.confirmText}
        cancelText={appConfirmModal.cancelText}
        confirmVariant={appConfirmModal.confirmVariant}
        onConfirm={appConfirmModal.onConfirm}
        onClose={() => setAppConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
