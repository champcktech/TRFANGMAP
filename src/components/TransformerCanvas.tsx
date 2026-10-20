import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Transformer, SwitchNode, FeederPath, AnnotationLabel, AnnotationType } from '../types';
import { 
  transformDataToLandscape, 
  transformPointToPortrait,
  getTransformerGeometry
} from '../utils/orientation';
import { getGoogleMapsNavUrl, isValidLatLng } from '../utils/geoUtils';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff,
  Filter,
  Move, 
  Zap,
  Info,
  CheckCircle2,
  Lock,
  Unlock,
  Layers,
  Search,
  PenTool,
  GitCommit,
  GitBranch,
  X,
  Check,
  MousePointer,
  ChevronDown,
  Power,
  Type,
  GripVertical,
  Landmark,
  BoxSelect,
  Copy
} from 'lucide-react';

export interface MultiSelection {
  transformerIds: string[];
  switchIds: string[];
  annotationIds: string[];
  pathIds: string[];
}

interface TransformerCanvasProps {
  sheetId?: string;
  isReadOnly?: boolean;
  transformers: Transformer[];
  switches: SwitchNode[];
  feederPaths: FeederPath[];
  annotations: AnnotationLabel[];
  selectedId: string | null;
  selectedPathId?: string | null;
  selectedSwitchId?: string | null;
  selectedAnnotationId?: string | null;
  searchQuery: string;
  filterKva: number | null;
  filterType?: 'all' | 'public' | 'private' | 'none';
  onFilterTypeChange?: (type: 'all' | 'public' | 'private' | 'none') => void;
  theme: 'white' | 'blueprint' | 'dark';
  isDraggable: boolean;
  onToggleDraggable?: () => void;
  onSelectTransformer: (t: Transformer | null) => void;
  onSelectSwitch?: (s: SwitchNode | null) => void;
  onSelectAnnotation?: (ann: AnnotationLabel | null) => void;
  onSelectPath?: (path: FeederPath | null) => void;
  onUpdateTransformerPosition: (id: string, x: number, y: number) => void;
  onUpdateSwitchPosition?: (id: string, x: number, y: number) => void;
  onUpdateAnnotationPosition?: (id: string, x: number, y: number) => void;
  onUpdateFeederPath?: (path: FeederPath) => void;
  onDeleteFeederPath?: (id: string) => void;
  onAddFeederPath?: (path: FeederPath) => void;
  onEditTransformer: (t: Transformer) => void;
  onDeleteTransformer: (id: string) => void;
  onDeleteSwitch?: (id: string) => void;
  onDeleteAnnotation?: (id: string) => void;
  onEditAnnotation?: (ann: AnnotationLabel) => void;
  onUpdateAnnotation?: (ann: AnnotationLabel) => void;
  onAddTransformerAt: (x: number, y: number) => void;
  onAddSwitchAt?: (x: number, y: number) => void;
  onAddAnnotationAt?: (x: number, y: number, initialType?: AnnotationType) => void;
  onBatchUpdatePositions?: (updates: {
    transformers?: { id: string; x: number; y: number }[];
    switches?: { id: string; x: number; y: number }[];
    annotations?: { id: string; x: number; y: number }[];
    feederPaths?: FeederPath[];
  }) => void;
  onBatchDelete?: (selection: MultiSelection) => void;
  onBatchDuplicate?: (selection: MultiSelection) => void;
}

