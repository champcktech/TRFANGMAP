import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Transformer, SwitchNode, FeederPath, AnnotationLabel } from '../types';
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
  Type
} from 'lucide-react';

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
  filterType: 'all' | 'public' | 'private';
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
  onAddTransformerAt: (x: number, y: number) => void;
  onAddSwitchAt?: (x: number, y: number) => void;
  onAddAnnotationAt?: (x: number, y: number) => void;
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
  filterType,
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
  onAddTransformerAt,
  onAddSwitchAt,
  onAddAnnotationAt
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 40, y: 20 });
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
  } | null>(null);

  // Drawing new line state
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[]>([]);
  const [mouseCanvasPos, setMouseCanvasPos] = useState<{ x: number; y: number } | null>(null);

  const dragMovedRef = useRef<boolean>(false);
  const [hoveredTransformer, setHoveredTransformer] = useState<Transformer | null>(null);
  const [hoveredPathId, setHoveredPathId] = useState<string | null>(null);
  const [canvasClickMode, setCanvasClickMode] = useState<'select' | 'add' | 'add_switch' | 'add_annotation' | 'edit_line' | 'draw_line'>('select');
  const [showGrid, setShowGrid] = useState(true);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const canvasSizeMode: 'a4_landscape' = 'a4_landscape'; // ล็อคขนาดเท่า A4 แนวนอนเป็นมาตรฐาน
  const [symbolScale, setSymbolScale] = useState<number>(0.85); // 0.85 default (ขนาดสัญลักษณ์กะทัดรัดลง)
  const canvasOrientation: 'landscape' = 'landscape'; // แนวนอนเป็นมาตรฐานถาวรตามความต้องการของผู้ใช้

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

  // Global window listeners for butter-smooth dragging & panning + Delete key
  useEffect(() => {
    // Keyboard delete shortcut for any selected element
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isReadOnly) return;
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedPathId && onDeleteFeederPath) {
          e.preventDefault();
          onDeleteFeederPath(selectedPathId);
          onSelectPath?.(null);
        } else if (selectedSwitchId && onDeleteSwitch) {
          e.preventDefault();
          onDeleteSwitch(selectedSwitchId);
          onSelectSwitch?.(null);
        } else if (selectedAnnotationId && onDeleteAnnotation) {
          e.preventDefault();
          onDeleteAnnotation(selectedAnnotationId);
          onSelectAnnotation?.(null);
        } else if (selectedId && onDeleteTransformer) {
          e.preventDefault();
          onDeleteTransformer(selectedId);
          onSelectTransformer(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isReadOnly,
    selectedPathId,
    selectedSwitchId,
    selectedAnnotationId,
    selectedId,
    onDeleteFeederPath,
    onDeleteSwitch,
    onDeleteAnnotation,
    onDeleteTransformer,
    onSelectPath,
    onSelectSwitch,
    onSelectAnnotation,
    onSelectTransformer
  ]);

  // Global window listeners for butter-smooth dragging & panning
  useEffect(() => {
    if (!isPanning && !draggingItem && !draggingVertex) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        setPan({
          x: e.clientX - startPan.x,
          y: e.clientY - startPan.y
        });
      } else if (draggingItem) {
        const dx = (e.clientX - draggingItem.startX) / zoom;
        const dy = (e.clientY - draggingItem.startY) / zoom;
        
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          dragMovedRef.current = true;
        }

        const newX = Math.round(draggingItem.initialX + dx);
        const newY = Math.round(draggingItem.initialY + dy);

        setDraggingItem(prev => prev ? { ...prev, currentX: newX, currentY: newY } : null);

        const pt = toPortraitCoords(newX, newY);

        if (draggingItem.type === 'transformer') {
          onUpdateTransformerPosition(draggingItem.id, pt.x, pt.y);
        } else if (draggingItem.type === 'switch' && onUpdateSwitchPosition) {
          onUpdateSwitchPosition(draggingItem.id, pt.x, pt.y);
        } else if (draggingItem.type === 'annotation' && onUpdateAnnotationPosition) {
          onUpdateAnnotationPosition(draggingItem.id, pt.x, pt.y);
        }
      } else if (draggingVertex && onUpdateFeederPath) {
        const dx = (e.clientX - draggingVertex.startX) / zoom;
        const dy = (e.clientY - draggingVertex.startY) / zoom;

        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          dragMovedRef.current = true;
        }

        const newX = Math.round(draggingVertex.initialX + dx);
        const newY = Math.round(draggingVertex.initialY + dy);

        const targetPath = feederPaths.find(p => p.id === draggingVertex.pathId);
        if (targetPath) {
          const pt = toPortraitCoords(newX, newY);
          const newPoints = [...targetPath.points];
          newPoints[draggingVertex.pointIndex] = { x: pt.x, y: pt.y };
          onUpdateFeederPath({ ...targetPath, points: newPoints });
        }
      }
    };

    const handleWindowMouseUp = () => {
      setIsPanning(false);
      setDraggingItem(null);
      setDraggingVertex(null);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isPanning, draggingItem, draggingVertex, startPan, zoom, feederPaths, onUpdateTransformerPosition, onUpdateSwitchPosition, onUpdateAnnotationPosition, onUpdateFeederPath]);

  // Zoom handlers
  const handleZoomIn = () => setZoom(z => Math.min(z * 1.2, 3.5));
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.2, 0.4));
  const handleResetZoom = () => {
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

  // ปรับมุมมองให้อัตโนมัติเมื่อเปิดหน้าเว็บ หรือเมื่อสลับแผ่นผัง หรือปรับขนาดหน้าต่าง
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFitToScreen();
    }, 100);

    // ใช้ ResizeObserver เพื่อปรับพอดีหน้าจอเมื่อกล่องแสดงผลเปลี่ยนขนาด
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => {
        handleFitToScreen();
      });
      resizeObserver.observe(containerRef.current);
      return () => {
        clearTimeout(timer);
        resizeObserver.disconnect();
      };
    }

    return () => clearTimeout(timer);
  }, [sheetId, transformers.length, canvasOrientation, handleFitToScreen]);

  // Mouse wheel zoom & pan
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoom(z => Math.min(Math.max(z * zoomFactor, 0.4), 3.5));
    } else {
      setPan(p => ({
        x: p.x - e.deltaX * 0.8,
        y: p.y - e.deltaY * 0.8
      }));
    }
  };

  // Mouse move over canvas to track coordinates for drawing
  const handleMouseMoveOnCanvas = (e: React.MouseEvent) => {
    if (canvasClickMode === 'draw_line') {
      const pos = screenToCanvas(e.clientX, e.clientY);
      setMouseCanvasPos(pos);
    }
  };

  // Mouse down on background (Panning, Add, or Draw)
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
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

      if (canvasClickMode === 'draw_line') {
        // Add point to current drawing
        setDrawingPoints(prev => [...prev, coords]);
        return;
      }

      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      onSelectTransformer(null);
      onSelectPath?.(null);
      onSelectSwitch?.(null);
      onSelectAnnotation?.(null);
    }
  };

  // Drag start helper for items
  const startDrag = (
    type: 'transformer' | 'switch' | 'annotation',
    id: string,
    initialX: number,
    initialY: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (isReadOnly || !isDraggable) return;
    dragMovedRef.current = false;
    setDraggingItem({
      type,
      id,
      startX: e.clientX,
      startY: e.clientY,
      initialX,
      initialY,
      currentX: initialX,
      currentY: initialY
    });
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
    setDraggingVertex({
      pathId,
      pointIndex,
      startX: e.clientX,
      startY: e.clientY,
      initialX,
      initialY
    });
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

  // Center on selected transformer if query searched
  useEffect(() => {
    if (selectedId) {
      const selected = displayData.transformers.find(t => t.id === selectedId);
      if (selected && containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setPan({
          x: clientWidth / 2 - selected.x * zoom,
          y: clientHeight / 2 - selected.y * zoom
        });
      }
    }
  }, [selectedId, zoom, displayData.transformers]);

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
    <div className="relative w-full h-full flex flex-col select-none overflow-hidden bg-slate-100 dark:bg-slate-900">
      {/* Floating Canvas Toolbar */}
      <div className="absolute top-2 left-2 z-20 flex flex-wrap items-center gap-1.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md px-2 py-1 rounded-lg shadow-md border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-700 pr-1.5">
          <button
            id="btn-zoom-in"
            onClick={handleZoomIn}
            title="ซูมเข้า (Zoom In)"
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
            title="ซูมออก (Zoom Out)"
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
                     canvasClickMode === 'add_annotation' ? 'วางข้อความ' : 'เพิ่มสัญลักษณ์'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-80" />
                </button>

                {isAddMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
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
                      <span>🔤 เพิ่มข้อความ / ชื่อถนน / สถานที่</span>
                    </button>
                    <button
                      onClick={() => {
                        setDrawingPoints([]);
                        setCanvasClickMode('draw_line');
                        setIsAddMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center gap-2 text-purple-700 dark:text-purple-300 font-medium border-t border-slate-100 dark:border-slate-700 mt-1"
                    >
                      <PenTool className="w-4 h-4 text-purple-600" />
                      <span>🖊️ วาดเส้นวงจรใหม่ (Pen Tool)</span>
                    </button>
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

      {/* Legend & Guide Pill (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-4 text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <svg width="18" height="16" viewBox="0 0 18 16" className="inline-block">
            <polygon points="9,2 16,14 2,14" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
          </svg>
          <span>ทั่วไป (Public)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="18" height="16" viewBox="0 0 18 16" className="inline-block">
            <polygon points="9,2 16,14 2,14" fill="#0f172a" stroke="#0f172a" strokeWidth="2" />
          </svg>
          <span>เฉพาะราย (Dedicated)</span>
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
        onWheel={handleWheel}
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
                หม้อแปลง: <tspan fill={themeStyles.textPrimary} fontWeight="bold">{displayData.transformers.length} ลูก</tspan>
              </text>
              <text x="182" y="79" fill={themeStyles.textSecondary} fontSize="9.5" fontFamily="sans-serif">
                พิกัดผัง: <tspan fill={themeStyles.textPrimary} fontWeight="bold">2079 × 1470 px</tspan>
              </text>
            </g>
          </g>

          {/* Feeder Path Lines Layer with Interactive Controls */}
          {displayData.feederPaths.map(path => {
            const isSelected = selectedPathId === path.id;
            const isHovered = hoveredPathId === path.id;
            const isLineEditing = !isReadOnly && (canvasClickMode === 'edit_line' || isSelected);
            const pointsStr = path.points.map(p => `${p.x},${p.y}`).join(' ');
            const lineColor = path.color || themeStyles.wire;

            return (
              <g 
                key={path.id}
                onMouseEnter={() => setHoveredPathId(path.id)}
                onMouseLeave={() => setHoveredPathId(null)}
              >
                {/* Thick Transparent Hitbox for easier line selection */}
                <polyline
                  points={pointsStr}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={24}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTransformer(null);
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
                    stroke="#3b82f6"
                    strokeWidth={(path.strokeWidth || 2.5) + 6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={isSelected ? 0.6 : 0.25}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTransformer(null);
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
            const isSelected = selectedAnnotationId === label.id;
            const isBeingDragged = draggingItem?.type === 'annotation' && draggingItem.id === label.id;

            // Compute hit-box bounds according to annotation type
            let hitW = Math.max(80, (label.text?.length || 4) * 14 + 24);
            let hitH = 32;
            let hitX = -hitW / 2;
            let hitY = -hitH / 2;

            if (label.type === 'feeder_title') {
              hitW = 260;
              hitH = 70;
              hitX = -130;
              hitY = -35;
            } else if (label.type === 'road') {
              if (isVertical) {
                hitW = 36;
                hitH = Math.max(80, (label.text?.length || 4) * 20);
                hitX = -18;
                hitY = 0;
              } else {
                hitW = Math.max(120, (label.text?.length || 4) * 16 + 30);
                hitH = 36;
                hitX = -hitW / 2;
                hitY = -18;
              }
            }

            return (
              <g
                key={label.id}
                id={`ann-${label.id}`}
                transform={`translate(${label.x}, ${label.y})`}
                className={`${
                  isDraggable
                    ? (isBeingDragged ? 'cursor-grabbing' : 'cursor-grab')
                    : 'cursor-pointer'
                } group`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragMovedRef.current) return;
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
                onMouseDown={(e) => startDrag('annotation', label.id, label.x, label.y, e)}
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
                    className="animate-pulse"
                  />
                )}

                {/* Real-time Coordinate Floating Badge during Drag */}
                {isBeingDragged && (
                  <g transform={`translate(0, ${hitY - 14})`} className="pointer-events-none">
                    <rect
                      x="-44"
                      y="-12"
                      width="88"
                      height="22"
                      rx="6"
                      fill="#2563eb"
                      fillOpacity="0.95"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    <text
                      x="0"
                      y="3"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {label.x}, {label.y}
                    </text>
                  </g>
                )}

                {label.type === 'feeder_title' ? (
                  <g>
                    <rect
                      x="-130"
                      y="-35"
                      width="260"
                      height="70"
                      fill="#ffffff"
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
                ) : label.type === 'road' ? (
                  <g>
                    {isVertical ? (
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
              </g>
            );
          })}

          {/* Switches and Cutouts Layer */}
          {displayData.switches.map(sw => {
            const isTag = sw.type === 'FEEDER_TAG';
            const isBeingDragged = draggingItem?.type === 'switch' && draggingItem.id === sw.id;
            const isSelected = selectedSwitchId === sw.id;
            const isOpened = sw.status === 'opened';

            return (
              <g
                key={sw.id}
                transform={`translate(${sw.x}, ${sw.y}) rotate(${sw.rotation || 0}) scale(${symbolScale})`}
                className={`transition-opacity duration-200 ${
                  isDraggable ? (isBeingDragged ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-pointer'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragMovedRef.current) return;
                  onSelectTransformer(null);
                  onSelectPath?.(null);
                  onSelectAnnotation?.(null);
                  const original = switches.find(orig => orig.id === sw.id) || sw;
                  onSelectSwitch?.(original);
                }}
                onMouseDown={(e) => startDrag('switch', sw.id, sw.x, sw.y, e)}
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
                    className="animate-pulse"
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
                      fill={isOpened ? '#fef3c7' : '#ffffff'}
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
                      fill={isOpened ? '#fef3c7' : '#ffffff'}
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
                      fill={isOpened ? '#fef3c7' : '#ffffff'}
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
            const isSelected = selectedId === t.id;
            const isHovered = hoveredTransformer?.id === t.id;
            const isMatchSearch = searchQuery && (
              t.peaNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
              t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              String(t.kva).includes(searchQuery)
            );
            const isFilteredOut = (filterKva && t.kva !== filterKva) ||
              (filterType !== 'all' && t.type !== filterType);

            const isPrivate = t.type === 'private';
            const triFill = isPrivate ? themeStyles.privateFill : themeStyles.publicFill;
            const triStroke = isPrivate ? themeStyles.privateStroke : themeStyles.publicStroke;

            const orientation = t.orientation || 'top';
            const textPos = t.textPosition || 'auto';

            // Symbol geometry: Triangle and stem line matching orientation & chosen stem direction (4 directions or none)
            const { triPoints, stemLine, effStemDir } = getTransformerGeometry(orientation, t.stemDirection);

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

            const isBeingDragged = draggingItem?.type === 'transformer' && draggingItem.id === t.id;
            const quickActionY = effectivePos === 'bottom' ? textY + 44 : (effStemDir === 'bottom' ? 42 : 36);

            return (
              <g
                key={t.id}
                id={`tr-node-${t.id}`}
                transform={`translate(${t.x}, ${t.y}) scale(${symbolScale})`}
                opacity={isFilteredOut ? 0.2 : 1}
                className={`transition-opacity duration-200 ${
                  isDraggable ? (isBeingDragged ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-pointer'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragMovedRef.current) return;
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
                onMouseDown={(e) => startDrag('transformer', t.id, t.x, t.y, e)}
              >
                {/* Real-time Coordinate Floating Badge during Drag */}
                {isBeingDragged && (
                  <g transform="translate(0, -38)" className="pointer-events-none">
                    <rect
                      x="-44"
                      y="-12"
                      width="88"
                      height="22"
                      rx="6"
                      fill="#2563eb"
                      fillOpacity="0.95"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    <text
                      x="0"
                      y="3"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      X:{t.x} Y:{t.y}
                    </text>
                  </g>
                )}
                {/* Search match pulsating indicator */}
                {isMatchSearch && (
                  <circle
                    cx="0"
                    cy="0"
                    r="32"
                    fill="none"
                    stroke="#eab308"
                    strokeWidth="3"
                    className="animate-ping"
                    opacity="0.75"
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
                <polygon
                  points={triPoints}
                  fill={triFill}
                  stroke={triStroke}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  className="transition-transform duration-150 hover:scale-110"
                />

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

                  {/* kVA Rating with unit & color */}
                  <text
                    x="0"
                    y="3"
                    textAnchor={textAnchor}
                    fontSize="12"
                    fontWeight="800"
                    fontFamily="sans-serif"
                    fill={isPrivate ? '#9333ea' : '#2563eb'}
                    style={{
                      paintOrder: 'stroke fill',
                      stroke: themeStyles.canvasPaper,
                      strokeWidth: '2px',
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
                      stroke: themeStyles.canvasPaper,
                      strokeWidth: '2px',
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
                      stroke: themeStyles.canvasPaper,
                      strokeWidth: '2px',
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
              <span className="font-bold text-amber-400 text-sm">
                {hoveredTransformer.kva} kVA
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                hoveredTransformer.type === 'private'
                  ? 'bg-purple-900 text-purple-200'
                  : 'bg-emerald-900 text-emerald-200'
              }`}>
                {hoveredTransformer.type === 'private' ? 'หม้อแปลงเฉพาะราย' : 'หม้อแปลงจำหน่ายทั่วไป'}
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