export const TransformerCanvas: React.FC<TransformerCanvasProps> = ({
  sheetId,
  isReadOnly = false,
  transformers = [],
  switches = [],
  feederPaths = [],
  annotations = [],
  selectedId,
  selectedPathId,
  selectedSwitchId,
  selectedAnnotationId,
  searchQuery,
  filterKva,
  filterType = 'all',
  onFilterTypeChange,
  theme,
  isDraggable,
  onToggleDraggable,
  onSelectTransformer,
  onSelectSwitch,
  onSelectAnnotation,
  onSelectPath,
  onUpdateTransformerPosition,
  onUpdateSwitchPosition,
  onUpdateAnnotationPosition,
  onUpdateFeederPath,
  onDeleteFeederPath,
  onAddFeederPath,
  onEditTransformer,
  onDeleteTransformer,
  onDeleteSwitch,
  onDeleteAnnotation,
  onEditAnnotation,
  onUpdateAnnotation,
  onAddTransformerAt,
  onAddSwitchAt,
  onAddAnnotationAt,
  onBatchUpdatePositions,
  onBatchDelete,
  onBatchDuplicate
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 40, y: 20 });
  const panRef = useRef(pan);
  panRef.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dragging elements state
  const [draggingItem, setDraggingItem] = useState<{
    type: 'transformer' | 'switch' | 'annotation';
    id: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    currentX?: number;
    currentY?: number;
  } | null>(null);

  // Line vertex dragging state
  const [draggingVertex, setDraggingVertex] = useState<{
    pathId: string;
    pointIndex: number;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    dx: number;
    dy: number;
  } | null>(null);

  const draggingVertexRef = useRef(draggingVertex);
  draggingVertexRef.current = draggingVertex;

  // Drawing new line state
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[]>([]);
  const [mouseCanvasPos, setMouseCanvasPos] = useState<{ x: number; y: number } | null>(null);

  const dragMovedRef = useRef<boolean>(false);
  const dragRafRef = useRef<number | null>(null);
  const hasUserPannedOrZoomedRef = useRef<boolean>(false);
  const [hoveredTransformer, setHoveredTransformer] = useState<Transformer | null>(null);
  const [hoveredPathId, setHoveredPathId] = useState<string | null>(null);
  const [canvasClickMode, setCanvasClickMode] = useState<'select' | 'marquee' | 'add' | 'add_switch' | 'add_annotation' | 'add_landmark' | 'edit_line' | 'draw_line'>('select');
  const [pendingLandmarkType, setPendingLandmarkType] = useState<AnnotationType | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Multi-Selection State (รองรับการเลือกและย้ายหม้อแปลง, สวิตช์, เส้นวงจร, ป้ายข้อความ ทีละหลายๆ สัญลักษณ์พร้อมกัน)
  const [multiSelection, setMultiSelection] = useState<MultiSelection>({
    transformerIds: selectedId ? [selectedId] : [],
    switchIds: selectedSwitchId ? [selectedSwitchId] : [],
    annotationIds: selectedAnnotationId ? [selectedAnnotationId] : [],
    pathIds: selectedPathId ? [selectedPathId] : []
  });

  // Multi-Dragging State (เคลื่อนย้ายสัญลักษณ์เดี่ยวหรือกลุ่มแบบ Real-Time ไหลลื่น 60fps ไม่มีกระตุก ไม่เวียนหัว)
  const [multiDragging, setMultiDragging] = useState<{
    startX: number;
    startY: number;
    dx: number;
    dy: number;
    items: {
      transformers: { id: string; initialX: number; initialY: number }[];
      switches: { id: string; initialX: number; initialY: number }[];
      annotations: { id: string; initialX: number; initialY: number }[];
      feederPaths: { id: string; initialPoints: { x: number; y: number }[] }[];
    };
  } | null>(null);

  const multiDraggingRef = useRef(multiDragging);
  multiDraggingRef.current = multiDragging;

  // Marquee Selection Box (Rubber-band selection)
  const [marqueeBox, setMarqueeBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isShift: boolean;
  } | null>(null);

  const [nudgeStep, setNudgeStep] = useState<number>(10);
  const canvasSizeMode: 'a4_landscape' = 'a4_landscape'; // ล็อคขนาดเท่า A4 แนวนอนเป็นมาตรฐาน
  const [symbolScale, setSymbolScale] = useState<number>(0.85); // 0.85 default (ขนาดสัญลักษณ์กะทัดรัดลง)
  const canvasOrientation: 'landscape' = 'landscape'; // แนวนอนเป็นมาตรฐานถาวรตามความต้องการของผู้ใช้
  const [isTextBgTransparent, setIsTextBgTransparent] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('canvas_text_bg_transparent');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {
      // fallback
    }
    return true; // ค่าเริ่มต้นเป็นพื้นโปร่งใสตามความต้องการของผู้ใช้
  });

  // Draggable floating toolbar state
  const canvasRootRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('canvas_floating_toolbar_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return { x: parsed.x, y: parsed.y };
        }
      }
    } catch {
      // fallback
    }
    return { x: 8, y: 8 };
  });
  const [isDraggingToolbar, setIsDraggingToolbar] = useState(false);
  const toolbarDragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  const handleToolbarPointerDown = useCallback((e: React.PointerEvent) => {
    // Only primary button
    if (e.button !== 0) return;
    // Don't drag if clicking buttons, links, or inputs
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, [role="button"], a')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    toolbarDragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: toolbarPos.x,
      initY: toolbarPos.y
    };
    setIsDraggingToolbar(true);

    const onPointerMove = (ev: PointerEvent) => {
      if (!toolbarDragStartRef.current) return;
      const dx = ev.clientX - toolbarDragStartRef.current.startX;
      const dy = ev.clientY - toolbarDragStartRef.current.startY;
      let nextX = toolbarDragStartRef.current.initX + dx;
      let nextY = toolbarDragStartRef.current.initY + dy;

      if (canvasRootRef.current && toolbarRef.current) {
        const rootRect = canvasRootRef.current.getBoundingClientRect();
        const tbRect = toolbarRef.current.getBoundingClientRect();
        const maxX = Math.max(8, rootRect.width - tbRect.width - 8);
        const maxY = Math.max(8, rootRect.height - tbRect.height - 8);
        nextX = Math.max(8, Math.min(nextX, maxX));
        nextY = Math.max(8, Math.min(nextY, maxY));
      }

      setToolbarPos({ x: nextX, y: nextY });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      setIsDraggingToolbar(false);
      toolbarDragStartRef.current = null;

      setToolbarPos(current => {
        try {
          localStorage.setItem('canvas_floating_toolbar_pos', JSON.stringify(current));
        } catch {}
        return current;
      });
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }, [toolbarPos]);

  // Adjust toolbar position if window resized beyond bounds
  useEffect(() => {
    const handleResize = () => {
      if (canvasRootRef.current && toolbarRef.current) {
        const rootRect = canvasRootRef.current.getBoundingClientRect();
        const tbRect = toolbarRef.current.getBoundingClientRect();
        const maxX = Math.max(8, rootRect.width - tbRect.width - 8);
        const maxY = Math.max(8, rootRect.height - tbRect.height - 8);
        setToolbarPos(prev => {
          const clampedX = Math.max(8, Math.min(prev.x, maxX));
          const clampedY = Math.max(8, Math.min(prev.y, maxY));
          if (clampedX !== prev.x || clampedY !== prev.y) {
            return { x: clampedX, y: clampedY };
          }
          return prev;
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ข้อมูลที่แสดงผลบน Canvas ตามมุมมอง (แนวตั้งตาม PDF หรือ แนวนอน)
  const displayData = useMemo(() => {
    if (canvasOrientation === 'landscape') {
      return transformDataToLandscape(transformers, switches, feederPaths, annotations);
    }
    return {
      transformers,
      switches,
      feederPaths,
      annotations
    };
  }, [canvasOrientation, transformers, switches, feederPaths, annotations]);

  // นับจำนวนหม้อแปลงแยกประเภท กฟภ. และ ผู้ใช้ไฟ
  const publicCount = useMemo(() => {
    return displayData.transformers.filter(t => t.type === 'public').length;
  }, [displayData.transformers]);

  const privateCount = useMemo(() => {
    return displayData.transformers.filter(t => t.type === 'private').length;
  }, [displayData.transformers]);

  // ตัวกรองความสามารถในการมองเห็นของหม้อแปลง (All, Public Only, Private Only, None)
  const isTransformerVisible = useCallback((t: Transformer) => {
    if (filterKva && t.kva !== filterKva) return false;
    if (filterType === 'none') return false;
    if (filterType === 'public' && t.type !== 'public') return false;
    if (filterType === 'private' && t.type !== 'private') return false;
    return true;
  }, [filterKva, filterType]);

  // Helper แปลงพิกัดจากหน้าจอ Canvas กลับไปเป็นพิกัดต้นฉบับ (Portrait Storage)
  const toPortraitCoords = useCallback((x: number, y: number) => {
    if (canvasOrientation === 'landscape') {
      return transformPointToPortrait(x, y);
    }
    return { x, y };
  }, [canvasOrientation]);

  // Canvas coordinate conversion helper
  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x: Math.round(x), y: Math.round(y) };
  }, [pan, zoom]);

  // Automatically reset any editing/drawing mode when in read-only mode
  useEffect(() => {
    if (isReadOnly) {
      setCanvasClickMode('select');
      setDrawingPoints([]);
      setMouseCanvasPos(null);
    }
  }, [isReadOnly]);

  // Synchronize single selection with multi-selection when single items are selected from outside
  useEffect(() => {
    const totalSelected = 
      multiSelection.transformerIds.length +
      multiSelection.switchIds.length +
      multiSelection.annotationIds.length +
      multiSelection.pathIds.length;

    if (totalSelected <= 1) {
      setMultiSelection({
        transformerIds: selectedId ? [selectedId] : [],
        switchIds: selectedSwitchId ? [selectedSwitchId] : [],
        annotationIds: selectedAnnotationId ? [selectedAnnotationId] : [],
        pathIds: selectedPathId ? [selectedPathId] : []
      });
    }
  }, [selectedId, selectedSwitchId, selectedAnnotationId, selectedPathId]);

  const totalSelectedCount = useMemo(() => {
    return (
      multiSelection.transformerIds.length +
      multiSelection.switchIds.length +
      multiSelection.annotationIds.length +
      multiSelection.pathIds.length
    );
  }, [multiSelection]);

  // คำนวณกรอบ Bounding Box ครอบคลุมทุกสัญลักษณ์และเส้นที่เลือกอยู่
  const selectedBounds = useMemo(() => {
    if (totalSelectedCount < 2) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    displayData.transformers.forEach(t => {
      if (multiSelection.transformerIds.includes(t.id)) {
        minX = Math.min(minX, t.x - 24);
        maxX = Math.max(maxX, t.x + 24);
        minY = Math.min(minY, t.y - 24);
        maxY = Math.max(maxY, t.y + 24);
      }
    });

    displayData.switches.forEach(s => {
      if (multiSelection.switchIds.includes(s.id)) {
        minX = Math.min(minX, s.x - 22);
        maxX = Math.max(maxX, s.x + 22);
        minY = Math.min(minY, s.y - 22);
        maxY = Math.max(maxY, s.y + 22);
      }
    });

    displayData.annotations.forEach(a => {
      if (multiSelection.annotationIds.includes(a.id)) {
        minX = Math.min(minX, a.x - 45);
        maxX = Math.max(maxX, a.x + 45);
        minY = Math.min(minY, a.y - 18);
        maxY = Math.max(maxY, a.y + 18);
      }
    });

    displayData.feederPaths.forEach(p => {
      if (multiSelection.pathIds.includes(p.id)) {
        p.points.forEach(pt => {
          minX = Math.min(minX, pt.x - 12);
          maxX = Math.max(maxX, pt.x + 12);
          minY = Math.min(minY, pt.y - 12);
          maxY = Math.max(maxY, pt.y + 12);
        });
      }
    });

    if (minX === Infinity) return null;
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }, [totalSelectedCount, multiSelection, displayData]);

  // เลื่อนตำแหน่งสัญลักษณ์และเส้นทั้งหมดที่เลือกไว้พร้อมกัน (Nudge)
  const handleNudgeSelection = useCallback((dx: number, dy: number) => {
    if (isReadOnly) return;
    const tfUpdates = displayData.transformers
      .filter(t => multiSelection.transformerIds.includes(t.id))
      .map(t => {
        const pt = toPortraitCoords(t.x + dx, t.y + dy);
        return { id: t.id, x: pt.x, y: pt.y };
      });

    const swUpdates = displayData.switches
      .filter(s => multiSelection.switchIds.includes(s.id))
      .map(s => {
        const pt = toPortraitCoords(s.x + dx, s.y + dy);
        return { id: s.id, x: pt.x, y: pt.y };
      });

    const annUpdates = displayData.annotations
      .filter(a => multiSelection.annotationIds.includes(a.id))
      .map(a => {
        const pt = toPortraitCoords(a.x + dx, a.y + dy);
        return { id: a.id, x: pt.x, y: pt.y };
      });

    const pathUpdates = displayData.feederPaths
      .filter(p => multiSelection.pathIds.includes(p.id))
      .map(p => {
        const original = feederPaths.find(orig => orig.id === p.id);
        const newPoints = p.points.map(pt => toPortraitCoords(pt.x + dx, pt.y + dy));
        return { ...(original || { id: p.id, points: newPoints }), points: newPoints };
      });

    if (onBatchUpdatePositions) {
      onBatchUpdatePositions({
        transformers: tfUpdates,
        switches: swUpdates,
        annotations: annUpdates,
        feederPaths: pathUpdates
      });
    } else {
      tfUpdates.forEach(u => onUpdateTransformerPosition(u.id, u.x, u.y));
      swUpdates.forEach(u => onUpdateSwitchPosition?.(u.id, u.x, u.y));
      annUpdates.forEach(u => onUpdateAnnotationPosition?.(u.id, u.x, u.y));
      pathUpdates.forEach(u => onUpdateFeederPath?.(u));
    }
  }, [
    isReadOnly,
    displayData,
    multiSelection,
    feederPaths,
    toPortraitCoords,
    onBatchUpdatePositions,
    onUpdateTransformerPosition,
    onUpdateSwitchPosition,
    onUpdateAnnotationPosition,
    onUpdateFeederPath
  ]);

  // Global window listeners for butter-smooth dragging & panning + Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isReadOnly) return;
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

      // Select All (Ctrl+A / Cmd+A)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setMultiSelection({
          transformerIds: transformers.filter(isTransformerVisible).map(t => t.id),
          switchIds: switches.map(s => s.id),
          annotationIds: annotations.map(a => a.id),
          pathIds: feederPaths.map(p => p.id)
        });
        return;
      }

      // Duplicate (Ctrl+D / Cmd+D)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (totalSelectedCount > 0 && onBatchDuplicate) {
          onBatchDuplicate(multiSelection);
        }
        return;
      }

      // Escape to clear selection
      if (e.key === 'Escape') {
        setMultiSelection({ transformerIds: [], switchIds: [], annotationIds: [], pathIds: [] });
        onSelectTransformer(null);
        onSelectPath?.(null);
        onSelectSwitch?.(null);
        onSelectAnnotation?.(null);
        if (canvasClickMode === 'marquee') setCanvasClickMode('select');
        return;
      }

      // Keyboard arrow keys for nudge (5px standard, 20px with Shift)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (totalSelectedCount > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 20 : 5;
          const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
          const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;
          handleNudgeSelection(dx, dy);
          return;
        }
      }

      // Delete key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (totalSelectedCount > 1) {
          e.preventDefault();
          if (onBatchDelete) {
            onBatchDelete(multiSelection);
          } else {
            multiSelection.transformerIds.forEach(id => onDeleteTransformer(id));
            multiSelection.switchIds.forEach(id => onDeleteSwitch?.(id));
            multiSelection.annotationIds.forEach(id => onDeleteAnnotation?.(id));
            multiSelection.pathIds.forEach(id => onDeleteFeederPath?.(id));
          }
          setMultiSelection({ transformerIds: [], switchIds: [], annotationIds: [], pathIds: [] });
          onSelectTransformer(null);
          onSelectPath?.(null);
          onSelectSwitch?.(null);
          onSelectAnnotation?.(null);
        } else if (selectedPathId && onDeleteFeederPath) {
          e.preventDefault();
          onDeleteFeederPath(selectedPathId);
          onSelectPath?.(null);
          setMultiSelection({ transformerIds: [], switchIds: [], annotationIds: [], pathIds: [] });
        } else if (selectedSwitchId && onDeleteSwitch) {
          e.preventDefault();
          onDeleteSwitch(selectedSwitchId);
          onSelectSwitch?.(null);
          setMultiSelection({ transformerIds: [], switchIds: [], annotationIds: [], pathIds: [] });
        } else if (selectedAnnotationId && onDeleteAnnotation) {
          e.preventDefault();
          onDeleteAnnotation(selectedAnnotationId);
          onSelectAnnotation?.(null);
          setMultiSelection({ transformerIds: [], switchIds: [], annotationIds: [], pathIds: [] });
        } else if (selectedId && onDeleteTransformer) {
          e.preventDefault();
          onDeleteTransformer(selectedId);
          onSelectTransformer(null);
          setMultiSelection({ transformerIds: [], switchIds: [], annotationIds: [], pathIds: [] });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isReadOnly,
    totalSelectedCount,
    multiSelection,
    transformers,
    switches,
    annotations,
    feederPaths,
    selectedPathId,
    selectedSwitchId,
    selectedAnnotationId,
    selectedId,
    canvasClickMode,
    onBatchDelete,
    onBatchDuplicate,
    handleNudgeSelection,
    onDeleteFeederPath,
    onDeleteSwitch,
    onDeleteAnnotation,
    onDeleteTransformer,
    onSelectPath,
    onSelectSwitch,
    onSelectAnnotation,
    onSelectTransformer
  ]);

  // Global window listeners for butter-smooth dragging & panning (60fps ultra-fluid, zero lag, zero jitter)
  useEffect(() => {
    if (!isPanning && !draggingItem && !draggingVertex && !multiDragging && !marqueeBox) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        hasUserPannedOrZoomedRef.current = true;
        setPan({
          x: e.clientX - startPan.x,
          y: e.clientY - startPan.y
        });
      } else if (marqueeBox) {
        const curCanvasPos = screenToCanvas(e.clientX, e.clientY);
        setMarqueeBox(prev => prev ? { ...prev, currentX: curCanvasPos.x, currentY: curCanvasPos.y } : null);
      } else if (multiDraggingRef.current) {
        const currentMD = multiDraggingRef.current;
        const curZoom = zoomRef.current || 1;
        const dx = (e.clientX - currentMD.startX) / curZoom;
        const dy = (e.clientY - currentMD.startY) / curZoom;

        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          dragMovedRef.current = true;
        }

        const updated = { ...currentMD, dx, dy };
        multiDraggingRef.current = updated;

        if (dragRafRef.current) cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = requestAnimationFrame(() => {
          setMultiDragging(updated);
        });
      } else if (draggingVertexRef.current) {
        const currentV = draggingVertexRef.current;
        const curZoom = zoomRef.current || 1;
        const dx = (e.clientX - currentV.startX) / curZoom;
        const dy = (e.clientY - currentV.startY) / curZoom;

        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          dragMovedRef.current = true;
        }

        const updated = { ...currentV, dx, dy };
        draggingVertexRef.current = updated;

        if (dragRafRef.current) cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = requestAnimationFrame(() => {
          setDraggingVertex(updated);
        });
      }
    };

    const handleWindowMouseUp = () => {
      if (dragRafRef.current) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }

      if (marqueeBox) {
        const x1 = Math.min(marqueeBox.startX, marqueeBox.currentX);
        const x2 = Math.max(marqueeBox.startX, marqueeBox.currentX);
        const y1 = Math.min(marqueeBox.startY, marqueeBox.currentY);
        const y2 = Math.max(marqueeBox.startY, marqueeBox.currentY);

        if (x2 - x1 > 6 || y2 - y1 > 6) {
          const matchedTransformers = displayData.transformers
            .filter(t => isTransformerVisible(t) && t.x >= x1 - 18 && t.x <= x2 + 18 && t.y >= y1 - 18 && t.y <= y2 + 18)
            .map(t => t.id);

          const matchedSwitches = displayData.switches
            .filter(s => s.x >= x1 - 18 && s.x <= x2 + 18 && s.y >= y1 - 18 && s.y <= y2 + 18)
            .map(s => s.id);

          const matchedAnnotations = displayData.annotations
            .filter(a => a.x >= x1 - 35 && a.x <= x2 + 35 && a.y >= y1 - 18 && a.y <= y2 + 18)
            .map(a => a.id);

          const matchedPaths = displayData.feederPaths
            .filter(p => p.points.some(pt => pt.x >= x1 - 12 && pt.x <= x2 + 12 && pt.y >= y1 - 12 && pt.y <= y2 + 12))
            .map(p => p.id);

          const newSel: MultiSelection = marqueeBox.isShift ? {
            transformerIds: Array.from(new Set([...multiSelection.transformerIds, ...matchedTransformers])),
            switchIds: Array.from(new Set([...multiSelection.switchIds, ...matchedSwitches])),
            annotationIds: Array.from(new Set([...multiSelection.annotationIds, ...matchedAnnotations])),
            pathIds: Array.from(new Set([...multiSelection.pathIds, ...matchedPaths]))
          } : {
            transformerIds: matchedTransformers,
            switchIds: matchedSwitches,
            annotationIds: matchedAnnotations,
            pathIds: matchedPaths
          };

          setMultiSelection(newSel);

          const total = newSel.transformerIds.length + newSel.switchIds.length + newSel.annotationIds.length + newSel.pathIds.length;
          if (total === 1) {
            if (newSel.transformerIds.length === 1) onSelectTransformer(transformers.find(t => t.id === newSel.transformerIds[0]) || null);
            else if (newSel.pathIds.length === 1) onSelectPath?.(feederPaths.find(p => p.id === newSel.pathIds[0]) || null);
            else if (newSel.switchIds.length === 1) onSelectSwitch?.(switches.find(s => s.id === newSel.switchIds[0]) || null);
            else if (newSel.annotationIds.length === 1) onSelectAnnotation?.(annotations.find(a => a.id === newSel.annotationIds[0]) || null);
          } else {
            onSelectTransformer(null);
            onSelectPath?.(null);
            onSelectSwitch?.(null);
            onSelectAnnotation?.(null);
          }
        }
        setMarqueeBox(null);
      }

      const activeMD = multiDraggingRef.current;
      if (activeMD) {
        const finalDx = Math.round(activeMD.dx || 0);
        const finalDy = Math.round(activeMD.dy || 0);

        if (Math.abs(finalDx) > 1 || Math.abs(finalDy) > 1) {
          const tfUpdates = activeMD.items.transformers.map(t => {
            const pt = toPortraitCoords(Math.round(t.initialX + finalDx), Math.round(t.initialY + finalDy));
            return { id: t.id, x: pt.x, y: pt.y };
          });

          const swUpdates = activeMD.items.switches.map(s => {
            const pt = toPortraitCoords(Math.round(s.initialX + finalDx), Math.round(s.initialY + finalDy));
            return { id: s.id, x: pt.x, y: pt.y };
          });

          const annUpdates = activeMD.items.annotations.map(a => {
            const pt = toPortraitCoords(Math.round(a.initialX + finalDx), Math.round(a.initialY + finalDy));
            return { id: a.id, x: pt.x, y: pt.y };
          });

          const pathUpdates = activeMD.items.feederPaths.map(p => {
            const original = feederPaths.find(orig => orig.id === p.id);
            const newPoints = p.initialPoints.map(pt => toPortraitCoords(Math.round(pt.x + finalDx), Math.round(pt.y + finalDy)));
            return { ...(original || { id: p.id, points: newPoints }), points: newPoints };
          });

          if (onBatchUpdatePositions) {
            onBatchUpdatePositions({
              transformers: tfUpdates,
              switches: swUpdates,
              annotations: annUpdates,
              feederPaths: pathUpdates
            });
          } else {
            tfUpdates.forEach(u => onUpdateTransformerPosition(u.id, u.x, u.y));
            swUpdates.forEach(u => onUpdateSwitchPosition?.(u.id, u.x, u.y));
            annUpdates.forEach(u => onUpdateAnnotationPosition?.(u.id, u.x, u.y));
            pathUpdates.forEach(u => onUpdateFeederPath?.(u));
          }
        }
        multiDraggingRef.current = null;
        setMultiDragging(null);
      }

      const activeV = draggingVertexRef.current;
      if (activeV && onUpdateFeederPath) {
        const finalDx = Math.round(activeV.dx || 0);
        const finalDy = Math.round(activeV.dy || 0);
        if (Math.abs(finalDx) > 1 || Math.abs(finalDy) > 1) {
          const newX = Math.round(activeV.initialX + finalDx);
          const newY = Math.round(activeV.initialY + finalDy);
          const targetPath = feederPaths.find(p => p.id === activeV.pathId);
          if (targetPath) {
            const pt = toPortraitCoords(newX, newY);
            const newPoints = [...targetPath.points];
            newPoints[activeV.pointIndex] = { x: pt.x, y: pt.y };
            onUpdateFeederPath({ ...targetPath, points: newPoints });
          }
        }
        draggingVertexRef.current = null;
        setDraggingVertex(null);
      }

      setIsPanning(false);
      setDraggingItem(null);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      if (dragRafRef.current) {
        cancelAnimationFrame(dragRafRef.current);
      }
    };
  }, [
    isPanning,
    !!multiDragging,
    !!marqueeBox,
    !!draggingVertex,
    startPan,
    screenToCanvas,
    displayData,
    isTransformerVisible,
    multiSelection,
    transformers,
    feederPaths,
    switches,
    annotations,
    onSelectTransformer,
    onSelectPath,
    onSelectSwitch,
    onSelectAnnotation,
    toPortraitCoords,
    onBatchUpdatePositions,
    onUpdateTransformerPosition,
    onUpdateSwitchPosition,
    onUpdateAnnotationPosition,
    onUpdateFeederPath
  ]);

  // Zoom handlers (Centered on viewport)
  const handleZoomIn = () => {
    hasUserPannedOrZoomedRef.current = true;
    if (!containerRef.current) {
      setZoom(z => Math.min(z * 1.2, 4.0));
      return;
    }
    const { clientWidth, clientHeight } = containerRef.current;
    const centerX = clientWidth / 2;
    const centerY = clientHeight / 2;
    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;
    const newZoom = Math.min(currentZoom * 1.2, 4.0);
    const canvasX = (centerX - currentPan.x) / currentZoom;
    const canvasY = (centerY - currentPan.y) / currentZoom;
    setZoom(newZoom);
    setPan({
      x: centerX - canvasX * newZoom,
      y: centerY - canvasY * newZoom
    });
  };

  const handleZoomOut = () => {
    hasUserPannedOrZoomedRef.current = true;
    if (!containerRef.current) {
      setZoom(z => Math.max(z / 1.2, 0.15));
      return;
    }
    const { clientWidth, clientHeight } = containerRef.current;
    const centerX = clientWidth / 2;
    const centerY = clientHeight / 2;
    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;
    const newZoom = Math.max(currentZoom / 1.2, 0.15);
    const canvasX = (centerX - currentPan.x) / currentZoom;
    const canvasY = (centerY - currentPan.y) / currentZoom;
    setZoom(newZoom);
    setPan({
      x: centerX - canvasX * newZoom,
      y: centerY - canvasY * newZoom
    });
  };

  const handleResetZoom = () => {
    hasUserPannedOrZoomedRef.current = false;
    handleFitToScreen();
  };

  // ขนาดแผ่นผังมาตรฐาน A4 Landscape เป๊ะ (2079 x 1470 px = 297 x 210 มม. ที่อัตราส่วน 1:√2 = 1.4142857 มาตรฐาน ISO 216)
  const canvasBounds = useMemo(() => {
    if (canvasSizeMode === 'a4_landscape') {
      // ขนาด A4 แนวนอนตามอัตราส่วน 297:210 เป๊ะ (7 px ต่อ 1 มม.)
      return {
        minX: 0,
        minY: 0,
        maxX: 2079,
        maxY: 1470,
        width: 2079,
        height: 1470
      };
    }

    if (canvasSizeMode === 'a4_portrait') {
      return {
        minX: 0,
        minY: 0,
        maxX: 1050,
        maxY: 1485,
        width: 1050,
        height: 1485
      };
    }

    // โหมดขยายอัตโนมัติตามตำแหน่งอุปกรณ์ (Auto Dynamic Bounds)
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    if (displayData.transformers.length === 0 && displayData.switches.length === 0 && displayData.feederPaths.length === 0) {
      return { minX: 0, minY: 0, maxX: 2079, maxY: 1470, width: 2079, height: 1470 };
    }

    displayData.transformers.forEach(t => {
      if (t.x !== undefined && t.x !== null) {
        minX = Math.min(minX, t.x - 70);
        maxX = Math.max(maxX, t.x + 180);
      }
      if (t.y !== undefined && t.y !== null) {
        minY = Math.min(minY, t.y - 60);
        maxY = Math.max(maxY, t.y + 90);
      }
    });

    displayData.switches.forEach(s => {
      minX = Math.min(minX, s.x - 50);
      maxX = Math.max(maxX, s.x + 50);
      minY = Math.min(minY, s.y - 50);
      maxY = Math.max(maxY, s.y + 50);
    });

    displayData.annotations.forEach(a => {
      minX = Math.min(minX, a.x - 40);
      maxX = Math.max(maxX, a.x + 220);
      minY = Math.min(minY, a.y - 40);
      maxY = Math.max(maxY, a.y + 60);
    });

    displayData.feederPaths.forEach(p => {
      p.points.forEach(pt => {
        minX = Math.min(minX, pt.x - 40);
        maxX = Math.max(maxX, pt.x + 40);
        minY = Math.min(minY, pt.y - 40);
        maxY = Math.max(maxY, pt.y + 40);
      });
    });

    const paddingRight = 120;
    const paddingBottom = 100;
    const minW = canvasOrientation === 'landscape' ? 2079 : 1050;
    const minH = canvasOrientation === 'landscape' ? 1470 : 1200;

    const width = Math.max(minW, Math.ceil((maxX + paddingRight) / 50) * 50);
    const height = Math.max(minH, Math.ceil((maxY + paddingBottom) / 50) * 50);

    return {
      minX: Math.max(0, minX),
      minY: Math.max(0, minY),
      maxX,
      maxY,
      width,
      height
    };
  }, [canvasSizeMode, displayData, canvasOrientation]);

  // ปรับขนาดและเลื่อนผังให้อยู่กึ่งกลางหน้าจอและแสดงกรอบผังครบสมบูรณ์ทุกส่วน (Fit to Screen)
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth <= 0 || clientHeight <= 0) return;

    const sheetW = canvasBounds.width;
    const sheetH = canvasBounds.height;

    const fitMarginX = 30;
    const fitMarginY = 30;
    const targetW = sheetW + fitMarginX * 2;
    const targetH = sheetH + fitMarginY * 2;

    const scaleX = clientWidth / targetW;
    const scaleY = clientHeight / targetH;
    const fittedZoom = Math.min(scaleX, scaleY);
    
    // ตั้งค่า zoom ให้อยู่ในช่วง 0.15 ถึง 1.5 โดยปรับให้เห็นผังทั้งหมดครบถ้วน
    const newZoom = Math.min(Math.max(fittedZoom, 0.15), 1.5);

    setZoom(newZoom);
    setPan({
      x: (clientWidth - sheetW * newZoom) / 2,
      y: (clientHeight - sheetH * newZoom) / 2
    });
  }, [canvasBounds.width, canvasBounds.height]);

  const handleFitToScreenRef = useRef(handleFitToScreen);
  handleFitToScreenRef.current = handleFitToScreen;

  // ปรับมุมมองให้อัตโนมัติเมื่อเปิดหน้าเว็บ หรือเมื่อสลับแผ่นผัง
  useEffect(() => {
    hasUserPannedOrZoomedRef.current = false;
    const timer = setTimeout(() => {
      handleFitToScreenRef.current();
    }, 80);
    return () => clearTimeout(timer);
  }, [sheetId]);

  // ใช้ ResizeObserver เพื่อปรับพอดีหน้าจอเมื่อกล่องแสดงผลเปลี่ยนขนาด (เฉพาะกรณีที่ผู้ใช้ยังไม่ได้เลื่อนหรือซูมเอง)
  useEffect(() => {
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => {
        if (!hasUserPannedOrZoomedRef.current) {
          handleFitToScreenRef.current();
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, []);

  // ซูมผังวงจรโดยใช้ลูกกลิ้งเม้าส์ (Mouse Wheel Zoom) โดยใช้ตำแหน่งเคอร์เซอร์เป็นจุดศูนย์กลางการซูม
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onNativeWheel = (e: WheelEvent) => {
      // ป้องกันหน้าเว็บเลื่อนหรือดีด
      e.preventDefault();
      hasUserPannedOrZoomedRef.current = true;

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;

      // หมุนลูกกลิ้งขึ้น (deltaY < 0) = ซูมเข้า | หมุนลูกกลิ้งลง (deltaY > 0) = ซูมออก
      const zoomFactor = e.deltaY < 0 ? 1.15 : (1 / 1.15);
      const newZoom = Math.min(Math.max(currentZoom * zoomFactor, 0.15), 4.5);

      if (Math.abs(newZoom - currentZoom) < 0.0001) return;

      // ตรึงตำแหน่งจุดบนผังที่ชี้ด้วยเมาส์ให้อยู่ที่เดิมขณะซูม
      const canvasX = (mouseX - currentPan.x) / currentZoom;
      const canvasY = (mouseY - currentPan.y) / currentZoom;

      const newPanX = mouseX - canvasX * newZoom;
      const newPanY = mouseY - canvasY * newZoom;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    };

    container.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onNativeWheel);
    };
  }, []);

  // Mouse move over canvas to track coordinates for drawing
  const handleMouseMoveOnCanvas = (e: React.MouseEvent) => {
    if (canvasClickMode === 'draw_line') {
      const pos = screenToCanvas(e.clientX, e.clientY);
      setMouseCanvasPos(pos);
    }
  };

  // Mouse down on background (Panning, Add, or Draw)
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    // รองรับการคลิกลูกกลิ้งเม้าส์ (Middle click / Button 1) เพื่อลากเลื่อนมุมมอง (Pan) ได้ทันทีทุกตำแหน่ง
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // If clicking directly on canvas background or paper sheet surface
    const target = e.target as HTMLElement;
    const isSvgBg = target.tagName === 'svg' || 
                    target.id === 'diagram-bg' ||
                    target.id === 'diagram-container' ||
                    target.id === 'sheet-canvas-surface' ||
                    target.id === 'drawing-sheet-boundary' ||
                    target.tagName === 'rect';

    if (isSvgBg) {
      const coords = screenToCanvas(e.clientX, e.clientY);
      const pt = toPortraitCoords(coords.x, coords.y);

      if (canvasClickMode === 'add') {
        onAddTransformerAt(pt.x, pt.y);
        setCanvasClickMode('select');
        return;
      }

      if (canvasClickMode === 'add_switch') {
        onAddSwitchAt?.(pt.x, pt.y);
        setCanvasClickMode('select');
        return;
      }

      if (canvasClickMode === 'add_annotation') {
        onAddAnnotationAt?.(pt.x, pt.y);
        setCanvasClickMode('select');
        return;
      }

      if (canvasClickMode === 'add_landmark') {
        onAddAnnotationAt?.(pt.x, pt.y, pendingLandmarkType || undefined);
        setCanvasClickMode('select');
        setPendingLandmarkType(null);
        return;
      }

      if (canvasClickMode === 'draw_line') {
        // Add point to current drawing
        setDrawingPoints(prev => [...prev, coords]);
        return;
      }

      if (canvasClickMode === 'marquee' || e.shiftKey) {
        setMarqueeBox({
          startX: coords.x,
          startY: coords.y,
          currentX: coords.x,
          currentY: coords.y,
          isShift: e.shiftKey
        });
        return;
      }

      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setMultiSelection({ transformerIds: [], switchIds: [], annotationIds: [], pathIds: [] });
      onSelectTransformer(null);
      onSelectPath?.(null);
      onSelectSwitch?.(null);
      onSelectAnnotation?.(null);
    }
  };

  // Drag start helper for items (หม้อแปลง, สวิตช์, ป้ายข้อความ, เส้นวงจร - เดี่ยวหรือหลายตัวพร้อมกัน)
  const startDragMulti = (
    clickedType: 'transformer' | 'switch' | 'annotation' | 'path',
    clickedId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (isReadOnly || !isDraggable) return;

    dragMovedRef.current = false;

    // Shift หรือ Ctrl/Cmd: สลับการเลือก (Toggle Selection)
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      const isSelected = 
        (clickedType === 'transformer' && multiSelection.transformerIds.includes(clickedId)) ||
        (clickedType === 'switch' && multiSelection.switchIds.includes(clickedId)) ||
        (clickedType === 'annotation' && multiSelection.annotationIds.includes(clickedId)) ||
        (clickedType === 'path' && multiSelection.pathIds.includes(clickedId));

      const newSel: MultiSelection = {
        transformerIds: clickedType === 'transformer'
          ? (isSelected ? multiSelection.transformerIds.filter(id => id !== clickedId) : [...multiSelection.transformerIds, clickedId])
          : multiSelection.transformerIds,
        switchIds: clickedType === 'switch'
          ? (isSelected ? multiSelection.switchIds.filter(id => id !== clickedId) : [...multiSelection.switchIds, clickedId])
          : multiSelection.switchIds,
        annotationIds: clickedType === 'annotation'
          ? (isSelected ? multiSelection.annotationIds.filter(id => id !== clickedId) : [...multiSelection.annotationIds, clickedId])
          : multiSelection.annotationIds,
        pathIds: clickedType === 'path'
          ? (isSelected ? multiSelection.pathIds.filter(id => id !== clickedId) : [...multiSelection.pathIds, clickedId])
          : multiSelection.pathIds
      };

      setMultiSelection(newSel);

      const total = newSel.transformerIds.length + newSel.switchIds.length + newSel.annotationIds.length + newSel.pathIds.length;
      if (total === 1) {
        if (newSel.transformerIds.length === 1) onSelectTransformer(transformers.find(t => t.id === newSel.transformerIds[0]) || null);
        else if (newSel.pathIds.length === 1) onSelectPath?.(feederPaths.find(p => p.id === newSel.pathIds[0]) || null);
        else if (newSel.switchIds.length === 1) onSelectSwitch?.(switches.find(s => s.id === newSel.switchIds[0]) || null);
        else if (newSel.annotationIds.length === 1) onSelectAnnotation?.(annotations.find(a => a.id === newSel.annotationIds[0]) || null);
      } else {
        onSelectTransformer(null);
        onSelectPath?.(null);
        onSelectSwitch?.(null);
        onSelectAnnotation?.(null);
      }
      return;
    }

    // คลิกปกติ: ตรวจสอบว่าวัตถุที่กดเลือกอยู่ในรายการที่เลือกอยู่แล้วหรือไม่
    let effectiveSel = multiSelection;
    const isAlreadySelected = 
      (clickedType === 'transformer' && multiSelection.transformerIds.includes(clickedId)) ||
      (clickedType === 'switch' && multiSelection.switchIds.includes(clickedId)) ||
      (clickedType === 'annotation' && multiSelection.annotationIds.includes(clickedId)) ||
      (clickedType === 'path' && multiSelection.pathIds.includes(clickedId));

    if (!isAlreadySelected) {
      effectiveSel = {
        transformerIds: clickedType === 'transformer' ? [clickedId] : [],
        switchIds: clickedType === 'switch' ? [clickedId] : [],
        annotationIds: clickedType === 'annotation' ? [clickedId] : [],
        pathIds: clickedType === 'path' ? [clickedId] : []
      };
      setMultiSelection(effectiveSel);
    }

    // เตรียมรายการพิกัดเริ่มต้นสำหรับลากเลื่อนพร้อมกัน
    const tItems = displayData.transformers
      .filter(t => effectiveSel.transformerIds.includes(t.id))
      .map(t => ({ id: t.id, initialX: t.x, initialY: t.y }));

    const sItems = displayData.switches
      .filter(s => effectiveSel.switchIds.includes(s.id))
      .map(s => ({ id: s.id, initialX: s.x, initialY: s.y }));

    const aItems = displayData.annotations
      .filter(a => effectiveSel.annotationIds.includes(a.id))
      .map(a => ({ id: a.id, initialX: a.x, initialY: a.y }));

    const pItems = displayData.feederPaths
      .filter(p => effectiveSel.pathIds.includes(p.id))
      .map(p => ({ id: p.id, initialPoints: p.points.map(pt => ({ x: pt.x, y: pt.y })) }));

    const newMultiDragging = {
      startX: e.clientX,
      startY: e.clientY,
      dx: 0,
      dy: 0,
      items: {
        transformers: tItems,
        switches: sItems,
        annotations: aItems,
        feederPaths: pItems
      }
    };
    multiDraggingRef.current = newMultiDragging;
    setMultiDragging(newMultiDragging);
  };

  // Backwards compatibility alias for single drag
  const startDrag = (
    type: 'transformer' | 'switch' | 'annotation',
    id: string,
    _initialX: number,
    _initialY: number,
    e: React.MouseEvent
  ) => {
    startDragMulti(type, id, e);
  };

  // Drag start helper for line vertex point
  const startDragVertex = (
    pathId: string,
    pointIndex: number,
    initialX: number,
    initialY: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (isReadOnly) return;
    dragMovedRef.current = false;
    const newVertex = {
      pathId,
      pointIndex,
      startX: e.clientX,
      startY: e.clientY,
      initialX,
      initialY,
      dx: 0,
      dy: 0
    };
    draggingVertexRef.current = newVertex;
    setDraggingVertex(newVertex);
  };

  // Add a new point between index and index + 1
  const handleAddPointBetween = (pathId: string, afterIndex: number, midpoint: { x: number; y: number }, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReadOnly) return;
    const targetPath = feederPaths.find(p => p.id === pathId);
    if (!targetPath || !onUpdateFeederPath) return;
    const pt = toPortraitCoords(midpoint.x, midpoint.y);
    const newPoints = [...targetPath.points];
    newPoints.splice(afterIndex + 1, 0, pt);
    onUpdateFeederPath({ ...targetPath, points: newPoints });
  };

  // Delete a point from path
  const handleDeleteVertex = (pathId: string, pointIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReadOnly) return;
    const targetPath = feederPaths.find(p => p.id === pathId);
    if (!targetPath || !onUpdateFeederPath || targetPath.points.length <= 2) return;
    const newPoints = targetPath.points.filter((_, idx) => idx !== pointIndex);
    onUpdateFeederPath({ ...targetPath, points: newPoints });
  };

  // Finish drawing new line
  const handleFinishDrawing = () => {
    if (drawingPoints.length >= 2 && onAddFeederPath) {
      // แปลงพิกัดจากหน้าจอแนวนอนกลับเป็นพิกัดจัดเก็บ (toPortraitCoords) เพื่อไม่ให้เส้นหมุน 90 องศาเป็นแนวตั้ง
      const portraitPoints = drawingPoints.map(p => toPortraitCoords(p.x, p.y));
      const newPath: FeederPath = {
        id: `path-custom-${Date.now()}`,
        name: `สายแยกใหม่ ${feederPaths.length + 1}`,
        points: portraitPoints,
        strokeWidth: 2.5,
        style: 'solid',
        color: '#000000'
      };
      onAddFeederPath(newPath);
      onSelectPath?.(newPath);
    }
    setDrawingPoints([]);
    setMouseCanvasPos(null);
    setCanvasClickMode('edit_line');
  };

  // Cancel drawing
  const handleCancelDrawing = () => {
    setDrawingPoints([]);
    setMouseCanvasPos(null);
    setCanvasClickMode('select');
  };

  // Center on selected transformer or landmark ONLY when explicitly searching via the search bar
  const lastCenteredSearchIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Do not auto-pan if user is actively interacting (dragging, panning, or moving items)
    if (isPanning || draggingItem || multiDragging || draggingVertex) return;

    // Only auto-pan when a search query is actively entered
    const trimmedQuery = searchQuery ? searchQuery.trim() : '';
    if (!trimmedQuery) {
      lastCenteredSearchIdRef.current = null;
      return;
    }

    if (selectedId && lastCenteredSearchIdRef.current !== selectedId) {
      const selected = displayData.transformers.find(t => t.id === selectedId);
      if (selected && containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setPan({
          x: Math.round(clientWidth / 2 - selected.x * zoom),
          y: Math.round(clientHeight / 2 - selected.y * zoom)
        });
        lastCenteredSearchIdRef.current = selectedId;
      }
    } else if (selectedAnnotationId && lastCenteredSearchIdRef.current !== selectedAnnotationId) {
      const selected = displayData.annotations.find(a => a.id === selectedAnnotationId);
      if (selected && containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setPan({
          x: Math.round(clientWidth / 2 - selected.x * zoom),
          y: Math.round(clientHeight / 2 - selected.y * zoom)
        });
        lastCenteredSearchIdRef.current = selectedAnnotationId;
      }
    }
  }, [selectedId, selectedAnnotationId, searchQuery, zoom]);

  // Color theme definitions
  const themeStyles = {
    white: {
      bg: 'bg-slate-100 dark:bg-slate-900',
      canvasPaper: '#ffffff',
      grid: '#e2e8f0',
      wire: '#0f172a',
      wireHighlight: '#2563eb',
      publicFill: '#ffffff',
      publicStroke: '#0f172a',
      privateFill: '#0f172a',
      privateStroke: '#0f172a',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      border: '#cbd5e1',
      frameBorder: '#334155',
      innerBorder: '#94a3b8',
      cornerMark: '#2563eb'
    },
    blueprint: {
      bg: 'bg-[#0a192f]',
      canvasPaper: '#0f2744',
      grid: '#17365d',
      wire: '#e2e8f0',
      wireHighlight: '#38bdf8',
      publicFill: '#0f2744',
      publicStroke: '#e2e8f0',
      privateFill: '#e2e8f0',
      privateStroke: '#e2e8f0',
      textPrimary: '#f8fafc',
      textSecondary: '#93c5fd',
      border: '#1e3a8a',
      frameBorder: '#60a5fa',
      innerBorder: '#2563eb',
      cornerMark: '#38bdf8'
    },
    dark: {
      bg: 'bg-black',
      canvasPaper: '#090d16',
      grid: '#1e293b',
      wire: '#cbd5e1',
      wireHighlight: '#60a5fa',
      publicFill: '#020617',
      publicStroke: '#f8fafc',
      privateFill: '#f8fafc',
      privateStroke: '#f8fafc',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      border: '#334155',
      frameBorder: '#64748b',
      innerBorder: '#475569',
      cornerMark: '#38bdf8'
    }
  }[theme];

  return (
    <div ref={canvasRootRef} className="relative w-full h-full flex flex-col select-none overflow-hidden bg-slate-100 dark:bg-slate-900">
      {/* Floating Canvas Toolbar (Draggable) */}
      <div 
        ref={toolbarRef}
        style={{ left: `${toolbarPos.x}px`, top: `${toolbarPos.y}px` }}
        onPointerDown={handleToolbarPointerDown}
        className={`absolute z-30 flex flex-wrap items-center gap-1.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md px-1.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 select-none transition-shadow ${
          isDraggingToolbar 
            ? 'shadow-2xl ring-2 ring-blue-500/50 cursor-grabbing' 
            : 'shadow-md hover:shadow-lg'
        }`}
      >
        {/* Drag Handle Indicator */}
        <div
          className="flex items-center justify-center p-1 rounded cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
          title="คลิกลากเพื่อย้ายตำแหน่งแท็บเครื่องมือ (ดับเบิ้ลคลิกเพื่อรีเซ็ตกลับมุมซ้ายบน)"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setToolbarPos({ x: 8, y: 8 });
            try {
              localStorage.setItem('canvas_floating_toolbar_pos', JSON.stringify({ x: 8, y: 8 }));
            } catch {}
          }}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-700 pr-1.5">
          <button
            id="btn-zoom-in"
            onClick={handleZoomIn}
            title="ซูมเข้า (Zoom In) - หมุนลูกกลิ้งเม้าส์ขึ้น"
            className="p-1 rounded text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono font-medium px-1 text-slate-600 dark:text-slate-300 min-w-[2.75rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            id="btn-zoom-out"
            onClick={handleZoomOut}
            title="ซูมออก (Zoom Out) - หมุนลูกกลิ้งเม้าส์ลง"
            className="p-1 rounded text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-fit-screen"
            onClick={handleFitToScreen}
            title="ปรับพอดีหน้าจอ (Fit Screen) - เห็นผังครบทั้งแผ่น"
            className="p-1 rounded text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-reset-zoom"
            onClick={handleResetZoom}
            title="รีเซ็ตมุมมอง (Reset View)"
            className="p-1 rounded text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Mode & Actions */}
        <div className="flex items-center gap-1">

          {/* Drag & Move Toggle Button (Editor only) */}
          {!isReadOnly && onToggleDraggable && (
            <button
              id="btn-canvas-toggle-drag"
              onClick={onToggleDraggable}
              title={isDraggable ? 'กำลังเปิดโหมดลากย้ายตำแหน่ง (คลิกเพื่อล็อค)' : 'ตำแหน่งถูกล็อคอยู่ (คลิกเพื่อปลดล็อคให้ลากย้าย)'}
              className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                isDraggable
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {isDraggable ? <Unlock className="w-3 h-3 text-amber-600" /> : <Lock className="w-3 h-3" />}
              <span>{isDraggable ? 'ลากได้' : 'ล็อค'}</span>
            </button>
          )}

          <button
            id="btn-toggle-grid"
            onClick={() => setShowGrid(!showGrid)}
            title="เปิด/ปิด เส้นตาราง (Toggle Grid)"
            className={`p-1 rounded-md transition-colors text-xs flex items-center gap-1 font-medium ${
              showGrid 
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span className="hidden sm:inline text-[11px]">ตาราง</span>
          </button>

          {/* Toggle Text Background (Transparent vs Boxed) */}
          <button
            id="btn-toggle-text-bg"
            onClick={() => {
              const next = !isTextBgTransparent;
              setIsTextBgTransparent(next);
              localStorage.setItem('canvas_text_bg_transparent', String(next));
            }}
            title={
              isTextBgTransparent
                ? 'พื้นหลังข้อความ: โปร่งใส (คลิกเพื่อเปลี่ยนเป็นมีกรอบการ์ดทึบ)'
                : 'พื้นหลังข้อความ: มีกรอบการ์ดทึบ (คลิกเพื่อเปลี่ยนเป็นพื้นโปร่งใส)'
            }
            className={`p-1 rounded-md transition-colors text-xs flex items-center gap-1 font-medium ${
              isTextBgTransparent
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Type className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline text-[11px]">
              {isTextBgTransparent ? 'พื้นโปร่งใส' : 'พื้นมีกรอบ'}
            </span>
          </button>

          {/* Symbol Size Scaling Button */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setSymbolScale(prev => Math.max(0.6, Number((prev - 0.1).toFixed(2))))}
              title="ลดขนาดสัญลักษณ์ (Smaller Symbols)"
              className="px-1 py-0.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded text-[11px] font-bold"
            >
              A-
            </button>
            <span className="px-1 font-mono text-[10px] text-slate-700 dark:text-slate-300 font-semibold select-none">
              {Math.round(symbolScale * 100)}%
            </span>
            <button
              onClick={() => setSymbolScale(prev => Math.min(1.4, Number((prev + 0.1).toFixed(2))))}
              title="เพิ่มขนาดสัญลักษณ์ (Larger Symbols)"
              className="px-1 py-0.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded text-[11px] font-bold"
            >
              A+
            </button>
          </div>

          {/* Editor-only tools */}
          {!isReadOnly && (
            <>
              {/* Marquee Multi-Select Toggle Button */}
              <button
                id="btn-toggle-marquee"
                onClick={() => {
                  setCanvasClickMode(curr => curr === 'marquee' ? 'select' : 'marquee');
                }}
                title="โหมดคลุมเลือกหลายสัญลักษณ์ (Marquee Box) หรือกด Shift + ลากเมาส์บนผัง"
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  canvasClickMode === 'marquee'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/80 border border-blue-200 dark:border-blue-800'
                }`}
              >
                <BoxSelect className="w-3.5 h-3.5" />
                <span>{canvasClickMode === 'marquee' ? 'กำลังคลุมเลือก' : 'เลือกกลุ่ม'}</span>
              </button>
              {/* Line Edit Mode Toggle Button */}
              <button
                id="btn-toggle-line-edit"
                onClick={() => {
                  if (canvasClickMode === 'edit_line' || canvasClickMode === 'draw_line') {
                    setCanvasClickMode('select');
                    onSelectPath?.(null);
                  } else {
                    setCanvasClickMode('edit_line');
                  }
                }}
                title="โหมดแก้ไขและดัดเส้นวงจร (Feeder Line Editor)"
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  canvasClickMode === 'edit_line' || canvasClickMode === 'draw_line'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800'
                }`}
              >
                <GitCommit className="w-3.5 h-3.5" />
                <span>{canvasClickMode === 'edit_line' || canvasClickMode === 'draw_line' ? 'กำลังแก้ไขเส้น' : 'แก้ไขเส้นวงจร'}</span>
              </button>

              {/* Pen / Draw Line Button */}
              <button
                id="btn-draw-line"
                onClick={() => {
                  if (canvasClickMode === 'draw_line') {
                    handleCancelDrawing();
                  } else {
                    setDrawingPoints([]);
                    setCanvasClickMode('draw_line');
                  }
                }}
                title="วาดเส้นสายป้อนใหม่ (Pen Tool)"
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  canvasClickMode === 'draw_line'
                    ? 'bg-purple-600 text-white shadow-md animate-pulse'
                    : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/80 border border-purple-200 dark:border-purple-800'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>{canvasClickMode === 'draw_line' ? 'กำลังวาดเส้น...' : 'วาดเส้นใหม่'}</span>
              </button>

              {/* Add Elements Dropdown / Mode Selector */}
              <div className="relative">
                <button
                  id="btn-mode-add-menu"
                  onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    canvasClickMode !== 'select' && canvasClickMode !== 'edit_line' && canvasClickMode !== 'draw_line'
                      ? 'bg-amber-500 text-white shadow-md animate-pulse'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {canvasClickMode === 'add' ? 'วางหม้อแปลง' :
                     canvasClickMode === 'add_switch' ? 'วางสวิตช์' :
                     canvasClickMode === 'add_annotation' ? 'วางข้อความ' :
                     canvasClickMode === 'add_landmark' ? 'วางสัญลักษณ์สถานที่' : 'เพิ่มสัญลักษณ์'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-80" />
                </button>

                {isAddMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs max-h-96 overflow-y-auto">
                    <button
                      onClick={() => {
                        setCanvasClickMode('add');
                        setIsAddMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium"
                    >
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>⚡ เพิ่มหม้อแปลง (Transformer)</span>
                    </button>
                    <button
                      onClick={() => {
                        setCanvasClickMode('add_switch');
                        setIsAddMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium"
                    >
                      <Power className="w-4 h-4 text-emerald-600" />
                      <span>🔲 เพิ่มสวิตช์ / ABS / Fuse / Recloser</span>
                    </button>
                    <button
                      onClick={() => {
                        setCanvasClickMode('add_annotation');
                        setIsAddMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium"
                    >
                      <Type className="w-4 h-4 text-blue-600" />
                      <span>🔤 เพิ่มข้อความ / ชื่อถนน / สายป้อน</span>
                    </button>
                    <button
                      onClick={() => {
                        setDrawingPoints([]);
                        setCanvasClickMode('draw_line');
                        setIsAddMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center gap-2 text-purple-700 dark:text-purple-300 font-medium"
                    >
                      <PenTool className="w-4 h-4 text-purple-600" />
                      <span>🖊️ วาดเส้นวงจรใหม่ (Pen Tool)</span>
                    </button>

                    {/* Landmarks Category */}
                    <div className="border-t border-slate-100 dark:border-slate-700 my-1 pt-1">
                      <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Landmark className="w-3 h-3 text-blue-500" />
                        <span>สัญลักษณ์สถานที่สำคัญ (Landmarks)</span>
                      </div>
                      <button
                        onClick={() => {
                          setPendingLandmarkType('school');
                          setCanvasClickMode('add_landmark');
                          setIsAddMenuOpen(false);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                      >
                        <span className="text-sm">🏫</span>
                        <span className="font-medium">โรงเรียน (School)</span>
                      </button>
                      <button
                        onClick={() => {
                          setPendingLandmarkType('temple');
                          setCanvasClickMode('add_landmark');
                          setIsAddMenuOpen(false);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-amber-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                      >
                        <span className="text-sm">🛕</span>
                        <span className="font-medium">วัด (Wat / Temple)</span>
                      </button>
                      <button
                        onClick={() => {
                          setPendingLandmarkType('hospital');
                          setCanvasClickMode('add_landmark');
                          setIsAddMenuOpen(false);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-red-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                      >
                        <span className="text-sm">🏥</span>
                        <span className="font-medium">โรงพยาบาล (Hospital)</span>
                      </button>
                      <button
                        onClick={() => {
                          setPendingLandmarkType('government');
                          setCanvasClickMode('add_landmark');
                          setIsAddMenuOpen(false);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-sky-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                      >
                        <span className="text-sm">🏛️</span>
                        <span className="font-medium">สถานที่ราชการ (Govt Office)</span>
                      </button>
                      <button
                        onClick={() => {
                          setPendingLandmarkType('makro');
                          setCanvasClickMode('add_landmark');
                          setIsAddMenuOpen(false);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-rose-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                      >
                        <span className="text-sm">🔴</span>
                        <span className="font-medium">แมคโคร (Makro)</span>
                      </button>
                      <button
                        onClick={() => {
                          setPendingLandmarkType('lotus');
                          setCanvasClickMode('add_landmark');
                          setIsAddMenuOpen(false);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-emerald-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                      >
                        <span className="text-sm">🟢</span>
                        <span className="font-medium">โลตัส (Lotus's)</span>
                      </button>
                      <button
                        onClick={() => {
                          setPendingLandmarkType('seven_eleven');
                          setCanvasClickMode('add_landmark');
                          setIsAddMenuOpen(false);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-orange-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                      >
                        <span className="text-sm">🏪</span>
                        <span className="font-medium">เซเว่น (7-Eleven)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Read-Only Status Indicator */}
          {isReadOnly && (
            <div className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-semibold flex items-center gap-1.5 border border-blue-200 dark:border-blue-800">
              <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>โหมดแสดงอย่างเดียว (View Only)</span>
            </div>
          )}

          {/* Canvas Sheet Dimensions Indicator */}
          <div 
            title={`ขนาดแผ่นผังเขียนแบบ: ${canvasBounds.width} × ${canvasBounds.height} พิกเซล (มาตราส่วน A4 แนวนอน 297 × 210 มม. เป๊ะ)`}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 text-[11px] font-mono border border-slate-200 dark:border-slate-600"
          >
            <span className="text-slate-400 font-sans">ขนาดกระดาษ:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">A4 แนวนอน ({canvasBounds.width} × {canvasBounds.height} px)</span>
          </div>
        </div>
      </div>

      {/* Adding Transformer Banner */}
      {canvasClickMode === 'add' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-amber-600/95 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl border border-amber-400 flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-200 text-xs">
          <Zap className="w-4 h-4 text-amber-200 shrink-0" />
          <span><b>โหมดเพิ่มหม้อแปลง:</b> คลิกบนผังตรงตำแหน่งที่ต้องการวาง</span>
          <button
            onClick={() => setCanvasClickMode('select')}
            className="p-1 hover:bg-white/20 rounded-lg text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Adding Switch Banner */}
      {canvasClickMode === 'add_switch' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-emerald-600/95 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl border border-emerald-400 flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-200 text-xs">
          <Power className="w-4 h-4 text-emerald-200 shrink-0" />
          <span><b>โหมดเพิ่มสวิตช์ / อุปกรณ์ตัดตอน:</b> คลิกบนผังตรงตำแหน่งที่ต้องการวาง</span>
          <button
            onClick={() => setCanvasClickMode('select')}
            className="p-1 hover:bg-white/20 rounded-lg text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Adding Annotation Banner */}
      {canvasClickMode === 'add_annotation' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-blue-600/95 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl border border-blue-400 flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-200 text-xs">
          <Type className="w-4 h-4 text-blue-200 shrink-0" />
          <span><b>โหมดเพิ่มข้อความ / ชื่อถนน:</b> คลิกบนผังตรงตำแหน่งที่ต้องการวาง</span>
          <button
            onClick={() => setCanvasClickMode('select')}
            className="p-1 hover:bg-white/20 rounded-lg text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Adding Landmark Banner */}
      {canvasClickMode === 'add_landmark' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-indigo-600/95 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl border border-indigo-400 flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-200 text-xs">
          <Landmark className="w-4 h-4 text-indigo-200 shrink-0" />
          <span><b>โหมดเพิ่มสัญลักษณ์ {
            pendingLandmarkType === 'school' ? '🏫 โรงเรียน' :
            pendingLandmarkType === 'temple' ? '🛕 วัด' :
            pendingLandmarkType === 'hospital' ? '🏥 โรงพยาบาล' :
            pendingLandmarkType === 'government' ? '🏛️ สถานที่ราชการ' :
            pendingLandmarkType === 'makro' ? '🔴 แมคโคร' :
            pendingLandmarkType === 'lotus' ? '🟢 โลตัส' :
            pendingLandmarkType === 'seven_eleven' ? '🏪 เซเว่น (7-Eleven)' : 'สถานที่สำคัญ'
          }:</b> คลิกบนผังตรงตำแหน่งที่ต้องการวาง</span>
          <button
            onClick={() => {
              setCanvasClickMode('select');
              setPendingLandmarkType(null);
            }}
            className="p-1 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Selected Switch Quick Control Banner */}
      {!isReadOnly && selectedSwitchId && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 text-white backdrop-blur-md px-4 py-2 rounded-2xl shadow-2xl border border-emerald-500/80 flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-200 text-xs">
          <Power className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            เลือกสวิตช์: <b className="text-emerald-300">{switches.find(s => s.id === selectedSwitchId)?.code || selectedSwitchId}</b> (กด <b>Delete</b> บนคีย์บอร์ด หรือปุ่มลบ)
          </span>
          {onDeleteSwitch && (
            <button
              onClick={() => {
                onDeleteSwitch(selectedSwitchId);
                onSelectSwitch?.(null);
              }}
              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-lg font-bold flex items-center gap-1 transition-all ml-1 shadow-sm cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ลบ</span>
            </button>
          )}
          <button
            onClick={() => onSelectSwitch?.(null)}
            className="p-1 hover:bg-white/20 rounded-lg text-white/80 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Selected Annotation Quick Control Banner */}
      {!isReadOnly && selectedAnnotationId && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 text-white backdrop-blur-md px-4 py-2 rounded-2xl shadow-2xl border border-blue-500/80 flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-200 text-xs">
          <Type className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            เลือกข้อความ: <b className="text-blue-300 truncate max-w-[120px] inline-block align-bottom">{annotations.find(a => a.id === selectedAnnotationId)?.text || selectedAnnotationId}</b> (กด <b>Delete</b> บนคีย์บอร์ด หรือปุ่มลบ)
          </span>
          {onDeleteAnnotation && (
            <button
              onClick={() => {
                onDeleteAnnotation(selectedAnnotationId);
                onSelectAnnotation?.(null);
              }}
              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-lg font-bold flex items-center gap-1 transition-all ml-1 shadow-sm cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ลบ</span>
            </button>
          )}
          <button
            onClick={() => onSelectAnnotation?.(null)}
            className="p-1 hover:bg-white/20 rounded-lg text-white/80 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Drawing Line Interactive Floating Banner */}
      {!isReadOnly && canvasClickMode === 'draw_line' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-purple-900/90 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl border border-purple-500 flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
          <PenTool className="w-4 h-4 text-purple-300 shrink-0" />
          <div className="text-xs">
            <span className="font-bold">โหมดวาดเส้นวงจร: </span>
            <span>คลิกบนผังเพื่อวางจุดข้อต่อ (วางแล้ว {drawingPoints.length} จุด)</span>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <button
              onClick={handleFinishDrawing}
              disabled={drawingPoints.length < 2}
              className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                drawingPoints.length >= 2
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                  : 'bg-white/20 text-white/50 cursor-not-allowed'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>เสร็จสิ้น</span>
            </button>
            <button
              onClick={handleCancelDrawing}
              className="px-2.5 py-1 rounded-xl text-xs font-medium bg-white/20 hover:bg-white/30 text-white transition-all flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>ยกเลิก</span>
            </button>
          </div>
        </div>
      )}

      {/* Line Edit Mode Info Banner & Floating Selection Control */}
      {!isReadOnly && (canvasClickMode === 'edit_line' || selectedPathId) && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl border border-indigo-500/80 flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-200 text-xs">
          <GitCommit className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            {selectedPathId ? (
              <>
                เลือกเส้น: <b className="text-indigo-300">{feederPaths.find(p => p.id === selectedPathId)?.name || 'เส้นวงจร'}</b> (กดปุ่ม <b>Delete</b> บนคีย์บอร์ด หรือปุ่มถังขยะเพื่อลบ)
              </>
            ) : (
              <>
                <b>โหมดแก้ไขเส้น:</b> คลิกที่เส้นเพื่อเลือก, คลิกลากจุดวงกลมสีฟ้าเพื่อดัดเส้น, หรือคลิกปุ่ม <b>+</b> เพื่อเพิ่มมุมหัก
              </>
            )}
          </span>

          {selectedPathId && onDeleteFeederPath && (
            <button
              id="btn-quick-delete-selected-line"
              onClick={() => {
                onDeleteFeederPath(selectedPathId);
                onSelectPath?.(null);
              }}
              title="ลบเส้นสายที่เลือก (Delete line)"
              className="px-3 py-1 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-lg font-bold flex items-center gap-1.5 transition-all ml-1 shadow-sm cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ลบเส้นนี้</span>
            </button>
          )}

          <button
            onClick={() => {
              setCanvasClickMode('select');
              onSelectPath?.(null);
            }}
            title="ปิดโหมดแก้ไขเส้น"
            className="p-1 hover:bg-white/20 rounded-lg text-white/80 transition-colors ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Multi-Selection Control Bar (HUD) */}
      {!isReadOnly && totalSelectedCount >= 2 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl border border-blue-500/80 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-200 text-xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/40">
              <BoxSelect className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <span>เลือกกลุ่ม</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[11px] font-bold border border-blue-500/40">
                  {totalSelectedCount} รายการ
                </span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                {multiSelection.transformerIds.length > 0 && (
                  <span className="text-amber-300 font-medium">⚡ หม้อแปลง {multiSelection.transformerIds.length}</span>
                )}
                {multiSelection.switchIds.length > 0 && (
                  <span className="text-emerald-300 font-medium">🔲 สวิตช์ {multiSelection.switchIds.length}</span>
                )}
                {multiSelection.pathIds.length > 0 && (
                  <span className="text-indigo-300 font-medium">〰️ เส้น {multiSelection.pathIds.length}</span>
                )}
                {multiSelection.annotationIds.length > 0 && (
                  <span className="text-sky-300 font-medium">🏷️ ป้าย {multiSelection.annotationIds.length}</span>
                )}
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-700 mx-1 hidden sm:block" />

          {/* Nudge Direction Buttons */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80">
            <span className="text-[10px] text-slate-400 font-medium px-1.5 hidden md:inline">เลื่อน:</span>
            <button
              onClick={() => handleNudgeSelection(-nudgeStep, 0)}
              title={`เลื่อนซ้าย ${nudgeStep}px (หรือกดปุ่มลูกศรซ้าย)`}
              className="px-1.5 py-1 hover:bg-slate-700 active:scale-95 text-slate-200 rounded transition-all cursor-pointer font-bold"
            >
              ⬅️
            </button>
            <button
              onClick={() => handleNudgeSelection(0, -nudgeStep)}
              title={`เลื่อนขึ้น ${nudgeStep}px (หรือกดปุ่มลูกศรขึ้น)`}
              className="px-1.5 py-1 hover:bg-slate-700 active:scale-95 text-slate-200 rounded transition-all cursor-pointer font-bold"
            >
              ⬆️
            </button>
            <button
              onClick={() => handleNudgeSelection(0, nudgeStep)}
              title={`เลื่อนลง ${nudgeStep}px (หรือกดปุ่มลูกศรลง)`}
              className="px-1.5 py-1 hover:bg-slate-700 active:scale-95 text-slate-200 rounded transition-all cursor-pointer font-bold"
            >
              ⬇️
            </button>
            <button
              onClick={() => handleNudgeSelection(nudgeStep, 0)}
              title={`เลื่อนขวา ${nudgeStep}px (หรือกดปุ่มลูกศรขวา)`}
              className="px-1.5 py-1 hover:bg-slate-700 active:scale-95 text-slate-200 rounded transition-all cursor-pointer font-bold"
            >
              ➡️
            </button>

            {/* Step size selector */}
            <select
              value={nudgeStep}
              onChange={(e) => setNudgeStep(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded px-1.5 py-0.5 ml-1 cursor-pointer"
              title="ระยะการเลื่อนต่อการกด (Step)"
            >
              <option value={5}>5px</option>
              <option value={10}>10px</option>
              <option value={20}>20px</option>
              <option value={50}>50px</option>
            </select>
          </div>

          <div className="h-6 w-px bg-slate-700 mx-1 hidden sm:block" />

          {/* Action Buttons: Duplicate, Delete, Deselect */}
          <div className="flex items-center gap-1.5">
            {onBatchDuplicate && (
              <button
                onClick={() => onBatchDuplicate(multiSelection)}
                title="คัดลอก/ทำซ้ำรายการที่เลือกทั้งหมด (Ctrl+D)"
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>ทำซ้ำ</span>
              </button>
            )}

            <button
              onClick={() => {
                if (onBatchDelete) {
                  onBatchDelete(multiSelection);
                } else {
                  multiSelection.transformerIds.forEach(id => onDeleteTransformer(id));
                  multiSelection.switchIds.forEach(id => onDeleteSwitch?.(id));
                  multiSelection.annotationIds.forEach(id => onDeleteAnnotation?.(id));
                  multiSelection.pathIds.forEach(id => onDeleteFeederPath?.(id));
                }
                setMultiSelection({ transformerIds: [], switchIds: [], annotationIds: [], pathIds: [] });
              }}
              title="ลบรายการที่เลือกทั้งหมด (Delete)"
              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-lg font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ลบ ({totalSelectedCount})</span>
            </button>

            <button
              onClick={() => {
                setMultiSelection({ transformerIds: [], switchIds: [], annotationIds: [], pathIds: [] });
                onSelectTransformer(null);
                onSelectPath?.(null);
                onSelectSwitch?.(null);
                onSelectAnnotation?.(null);
              }}
              title="ยกเลิกการเลือก (Esc)"
              className="p-1 hover:bg-white/20 rounded-lg text-white/80 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Legend & Guide Pill (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-xs flex flex-wrap items-center gap-3.5 text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <svg width="18" height="16" viewBox="0 0 18 16" className="inline-block">
            <polygon points="9,2 16,14 2,14" fill="#ffffff" stroke="#9333ea" strokeWidth="2" />
          </svg>
          <span className="text-purple-700 dark:text-purple-300 font-semibold">กฟภ. (จำหน่ายทั่วไป)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="18" height="16" viewBox="0 0 18 16" className="inline-block">
            <polygon points="9,2 16,14 2,14" fill="#2563eb" stroke="#2563eb" strokeWidth="2" />
          </svg>
          <span className="text-blue-700 dark:text-blue-300 font-semibold">ผู้ใช้ไฟ (เฉพาะราย)</span>
        </div>
        <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-3">
          <svg width="28" height="16" viewBox="0 0 28 16" className="inline-block">
            <polygon points="8,2 14,14 2,14" fill="#ffffff" stroke="#9333ea" strokeWidth="2" />
            <rect x="16" y="2" width="12" height="12" rx="2" fill="#9333ea" />
            <text x="22" y="11" fontSize="8" fontWeight="bold" fill="#ffffff" textAnchor="middle">1Ø</text>
          </svg>
          <span className="font-semibold text-amber-700 dark:text-amber-400">1 เฟส 1 เครื่อง (ป้าย 1Ø)</span>
        </div>
        <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-3">
          <svg width="44" height="16" viewBox="0 0 44 16" className="inline-block">
            <polygon points="6,2 12,14 0,14" fill="#ffffff" stroke="#9333ea" strokeWidth="1.8" />
            <polygon points="12,2 18,14 6,14" fill="#ffffff" stroke="#9333ea" strokeWidth="1.8" />
            <rect x="20" y="2" width="22" height="12" rx="2" fill="#9333ea" />
            <text x="31" y="11" fontSize="7.5" fontWeight="bold" fill="#ffffff" textAnchor="middle">2x1Ø</text>
          </svg>
          <span className="font-semibold text-purple-700 dark:text-purple-300">1 เฟส 2 เครื่อง (ป้าย 2x1Ø)</span>
        </div>
        <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-3">
          <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
          <span>สายป้อน / สวิตช์</span>
        </div>
      </div>

      {/* Interactive Canvas Area */}
      <div
        ref={containerRef}
        id="diagram-container"
        className={`relative flex-1 w-full h-full cursor-${
          isPanning ? 'grabbing' : canvasClickMode === 'add' || canvasClickMode === 'draw_line' ? 'crosshair' : 'default'
        } ${themeStyles.bg}`}
        onMouseMove={handleMouseMoveOnCanvas}
        onMouseDown={handleMouseDownCanvas}
      >
        <svg
          id="diagram-bg"
          className="w-full h-full absolute inset-0 overflow-visible"
        >
          {/* Background Grid Pattern */}
          <defs>
            <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke={themeStyles.grid}
                strokeWidth="1"
              />
            </pattern>
            {/* Arrow Marker for direction */}
            <marker id="arrow-down" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#1d4ed8" />
            </marker>
            <marker id="arrow-wire" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={themeStyles.wire} />
            </marker>
          </defs>

          {/* Root Transform Viewport Group for Smooth Pan & Zoom without any SVG clipping */}
          <g
            id="diagram-viewport"
            transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
          >
            {/* Drawing Sheet Boundary - Dynamic Sizing & Minimal Clean Frame */}
            <g id="drawing-sheet-boundary">
              {/* Sheet Canvas Surface */}
              <rect 
                id="sheet-canvas-surface"
                x="0" 
                y="0" 
                width={canvasBounds.width} 
                height={canvasBounds.height} 
                fill={themeStyles.canvasPaper}
              />

            {/* Grid Pattern inside sheet area */}
            {showGrid && (
              <rect x="0" y="0" width={canvasBounds.width} height={canvasBounds.height} fill="url(#grid-pattern)" />
            )}

            {/* Clean Thin Single Frame (เส้นกรอบบาง เรียบ ชัดเจน) */}
            {/* Clean Thin Single Frame (เส้นกรอบแผ่นผัง A4 มาตรฐาน) */}
            <rect
              x="12"
              y="12"
              width={canvasBounds.width - 24}
              height={canvasBounds.height - 24}
              fill="none"
              stroke={themeStyles.frameBorder}
              strokeWidth="1.5"
              opacity="0.8"
            />

            {/* A4 Landscape Size Tag Indicator at top-right of sheet frame */}
            <g transform={`translate(${canvasBounds.width - 245}, 20)`} opacity="0.85">
              <rect x="0" y="0" width="225" height="26" rx="5" fill={themeStyles.cardBg} stroke={themeStyles.border} strokeWidth="1" />
              <text x="112" y="17" fill={themeStyles.textSecondary} fontSize="11" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
                ขนาดกระดาษ A4 แนวนอน (297 × 210 mm)
              </text>
            </g>

            {/* 4 Corner Marks (มุมบอกขอบเขตผัง A4) */}
            <path d="M 12 32 L 12 12 L 32 12" fill="none" stroke={themeStyles.cornerMark} strokeWidth="2" />
            <path d={`M ${canvasBounds.width - 32} 12 L ${canvasBounds.width - 12} 12 L ${canvasBounds.width - 12} 32`} fill="none" stroke={themeStyles.cornerMark} strokeWidth="2" />
            <path d={`M 12 ${canvasBounds.height - 32} L 12 ${canvasBounds.height - 12} L 32 ${canvasBounds.height - 12}`} fill="none" stroke={themeStyles.cornerMark} strokeWidth="2" />
            <path d={`M ${canvasBounds.width - 32} ${canvasBounds.height - 12} L ${canvasBounds.width - 12} ${canvasBounds.height - 12} L ${canvasBounds.width - 12} ${canvasBounds.height - 32}`} fill="none" stroke={themeStyles.cornerMark} strokeWidth="2" />

            {/* PEA Drawing Sheet Title Block at bottom-right corner (ตารางระบุข้อมูลผังมาตรฐาน A4) */}
            <g transform={`translate(${canvasBounds.width - 365}, ${canvasBounds.height - 110})`} opacity="0.9">
              <rect x="0" y="0" width="345" height="92" rx="4" fill={themeStyles.cardBg} stroke={themeStyles.frameBorder} strokeWidth="1.2" />
              <line x1="0" y1="30" x2="345" y2="30" stroke={themeStyles.border} strokeWidth="1" />
              <line x1="0" y1="62" x2="345" y2="62" stroke={themeStyles.border} strokeWidth="1" />
              <line x1="172" y1="30" x2="172" y2="92" stroke={themeStyles.border} strokeWidth="1" />
              
              {/* Header */}
              <text x="172" y="20" fill={themeStyles.textPrimary} fontSize="11" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
                การไฟฟ้าส่วนภูมิภาค (PEA) • ผังระบบจำหน่าย (SLD)
              </text>
              
              {/* Row 1 */}
              <text x="12" y="47" fill={themeStyles.textSecondary} fontSize="9.5" fontFamily="sans-serif">
                ขนาดกระดาษ: <tspan fill={themeStyles.textPrimary} fontWeight="bold">A4 (297×210 mm)</tspan>
              </text>
              <text x="182" y="47" fill={themeStyles.textSecondary} fontSize="9.5" fontFamily="sans-serif">
                มาตราส่วน: <tspan fill={themeStyles.textPrimary} fontWeight="bold">1:√2 (ISO 216)</tspan>
              </text>
              
              {/* Row 2 */}
              <text x="12" y="79" fill={themeStyles.textSecondary} fontSize="9.5" fontFamily="sans-serif">
                หม้อแปลง: <tspan fill={themeStyles.textPrimary} fontWeight="bold">{displayData.transformers.length} เครื่อง</tspan>
              </text>
              <text x="182" y="79" fill={themeStyles.textSecondary} fontSize="9.5" fontFamily="sans-serif">
                พิกัดผัง: <tspan fill={themeStyles.textPrimary} fontWeight="bold">2079 × 1470 px</tspan>
              </text>
            </g>
          </g>

          {/* Feeder Path Lines Layer with Interactive Controls */}
          {displayData.feederPaths.map(path => {
            const isMultiSelected = multiSelection.pathIds.includes(path.id);
            const isSelected = selectedPathId === path.id || isMultiSelected;
            const isHovered = hoveredPathId === path.id;
            const isLineEditing = !isReadOnly && (canvasClickMode === 'edit_line' || (isSelected && totalSelectedCount === 1));

            const isPathBeingDragged = multiDragging?.items.feederPaths.some(x => x.id === path.id);
            const pDx = isPathBeingDragged ? (multiDragging?.dx || 0) : 0;
            const pDy = isPathBeingDragged ? (multiDragging?.dy || 0) : 0;

            const pointsStr = path.points.map((p, pIdx) => {
              const isVDrag = draggingVertex && draggingVertex.pathId === path.id && draggingVertex.pointIndex === pIdx;
              const vDx = isVDrag ? (draggingVertex?.dx || 0) : 0;
              const vDy = isVDrag ? (draggingVertex?.dy || 0) : 0;
              return `${Math.round(p.x + pDx + vDx)},${Math.round(p.y + pDy + vDy)}`;
            }).join(' ');
            const lineColor = path.color || themeStyles.wire;

            return (
              <g 
                key={path.id}
                onMouseEnter={() => setHoveredPathId(path.id)}
                onMouseLeave={() => setHoveredPathId(null)}
              >
                {/* Thick Transparent Hitbox for easier line selection & dragging */}
                <polyline
                  points={pointsStr}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={24}
                  className="cursor-pointer"
                  onMouseDown={(e) => startDragMulti('path', path.id, e)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (dragMovedRef.current) return;
                    if (e.shiftKey || e.ctrlKey || e.metaKey) return;
                    setMultiSelection({
                      transformerIds: [],
                      switchIds: [],
                      annotationIds: [],
                      pathIds: [path.id]
                    });
                    onSelectTransformer(null);
                    onSelectSwitch?.(null);
                    onSelectAnnotation?.(null);
                    onSelectPath?.(path);
                    if (!isReadOnly && canvasClickMode !== 'draw_line') {
                      setCanvasClickMode('edit_line');
                    }
                  }}
                />

                {/* Selected/Hovered Outer Glow Aura */}
                {(isSelected || isHovered) && (
                  <polyline
                    points={pointsStr}
                    fill="none"
                    stroke={isMultiSelected ? "#0284c7" : "#3b82f6"}
                    strokeWidth={(path.strokeWidth || 2.5) + (isMultiSelected ? 8 : 6)}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={isSelected ? 0.7 : 0.25}
                    strokeDasharray={isSelected ? '6,4' : undefined}
                  />
                )}

                {/* Main Feeder Line */}
                <polyline
                  points={pointsStr}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth={path.strokeWidth || 2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={path.style === 'dashed' ? '6,4' : undefined}
                  className="cursor-pointer"
                  onMouseDown={(e) => startDragMulti('path', path.id, e)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (dragMovedRef.current) return;
                    if (e.shiftKey || e.ctrlKey || e.metaKey) return;
                    setMultiSelection({
                      transformerIds: [],
                      switchIds: [],
                      annotationIds: [],
                      pathIds: [path.id]
                    });
                    onSelectTransformer(null);
                    onSelectSwitch?.(null);
                    onSelectAnnotation?.(null);
                    onSelectPath?.(path);
                    if (!isReadOnly && canvasClickMode !== 'draw_line') {
                      setCanvasClickMode('edit_line');
                    }
                  }}
                />

                {/* Feeder Junction Fixed Dots */}
                {!isLineEditing && path.points.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={3}
                    fill={lineColor}
                  />
                ))}

                {/* Interactive Vertex Nodes in Edit Mode */}
                {isLineEditing && path.points.map((pt, i) => {
                  const isBeingDragged = draggingVertex?.pathId === path.id && draggingVertex.pointIndex === i;

                  return (
                    <g key={i} className="cursor-move">
                      {/* Vertex Joint Draggable Circle */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isBeingDragged ? 7 : isSelected ? 5.5 : 4}
                        fill={isBeingDragged ? '#2563eb' : '#ffffff'}
                        stroke="#2563eb"
                        strokeWidth={2}
                        className="transition-all hover:scale-125"
                        onMouseDown={(e) => startDragVertex(path.id, i, pt.x, pt.y, e)}
                        onDoubleClick={(e) => handleDeleteVertex(path.id, i, e)}
                      />
                      {/* Coordinate label while dragging */}
                      {isBeingDragged && (
                        <g transform={`translate(${pt.x}, ${pt.y - 18})`} className="pointer-events-none">
                          <rect x="-35" y="-10" width="70" height="18" rx="4" fill="#1e293b" fillOpacity="0.9" />
                          <text x="0" y="3" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                            X:{pt.x} Y:{pt.y}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Midpoint '+' Badges to insert new bend point (Only on selected path) */}
                {isSelected && path.points.map((pt, i) => {
                  if (i === path.points.length - 1) return null;
                  const nextPt = path.points[i + 1];
                  const midX = Math.round((pt.x + nextPt.x) / 2);
                  const midY = Math.round((pt.y + nextPt.y) / 2);

                  return (
                    <g
                      key={`mid-${i}`}
                      transform={`translate(${midX}, ${midY})`}
                      className="cursor-pointer group"
                      onClick={(e) => handleAddPointBetween(path.id, i, { x: midX, y: midY }, e)}
                    >
                      <circle
                        cx="0"
                        cy="0"
                        r="6"
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="transition-transform group-hover:scale-125 shadow-sm"
                      />
                      <line x1="-3" y1="0" x2="3" y2="0" stroke="#ffffff" strokeWidth="1.5" />
                      <line x1="0" y1="-3" x2="0" y2="3" stroke="#ffffff" strokeWidth="1.5" />
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Active Drawing Line Rubberband Preview */}
          {canvasClickMode === 'draw_line' && (
            <g className="pointer-events-none">
              {/* Existing Placed Points Line */}
              {drawingPoints.length > 0 && (
                <polyline
                  points={drawingPoints.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#9333ea"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {/* Placed Point Circles */}
              {drawingPoints.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r="5"
                  fill="#9333ea"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              ))}
              {/* Rubberband to mouse position */}
              {drawingPoints.length > 0 && mouseCanvasPos && (
                <line
                  x1={drawingPoints[drawingPoints.length - 1].x}
                  y1={drawingPoints[drawingPoints.length - 1].y}
                  x2={mouseCanvasPos.x}
                  y2={mouseCanvasPos.y}
                  stroke="#a855f7"
                  strokeWidth="2.5"
                  strokeDasharray="5,4"
                />
              )}
              {/* Mouse indicator point */}
              {mouseCanvasPos && (
                <circle
                  cx={mouseCanvasPos.x}
                  cy={mouseCanvasPos.y}
                  r="6"
                  fill="#9333ea"
                  stroke="#ffffff"
                  strokeWidth="2"
                  opacity="0.8"
                />
              )}
            </g>
          )}

          {/* Feeder / Road Annotation Labels */}
          {displayData.annotations.map(label => {
            const isVertical = label.orientation === 'vertical';
            const isMultiSelected = multiSelection.annotationIds.includes(label.id);
            const isSelected = selectedAnnotationId === label.id || isMultiSelected;
            const isBeingDragged = multiDragging?.items.annotations.some(x => x.id === label.id);
            const curX = isBeingDragged ? Math.round(label.x + (multiDragging?.dx || 0)) : label.x;
            const curY = isBeingDragged ? Math.round(label.y + (multiDragging?.dy || 0)) : label.y;

            const isLandmark = [
              'school', 'temple', 'hospital', 'government', 'makro', 'lotus', 'seven_eleven'
            ].includes(label.type || '');

            const textPos: 'right' | 'left' | 'top' | 'bottom' = label.textPosition || (label.orientation === 'vertical' ? 'bottom' : 'right');
            const fs = label.fontSize || (isLandmark ? 13 : 14);
            const textLen = label.text?.length || 4;

            // Compute hit-box bounds and placement according to text direction
            let hitW = Math.max(80, textLen * 14 + 24);
            let hitH = 32;
            let hitX = -hitW / 2;
            let hitY = -hitH / 2;
            let iconX = 0;
            let iconY = 0;
            let textX = 0;
            let textY = 0;
            let textAnchor: 'start' | 'middle' | 'end' = 'start';
            let dominantBaseline: 'middle' | 'hanging' | 'auto' = 'middle';

            if (isLandmark) {
              const textWidth = Math.max(28, textLen * (fs * 0.9));
              if (textPos === 'right') {
                hitW = Math.max(92, textWidth + 44);
                hitH = Math.max(34, fs + 18);
                hitX = -hitW / 2;
                hitY = -hitH / 2;
                iconX = hitX + 17;
                iconY = 0;
                textX = hitX + 34;
                textY = 1;
                textAnchor = 'start';
                dominantBaseline = 'middle';
              } else if (textPos === 'left') {
                hitW = Math.max(92, textWidth + 44);
                hitH = Math.max(34, fs + 18);
                hitX = -hitW / 2;
                hitY = -hitH / 2;
                iconX = hitX + hitW - 17;
                iconY = 0;
                textX = hitX + hitW - 34;
                textY = 1;
                textAnchor = 'end';
                dominantBaseline = 'middle';
              } else if (textPos === 'bottom') {
                hitW = Math.max(64, textWidth + 24);
                hitH = 50 + Math.max(0, fs - 13);
                hitX = -hitW / 2;
                hitY = -hitH / 2;
                iconX = 0;
                iconY = hitY + 16;
                textX = 0;
                textY = hitY + 37;
                textAnchor = 'middle';
                dominantBaseline = 'middle';
              } else if (textPos === 'top') {
                hitW = Math.max(64, textWidth + 24);
                hitH = 50 + Math.max(0, fs - 13);
                hitX = -hitW / 2;
                hitY = -hitH / 2;
                textX = 0;
                textY = hitY + 15;
                iconX = 0;
                iconY = hitY + 35;
                textAnchor = 'middle';
                dominantBaseline = 'middle';
              }
            } else if (label.type === 'feeder_title') {
              hitW = 260;
              hitH = 70;
              hitX = -130;
              hitY = -35;
            } else if (label.type === 'road') {
              if (isVertical || textPos === 'top' || textPos === 'bottom') {
                hitW = 36;
                hitH = Math.max(80, textLen * 20);
                hitX = -18;
                hitY = 0;
              } else {
                hitW = Math.max(120, textLen * 16 + 30);
                hitH = 36;
                hitX = -hitW / 2;
                hitY = -18;
              }
            }

            return (
              <g
                key={label.id}
                id={`ann-${label.id}`}
                transform={`translate(${curX}, ${curY})`}
                className={`${
                  isDraggable
                    ? (isBeingDragged ? 'cursor-grabbing' : 'cursor-grab')
                    : 'cursor-pointer'
                } group`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragMovedRef.current) return;
                  if (e.shiftKey || e.ctrlKey || e.metaKey) return;
                  setMultiSelection({
                    transformerIds: [],
                    switchIds: [],
                    annotationIds: [label.id],
                    pathIds: []
                  });
                  onSelectTransformer(null);
                  onSelectPath?.(null);
                  onSelectSwitch?.(null);
                  const original = annotations.find(orig => orig.id === label.id) || label;
                  onSelectAnnotation?.(original);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (isReadOnly) return;
                  const original = annotations.find(orig => orig.id === label.id) || label;
                  onEditAnnotation?.(original);
                }}
                onMouseDown={(e) => startDragMulti('annotation', label.id, e)}
              >
                {/* Large Transparent Hitbox for Smooth Dragging & Clicking */}
                <rect
                  x={hitX}
                  y={hitY}
                  width={hitW}
                  height={hitH}
                  fill="transparent"
                  pointerEvents="all"
                />

                {/* Selection Highlight Box */}
                {isSelected && (
                  <rect
                    x={hitX - 4}
                    y={hitY - 4}
                    width={hitW + 8}
                    height={hitH + 8}
                    fill="#3b82f6"
                    fillOpacity="0.12"
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                    strokeDasharray="4,3"
                    rx="6"
                  />
                )}

                {label.type === 'feeder_title' ? (
                  <g>
                    <rect
                      x="-130"
                      y="-35"
                      width="260"
                      height="70"
                      fill={isTextBgTransparent ? 'none' : '#ffffff'}
                      stroke="#000000"
                      strokeWidth="1.5"
                      rx="2"
                    />
                    <text
                      x="0"
                      y="-5"
                      textAnchor="middle"
                      fontSize={label.fontSize || 17}
                      fontWeight="bold"
                      fill={label.color || '#000000'}
                      style={{ fill: label.color || '#000000' }}
                    >
                      (1) ผังหม้อแปลง
                    </text>
                    <text
                      x="0"
                      y="20"
                      textAnchor="middle"
                      fontSize={label.fontSize || 17}
                      fontWeight="bold"
                      fill={label.color || '#000000'}
                      style={{ fill: label.color || '#000000' }}
                    >
                      {label.text.replace('(1) ผังหม้อแปลง ', '').trim() || 'ไลน์สวนดอก'}
                    </text>
                  </g>
                ) : isLandmark ? (
                  <g>
                    {/* Landmark Specific Icons (No outer border/frame around text) */}
                    {label.type === 'school' && (
                      <g>
                        <circle cx={iconX} cy={iconY} r={11} fill={label.color || '#2563eb'} />
                        <polygon points={`${iconX},${iconY - 6} ${iconX - 6},${iconY - 1} ${iconX + 6},${iconY - 1}`} fill="#ffffff" />
                        <rect x={iconX - 5} y={iconY - 1} width="10" height="7" fill="#ffffff" />
                        <rect x={iconX - 2} y={iconY + 2} width="4" height="4" fill={label.color || '#2563eb'} />
                        <line x1={iconX} y1={iconY - 6} x2={iconX} y2={iconY - 9} stroke="#ffffff" strokeWidth="1" />
                        <polygon points={`${iconX},${iconY - 9} ${iconX + 4},${iconY - 7.5} ${iconX},${iconY - 6}`} fill="#fef08a" />
                      </g>
                    )}

                    {label.type === 'temple' && (
                      <g>
                        <circle cx={iconX} cy={iconY} r={11} fill={label.color || '#d97706'} />
                        <path
                          d={`M ${iconX} ${iconY - 8} Q ${iconX - 1} ${iconY - 4} ${iconX - 5} ${iconY - 1} Q ${iconX} ${iconY - 2} ${iconX + 5} ${iconY - 1} Q ${iconX + 1} ${iconY - 4} ${iconX} ${iconY - 8} Z`}
                          fill="#ffffff"
                        />
                        <rect x={iconX - 4} y={iconY} width="8" height="6" fill="#ffffff" />
                        <rect x={iconX - 2} y={iconY + 2} width="4" height="4" rx="1" fill={label.color || '#d97706'} />
                      </g>
                    )}

                    {label.type === 'hospital' && (
                      <g>
                        <circle cx={iconX} cy={iconY} r={11} fill={label.color || '#dc2626'} />
                        <rect x={iconX - 5} y={iconY - 2.5} width="10" height="5" rx="1" fill="#ffffff" />
                        <rect x={iconX - 2.5} y={iconY - 5} width="5" height="10" rx="1" fill="#ffffff" />
                      </g>
                    )}

                    {label.type === 'government' && (
                      <g>
                        <circle cx={iconX} cy={iconY} r={11} fill={label.color || '#0284c7'} />
                        <polygon points={`${iconX},${iconY - 6.5} ${iconX - 6},${iconY - 2.5} ${iconX + 6},${iconY - 2.5}`} fill="#ffffff" />
                        <rect x={iconX - 5} y={iconY - 1.5} width="2" height="6" fill="#ffffff" />
                        <rect x={iconX - 1} y={iconY - 1.5} width="2" height="6" fill="#ffffff" />
                        <rect x={iconX + 3} y={iconY - 1.5} width="2" height="6" fill="#ffffff" />
                        <rect x={iconX - 6.5} y={iconY + 4.5} width="13" height="1.5" rx="0.5" fill="#ffffff" />
                      </g>
                    )}

                    {label.type === 'makro' && (
                      <g>
                        <rect x={iconX - 11} y={iconY - 11} width="22" height="22" rx="5" fill={label.color || '#e11d48'} />
                        <text
                          x={iconX}
                          y={iconY + 1}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="12"
                          fontWeight="900"
                          fontFamily="sans-serif"
                          fill="#ffffff"
                        >
                          M
                        </text>
                      </g>
                    )}

                    {label.type === 'lotus' && (
                      <g>
                        <circle cx={iconX} cy={iconY} r={11} fill={label.color || '#059669'} />
                        <path
                          d={`M ${iconX} ${iconY - 7} C ${iconX + 5} ${iconY - 3}, ${iconX + 5} ${iconY + 3}, ${iconX} ${iconY + 6} C ${iconX - 5} ${iconY + 3}, ${iconX - 5} ${iconY - 3}, ${iconX} ${iconY - 7} Z`}
                          fill="#ffffff"
                        />
                        <circle cx={iconX} cy={iconY} r={2} fill={label.color || '#059669'} />
                      </g>
                    )}

                    {label.type === 'seven_eleven' && (
                      <g>
                        <rect x={iconX - 11} y={iconY - 11} width="22" height="22" rx="4" fill="#ffffff" stroke="#16a34a" strokeWidth="1" />
                        <rect x={iconX - 10} y={iconY - 10} width="20" height="3" fill="#16a34a" />
                        <rect x={iconX - 10} y={iconY + 6} width="20" height="3" fill="#16a34a" />
                        <text
                          x={iconX}
                          y={iconY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="13"
                          fontWeight="900"
                          fontFamily="sans-serif"
                          fill="#ea580c"
                        >
                          7
                        </text>
                      </g>
                    )}

                    {/* Landmark Text according to chosen textPosition direction (Clean, no frame/border) */}
                    <text
                      x={textX}
                      y={textY}
                      fill={label.color || (
                        label.type === 'school' ? '#1d4ed8' :
                        label.type === 'temple' ? '#b45309' :
                        label.type === 'hospital' ? '#dc2626' :
                        label.type === 'government' ? '#0284c7' :
                        label.type === 'makro' ? '#e11d48' :
                        label.type === 'lotus' ? '#059669' :
                        '#ea580c'
                      )}
                      fontSize={fs}
                      fontWeight="bold"
                      dominantBaseline={dominantBaseline}
                      textAnchor={textAnchor}
                    >
                      {label.text}
                    </text>
                  </g>
                ) : label.type === 'road' ? (
                  <g>
                    {isVertical || textPos === 'top' || textPos === 'bottom' ? (
                      <text
                        x="0"
                        y="0"
                        fill={label.color || '#1d4ed8'}
                        fontSize={label.fontSize || 16}
                        fontWeight="bold"
                        textAnchor="middle"
                        dominantBaseline="hanging"
                        style={{
                          fill: label.color || '#1d4ed8',
                          writingMode: 'vertical-rl',
                          textOrientation: 'upright',
                          letterSpacing: '2px'
                        }}
                      >
                        {label.text}
                      </text>
                    ) : (
                      <text
                        x="0"
                        y="0"
                        fill={label.color || '#1d4ed8'}
                        fontSize={label.fontSize || 16}
                        fontWeight="bold"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fill: label.color || '#1d4ed8'
                        }}
                      >
                        {label.text}
                      </text>
                    )}
                  </g>
                ) : (
                  <text
                    x="0"
                    y="0"
                    fill={label.color || '#2563eb'}
                    fontSize={label.fontSize || 14}
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fill: label.color || '#2563eb'
                    }}
                  >
                    {label.text}
                  </text>
                )}

                {/* Quick On-Canvas Direction Switcher for Selected Landmark/Annotation */}
                {isSelected && !isReadOnly && onUpdateAnnotation && (
                  <g transform={`translate(0, ${hitY - 26})`} className="pointer-events-auto">
                    <rect
                      x="-86"
                      y="-11"
                      width="172"
                      height="22"
                      rx="6"
                      fill="#0f172a"
                      fillOpacity="0.95"
                      stroke="#3b82f6"
                      strokeWidth="1.2"
                    />
                    {[
                      { id: 'left' as const, label: '👈 ซ้าย', x: -64, w: 38 },
                      { id: 'right' as const, label: '👉 ขวา', x: -22, w: 38 },
                      { id: 'top' as const, label: '☝️ บน', x: 20, w: 32 },
                      { id: 'bottom' as const, label: '👇 ล่าง', x: 55, w: 32 },
                    ].map(b => {
                      const active = textPos === b.id;
                      return (
                        <g
                          key={b.id}
                          className="cursor-pointer hover:opacity-80"
                          onClick={(e) => {
                            e.stopPropagation();
                            const original = annotations.find(orig => orig.id === label.id) || label;
                            onUpdateAnnotation({
                              ...original,
                              textPosition: b.id,
                              orientation: (b.id === 'top' || b.id === 'bottom') ? 'vertical' : 'horizontal'
                            });
                          }}
                        >
                          <rect
                            x={b.x - b.w / 2}
                            y="-9"
                            width={b.w}
                            height="18"
                            rx="4"
                            fill={active ? '#2563eb' : '#334155'}
                          />
                          <text
                            x={b.x}
                            y="3"
                            fill="#ffffff"
                            fontSize="9"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {b.label}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                )}
              </g>
            );
          })}

          {/* Switches and Cutouts Layer */}
          {displayData.switches.map(sw => {
            const isTag = sw.type === 'FEEDER_TAG';
            const isBeingDragged = multiDragging?.items.switches.some(x => x.id === sw.id);
            const isSelected = selectedSwitchId === sw.id || isMultiSelected;
            const isOpened = sw.status === 'opened';
            const curRenderX = isBeingDragged ? Math.round(sw.x + (multiDragging?.dx || 0)) : sw.x;
            const curRenderY = isBeingDragged ? Math.round(sw.y + (multiDragging?.dy || 0)) : sw.y;

            return (
              <g
                key={sw.id}
                transform={`translate(${curRenderX}, ${curRenderY}) rotate(${sw.rotation || 0}) scale(${symbolScale})`}
                className={`transition-opacity duration-200 ${
                  isDraggable ? (isBeingDragged ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-pointer'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragMovedRef.current) return;
                  if (e.shiftKey || e.ctrlKey || e.metaKey) return;
                  setMultiSelection({
                    transformerIds: [],
                    switchIds: [sw.id],
                    annotationIds: [],
                    pathIds: []
                  });
                  onSelectTransformer(null);
                  onSelectPath?.(null);
                  onSelectAnnotation?.(null);
                  const original = switches.find(orig => orig.id === sw.id) || sw;
                  onSelectSwitch?.(original);
                }}
                onMouseDown={(e) => startDragMulti('switch', sw.id, e)}
              >
                {/* Selection Highlight Ring */}
                {isSelected && (
                  <rect
                    x="-26"
                    y="-18"
                    width="52"
                    height="36"
                    fill="#10b981"
                    fillOpacity="0.2"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeDasharray="4,3"
                    rx="6"
                  />
                )}

                {isTag ? (
                  <g>
                    <text
                      x="0"
                      y="0"
                      fill="#ef4444"
                      fontSize="12"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {sw.code}
                    </text>
                  </g>
                ) : sw.type === 'SUBSTATION' ? (
                  <g>
                    {/* Substation / Tie Junction Symbol: Crossed Box with diamond inside */}
                    <rect
                      x="-14"
                      y="-12"
                      width="28"
                      height="24"
                      fill={isOpened ? '#fef3c7' : (isTextBgTransparent ? 'none' : '#ffffff')}
                      stroke={isOpened ? '#d97706' : '#000000'}
                      strokeWidth={2}
                    />
                    <line x1="-14" y1="-12" x2="14" y2="12" stroke={isOpened ? '#d97706' : '#000000'} strokeWidth="1.5" />
                    <line x1="-14" y1="12" x2="14" y2="-12" stroke={isOpened ? '#d97706' : '#000000'} strokeWidth="1.5" />
                    <polygon points="0,-12 14,0 0,12 -14,0" fill="none" stroke={isOpened ? '#d97706' : '#000000'} strokeWidth="1" />
                    {sw.code && sw.code !== 'SUB' && (
                      <text
                        x="0"
                        y="22"
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="monospace"
                        fill={isOpened ? '#b45309' : '#0f172a'}
                      >
                        {sw.code}
                      </text>
                    )}
                    {isOpened && (
                      <circle cx="10" cy="-8" r="4" fill="#d97706" stroke="#ffffff" strokeWidth="1" />
                    )}
                  </g>
                ) : sw.type === 'CROSS_BOX' ? (
                  <g>
                    {/* Cross Box Symbol: Crossed Box */}
                    <rect
                      x="-15"
                      y="-13"
                      width="30"
                      height="26"
                      fill={isOpened ? '#fef3c7' : (isTextBgTransparent ? 'none' : '#ffffff')}
                      stroke={isOpened ? '#d97706' : '#000000'}
                      strokeWidth={2}
                    />
                    <line x1="-15" y1="-13" x2="15" y2="13" stroke={isOpened ? '#d97706' : '#000000'} strokeWidth="1.5" />
                    <line x1="-15" y1="13" x2="15" y2="-13" stroke={isOpened ? '#d97706' : '#000000'} strokeWidth="1.5" />
                    {sw.code && sw.code !== 'CROSS' && (
                      <text
                        x="0"
                        y="24"
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="monospace"
                        fill={isOpened ? '#b45309' : '#0f172a'}
                      >
                        {sw.code}
                      </text>
                    )}
                    {isOpened && (
                      <circle cx="10" cy="-8" r="4" fill="#d97706" stroke="#ffffff" strokeWidth="1" />
                    )}
                  </g>
                ) : (
                  <g>
                    {/* Disconnect Switch symbol / Tag */}
                    <rect
                      x="-20"
                      y="-12"
                      width="40"
                      height="24"
                      fill={isOpened ? '#fef3c7' : (isTextBgTransparent ? 'none' : '#ffffff')}
                      stroke={isOpened ? '#d97706' : '#0f172a'}
                      strokeWidth={isOpened ? 2 : 1.5}
                      rx="3"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="monospace"
                      fill={isOpened ? '#b45309' : '#0f172a'}
                    >
                      {sw.code}
                    </text>
                    {isOpened && (
                      <circle cx="15" cy="-8" r="4" fill="#d97706" stroke="#ffffff" strokeWidth="1" />
                    )}
                  </g>
                )}
              </g>
            );
          })}

          {/* Transformer Nodes Layer */}
          {displayData.transformers.map(t => {
            const isMultiSelected = multiSelection.transformerIds.includes(t.id);
            const isSelected = selectedId === t.id || isMultiSelected;
            const isHovered = hoveredTransformer?.id === t.id;
            const isMatchSearch = searchQuery && (
              t.peaNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
              t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              String(t.kva).includes(searchQuery)
            );
            if (!isTransformerVisible(t)) {
              return null;
            }

            const isPrivate = t.type === 'private';
            const triFill = isPrivate ? themeStyles.privateFill : themeStyles.publicFill;
            const triStroke = isPrivate ? themeStyles.privateStroke : themeStyles.publicStroke;

            const orientation = t.orientation || 'top';
            const textPos = t.textPosition || 'auto';

            // Symbol geometry: Triangle and stem line matching orientation & chosen stem direction (4 directions or none)
            const { triPoints, stemLine, effStemDir, bisectLine } = getTransformerGeometry(orientation, t.stemDirection);

            // Text Positioning: Smart non-overlapping coordinates
            let effectivePos: 'right' | 'left' | 'top' | 'bottom' = 'right';
            if (textPos === 'auto') {
              // In SLD, side placement for nodes guarantees zero clash with stem line or triangle apex
              effectivePos = 'right';
            } else {
              effectivePos = textPos;
            }

            let textAnchor: "start" | "middle" | "end" = "start";
            let textX = 24;
            let textY = -12;

            if (effectivePos === 'right') {
              textAnchor = "start";
              textX = effStemDir === 'right' ? 32 : (orientation === 'right' ? 28 : 24);
              textY = -12;
            } else if (effectivePos === 'left') {
              textAnchor = "end";
              textX = effStemDir === 'left' ? -32 : (orientation === 'left' ? -28 : -24);
              textY = -12;
            } else if (effectivePos === 'top') {
              textAnchor = "middle";
              textX = 0;
              textY = effStemDir === 'top' ? -56 : (orientation === 'top' ? -52 : -44);
            } else if (effectivePos === 'bottom') {
              textAnchor = "middle";
              textX = 0;
              textY = effStemDir === 'bottom' ? 40 : (orientation === 'bottom' ? 36 : 30);
            }

            // Compute background badge dimensions to ensure text never clashes with symbols or wires
            const nameLen = (t.name || '').length;
            const peaLen = (t.peaNo || '').length;
            const kvaLen = `${t.kva} kVA`.length;
            const maxChars = Math.max(nameLen, peaLen, kvaLen, 6);
            const badgeW = Math.max(76, maxChars * 8.5 + 24);
            const badgeH = 50;

            let badgeX = -badgeW / 2;
            if (textAnchor === 'start') {
              badgeX = -6;
            } else if (textAnchor === 'end') {
              badgeX = -badgeW + 6;
            }
            const badgeY = -12;

            const isBeingDragged = multiDragging?.items.transformers.some(x => x.id === t.id);
            const quickActionY = effectivePos === 'bottom' ? textY + 44 : (effStemDir === 'bottom' ? 42 : 36);
            const curRenderX = isBeingDragged ? Math.round(t.x + (multiDragging?.dx || 0)) : t.x;
            const curRenderY = isBeingDragged ? Math.round(t.y + (multiDragging?.dy || 0)) : t.y;

            return (
              <g
                key={t.id}
                id={`tr-node-${t.id}`}
                transform={`translate(${curRenderX}, ${curRenderY}) scale(${symbolScale})`}
                className={`transition-opacity duration-200 ${
                  isDraggable ? (isBeingDragged ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-pointer'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragMovedRef.current) return;
                  if (e.shiftKey || e.ctrlKey || e.metaKey) return;
                  setMultiSelection({
                    transformerIds: [t.id],
                    switchIds: [],
                    annotationIds: [],
                    pathIds: []
                  });
                  onSelectPath?.(null);
                  onSelectSwitch?.(null);
                  onSelectAnnotation?.(null);
                  const original = transformers.find(orig => orig.id === t.id) || t;
                  onSelectTransformer(original);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (isReadOnly) return;
                  const original = transformers.find(orig => orig.id === t.id) || t;
                  onEditTransformer(original);
                }}
                onMouseEnter={() => setHoveredTransformer(t)}
                onMouseLeave={() => setHoveredTransformer(null)}
                onMouseDown={(e) => startDragMulti('transformer', t.id, e)}
              >
                {/* Search match highlight indicator */}
                {isMatchSearch && (
                  <circle
                    cx="0"
                    cy="0"
                    r="30"
                    fill="#eab308"
                    fillOpacity="0.12"
                    stroke="#eab308"
                    strokeWidth="2.5"
                    strokeDasharray="4,3"
                  />
                )}

                {/* Selection Highlight Circle */}
                {isSelected && (
                  <circle
                    cx="0"
                    cy="0"
                    r="28"
                    fill="#3b82f6"
                    fillOpacity="0.15"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    strokeDasharray="4,3"
                  />
                )}

                {/* Connection Stem Line matching chosen stem direction */}
                {stemLine && (
                  <line
                    x1={stemLine.x1}
                    y1={stemLine.y1}
                    x2={stemLine.x2}
                    y2={stemLine.y2}
                    stroke={triStroke}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                )}

                {/* Transformer Triangle (Equilateral Symbol) */}
                {t.phase === '2x1P' ? (
                  // หม้อแปลง 1 เฟส จุดเดียวกัน 2 เครื่อง: สัญลักษณ์รูปสามเหลี่ยมคู่ (Twin Triangles)
                  <g className="transition-transform duration-150 hover:scale-110">
                    <g transform={`translate(${
                      orientation === 'top' || orientation === 'bottom' ? '-7, 0' : '0, -7'
                    })`}>
                      <polygon
                        points={triPoints}
                        fill={triFill}
                        stroke={triStroke}
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                    </g>
                    <g transform={`translate(${
                      orientation === 'top' || orientation === 'bottom' ? '7, 0' : '0, 7'
                    })`}>
                      <polygon
                        points={triPoints}
                        fill={triFill}
                        stroke={triStroke}
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                    </g>
                  </g>
                ) : (
                  <polygon
                    points={triPoints}
                    fill={triFill}
                    stroke={triStroke}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    className="transition-transform duration-150 hover:scale-110"
                  />
                )}

                {/* สัญลักษณ์เฉพาะสำหรับหม้อแปลง 1 เฟส 1 เครื่อง (1 Phase 1 Unit / 1P / 1Ø) - แสดงป้าย 1Ø ที่มุม */}
                {t.phase === '1P' && (
                  <g pointerEvents="none">
                    {/* ป้ายสัญลักษณ์ 1 เฟส (1Ø Badge) กำกับที่มุมสัญลักษณ์ */}
                    <g transform={`translate(${
                      orientation === 'top' ? '12, -12' :
                      orientation === 'bottom' ? '12, 12' :
                      orientation === 'left' ? '-14, -14' : '14, -14'
                    })`}>
                      <rect
                        x="-8"
                        y="-7"
                        width="16"
                        height="13"
                        rx="3"
                        fill={isPrivate ? '#2563eb' : '#9333ea'}
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3"
                        fontSize="8.5"
                        fontWeight="800"
                        fill="#ffffff"
                        textAnchor="middle"
                        fontFamily="sans-serif"
                      >
                        1Ø
                      </text>
                    </g>
                  </g>
                )}

                {/* สัญลักษณ์เฉพาะสำหรับหม้อแปลง 1 เฟส 2 เครื่อง (1 Phase 2 Units / 2x1P / 2x1Ø) - แสดงป้าย 2x1Ø ที่มุม */}
                {t.phase === '2x1P' && (
                  <g pointerEvents="none">
                    {/* ป้ายสัญลักษณ์ 1 เฟส 2 เครื่อง (2x1Ø Badge) กำกับที่มุมสัญลักษณ์ */}
                    <g transform={`translate(${
                      orientation === 'top' ? '18, -12' :
                      orientation === 'bottom' ? '18, 12' :
                      orientation === 'left' ? '-14, -18' : '14, -18'
                    })`}>
                      <rect
                        x="-13"
                        y="-7"
                        width="26"
                        height="13"
                        rx="3"
                        fill={isPrivate ? '#2563eb' : '#9333ea'}
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3"
                        fontSize="8"
                        fontWeight="800"
                        fill="#ffffff"
                        textAnchor="middle"
                        fontFamily="sans-serif"
                      >
                        2x1Ø
                      </text>
                    </g>
                  </g>
                )}

                {/* Phase / AC symbol if present */}
                {t.phase === 'AC' && (
                  <text
                    x={orientation === 'left' ? 16 : -16}
                    y="4"
                    fontSize="10"
                    fontWeight="bold"
                    fill="#2563eb"
                    textAnchor="middle"
                  >
                    AC
                  </text>
                )}

                {/* Text Metadata Block (kVA, PEA No., Name) with protective background badge & halo */}
                <g transform={`translate(${textX}, ${textY})`}>
                  {/* Background plate to ensure text never clashes with symbols or wires */}
                  {!isTextBgTransparent && (
                    <rect
                      x={badgeX}
                      y={badgeY}
                      width={badgeW}
                      height={badgeH}
                      rx="6"
                      fill={themeStyles.canvasPaper}
                      fillOpacity="0.98"
                      stroke={themeStyles.border}
                      strokeWidth="1"
                    />
                  )}

                  {/* kVA Rating with unit & color */}
                  <text
                    x="0"
                    y="3"
                    textAnchor={textAnchor}
                    fontSize="12"
                    fontWeight="800"
                    fontFamily="sans-serif"
                    fill={isPrivate ? '#2563eb' : '#9333ea'}
                    style={{
                      paintOrder: 'stroke fill',
                      stroke: isTextBgTransparent ? 'none' : themeStyles.canvasPaper,
                      strokeWidth: isTextBgTransparent ? '0px' : '2px',
                      strokeLinejoin: 'round'
                    }}
                  >
                    {t.kva} kVA
                  </text>

                  {/* PEA Number */}
                  <text
                    x="0"
                    y="17"
                    textAnchor={textAnchor}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="700"
                    fill={themeStyles.textSecondary}
                    style={{
                      paintOrder: 'stroke fill',
                      stroke: isTextBgTransparent ? 'none' : themeStyles.canvasPaper,
                      strokeWidth: isTextBgTransparent ? '0px' : '2px',
                      strokeLinejoin: 'round'
                    }}
                  >
                    {t.peaNo}
                  </text>

                  {/* Location / Consumer Name */}
                  <text
                    x="0"
                    y="31"
                    textAnchor={textAnchor}
                    fontSize="11"
                    fontFamily="sans-serif"
                    fill={themeStyles.textPrimary}
                    fontWeight="700"
                    style={{
                      paintOrder: 'stroke fill',
                      stroke: isTextBgTransparent ? 'none' : themeStyles.canvasPaper,
                      strokeWidth: isTextBgTransparent ? '0px' : '2px',
                      strokeLinejoin: 'round'
                    }}
                  >
                    {t.name}
                  </text>
                </g>

                {/* Quick actions popup when selected */}
                {isSelected && (
                  <g transform={`translate(0, ${quickActionY})`} className="pointer-events-auto">
                    {isValidLatLng(t.latitude, t.longitude) ? (
                      <>
                        <rect
                          x={isReadOnly ? "-36" : "-64"}
                          y="-12"
                          width={isReadOnly ? "72" : "128"}
                          height="24"
                          rx="12"
                          fill="#0f172a"
                          fillOpacity="0.92"
                          stroke="#3b82f6"
                          strokeWidth="1"
                        />
                        <text
                          x={isReadOnly ? "0" : "-40"}
                          y="4"
                          fill="#60a5fa"
                          fontSize="10"
                          fontWeight="bold"
                          textAnchor={isReadOnly ? "middle" : "start"}
                          className="cursor-pointer hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(getGoogleMapsNavUrl(t.latitude!, t.longitude!), '_blank');
                          }}
                        >
                          📍นำทาง
                        </text>
                        {!isReadOnly && (
                          <>
                            <text
                              x="0"
                              y="4"
                              fill="#ffffff"
                              fontSize="10"
                              fontWeight="bold"
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                const original = transformers.find(orig => orig.id === t.id) || t;
                                onEditTransformer(original);
                              }}
                            >
                              แก้ไข
                            </text>
                            <text
                              x="38"
                              y="4"
                              fill="#f87171"
                              fontSize="10"
                              fontWeight="bold"
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteTransformer(t.id);
                              }}
                            >
                              ลบ
                            </text>
                          </>
                        )}
                      </>
                    ) : (
                      !isReadOnly && (
                        <>
                          <rect
                            x="-38"
                            y="-12"
                            width="76"
                            height="24"
                            rx="12"
                            fill="#0f172a"
                            fillOpacity="0.9"
                          />
                          <text
                            x="-18"
                            y="4"
                            fill="#ffffff"
                            fontSize="10"
                            fontWeight="bold"
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditTransformer(t);
                            }}
                          >
                            แก้ไข
                          </text>
                          <text
                            x="14"
                            y="4"
                            fill="#f87171"
                            fontSize="10"
                            fontWeight="bold"
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTransformer(t.id);
                            }}
                          >
                            ลบ
                          </text>
                        </>
                      )
                    )}
                  </g>
                )}
              </g>
            );
          })}

          {/* Marquee Rubber-band Selection Box Preview */}
          {marqueeBox && (
            <g className="pointer-events-none">
              <rect
                x={Math.min(marqueeBox.startX, marqueeBox.currentX)}
                y={Math.min(marqueeBox.startY, marqueeBox.currentY)}
                width={Math.max(1, Math.abs(marqueeBox.currentX - marqueeBox.startX))}
                height={Math.max(1, Math.abs(marqueeBox.currentY - marqueeBox.startY))}
                fill="#3b82f6"
                fillOpacity="0.15"
                stroke="#2563eb"
                strokeWidth="1.5"
                strokeDasharray="5,4"
                rx="4"
              />
            </g>
          )}

          {/* Group Selection Bounding Box & Drag Handle */}
          {selectedBounds && totalSelectedCount >= 2 && (
            <g className="pointer-events-auto">
              {/* Outer Dashed Boundary Box */}
              <rect
                x={selectedBounds.minX}
                y={selectedBounds.minY}
                width={selectedBounds.width}
                height={selectedBounds.height}
                fill="#0284c7"
                fillOpacity="0.05"
                stroke="#0284c7"
                strokeWidth="1.8"
                strokeDasharray="6,4"
                rx="8"
                className="cursor-move"
                onMouseDown={(e) => {
                  const firstTf = multiSelection.transformerIds[0];
                  const firstSw = multiSelection.switchIds[0];
                  const firstPath = multiSelection.pathIds[0];
                  const firstAnn = multiSelection.annotationIds[0];
                  if (firstTf) startDragMulti('transformer', firstTf, e);
                  else if (firstSw) startDragMulti('switch', firstSw, e);
                  else if (firstPath) startDragMulti('path', firstPath, e);
                  else if (firstAnn) startDragMulti('annotation', firstAnn, e);
                }}
              />

              {/* Corner brackets for CAD styling */}
              <path
                d={`M ${selectedBounds.minX + 10} ${selectedBounds.minY} L ${selectedBounds.minX} ${selectedBounds.minY} L ${selectedBounds.minX} ${selectedBounds.minY + 10}`}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
              />
              <path
                d={`M ${selectedBounds.maxX - 10} ${selectedBounds.minY} L ${selectedBounds.maxX} ${selectedBounds.minY} L ${selectedBounds.maxX} ${selectedBounds.minY + 10}`}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
              />
              <path
                d={`M ${selectedBounds.minX + 10} ${selectedBounds.maxY} L ${selectedBounds.minX} ${selectedBounds.maxY} L ${selectedBounds.minX} ${selectedBounds.maxY - 10}`}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
              />
              <path
                d={`M ${selectedBounds.maxX - 10} ${selectedBounds.maxY} L ${selectedBounds.maxX} ${selectedBounds.maxY} L ${selectedBounds.maxX} ${selectedBounds.maxY - 10}`}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
              />

              {/* Top Move Handle Badge */}
              <g
                transform={`translate(${selectedBounds.minX}, ${selectedBounds.minY - 26})`}
                className="cursor-move group"
                onMouseDown={(e) => {
                  const firstTf = multiSelection.transformerIds[0];
                  const firstSw = multiSelection.switchIds[0];
                  const firstPath = multiSelection.pathIds[0];
                  const firstAnn = multiSelection.annotationIds[0];
                  if (firstTf) startDragMulti('transformer', firstTf, e);
                  else if (firstSw) startDragMulti('switch', firstSw, e);
                  else if (firstPath) startDragMulti('path', firstPath, e);
                  else if (firstAnn) startDragMulti('annotation', firstAnn, e);
                }}
              >
                <rect
                  x="0"
                  y="0"
                  width="130"
                  height="22"
                  rx="6"
                  fill="#0284c7"
                  className="group-hover:fill-sky-600 transition-colors shadow-md"
                />
                <text
                  x="65"
                  y="15"
                  fill="#ffffff"
                  fontSize="10.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  ✢ ลากย้าย ({totalSelectedCount} รายการ)
                </text>
              </g>
            </g>
          )}
          </g>
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredTransformer && !selectedId && (
          <div
            className="absolute z-30 pointer-events-none bg-slate-900/95 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs w-64 backdrop-blur-sm transition-all"
            style={{
              left: Math.min(
                Math.max(hoveredTransformer.x * zoom + pan.x + 20, 16),
                (containerRef.current?.clientWidth || 800) - 270
              ),
              top: Math.min(
                Math.max(hoveredTransformer.y * zoom + pan.y - 40, 16),
                (containerRef.current?.clientHeight || 600) - 150
              )
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-amber-400 text-sm">
                  {hoveredTransformer.kva} kVA
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-900/60 text-amber-200 border border-amber-700/60">
                  {hoveredTransformer.phase === '1P' ? '1 เฟส (1Ø)' : hoveredTransformer.phase === '2x1P' ? '1 เฟส 2 เครื่อง (2x1Ø)' : hoveredTransformer.phase === 'AC' ? 'AC' : '3 เฟส (3Ø)'}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                hoveredTransformer.type === 'private'
                  ? 'bg-blue-900 text-blue-200 border border-blue-700'
                  : 'bg-purple-900 text-purple-200 border border-purple-700'
              }`}>
                {hoveredTransformer.type === 'private' ? 'ผู้ใช้ไฟ' : 'กฟภ.'}
              </span>
            </div>
            <div className="space-y-1">
              <div><span className="text-slate-400">รหัส PEA:</span> <span className="font-mono font-medium text-slate-200">{hoveredTransformer.peaNo}</span></div>
              <div><span className="text-slate-400">สถานที่:</span> <span className="text-slate-100 font-medium">{hoveredTransformer.name}</span></div>
              <div><span className="text-slate-400">สายป้อน:</span> <span className="text-slate-300">{hoveredTransformer.feeder || 'ไลน์สวนดอก'}</span></div>
              {hoveredTransformer.branch && (
                <div><span className="text-slate-400">สายแยก:</span> <span className="text-slate-300">{hoveredTransformer.branch}</span></div>
              )}
              {hoveredTransformer.notes && (
                <div className="text-slate-400 italic pt-1 border-t border-slate-800">
                  {hoveredTransformer.notes}
                </div>
              )}
            </div>
            <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
              <span>ดับเบิลคลิกเพื่อแก้ไข</span>
              {isDraggable && <span>ลากเพื่อย้ายพิกัด</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
