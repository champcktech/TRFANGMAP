import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Zap, 
  Map, 
  Table, 
  BarChart3, 
  Plus, 
  FileSpreadsheet, 
  Printer, 
  Search, 
  Moon, 
  Sun, 
  Lock, 
  Unlock, 
  Share2,
  Eye,
  ChevronDown,
  Layers,
  ExternalLink,
  Database,
  LogOut,
  LogIn,
  Edit3,
  X,
  Compass,
  ArrowRight
} from 'lucide-react';
import { GoogleSheetConfig, DiagramSheet, Transformer, AnnotationLabel } from '../types';

interface NavbarProps {
  currentView: 'canvas' | 'table' | 'stats';
  searchQuery: string;
  theme: 'white' | 'blueprint' | 'dark';
  isDraggable: boolean;
  isReadOnly?: boolean;
  transformerCount: number;
  totalKva: number;
  sheetConfig: GoogleSheetConfig;
  sheetTitle?: string;
  sheetNo?: string;
  activeSheetId?: string;
  sheets?: DiagramSheet[];
  totalSheets?: number;
  currentUser?: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
  } | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
  onSelectView: (view: 'canvas' | 'table' | 'stats') => void;
  onSelectSheet?: (sheetId: string) => void;
  onSearchChange: (query: string) => void;
  onSelectTransformer?: (transformer: Transformer, sheetId?: string) => void;
  onSelectAnnotation?: (annotation: AnnotationLabel, sheetId?: string) => void;
  onThemeToggle: () => void;
  onToggleDraggable: () => void;
  onToggleReadOnly?: () => void;
  onOpenShareModal?: () => void;
  onOpenAddModal: () => void;
  onOpenGoogleSheetsModal: () => void;
  onPrintDiagram: () => void;
  onOpenEditSheetModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  searchQuery,
  theme,
  isDraggable,
  isReadOnly = false,
  transformerCount,
  totalKva,
  sheetConfig,
  sheetTitle = 'ไลน์สวนดอก',
  sheetNo = '(1)',
  activeSheetId,
  sheets = [],
  totalSheets = 1,
  currentUser,
  onSignIn,
  onSignOut,
  onSelectView,
  onSelectSheet,
  onSearchChange,
  onSelectTransformer,
  onSelectAnnotation,
  onThemeToggle,
  onToggleDraggable,
  onToggleReadOnly,
  onOpenShareModal,
  onOpenAddModal,
  onOpenGoogleSheetsModal,
  onPrintDiagram,
  onOpenEditSheetModal
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close search popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K or / to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
      } else if (e.key === 'Escape') {
        setIsSearchFocused(false);
        setIsMobileSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter transformers and landmarks across active sheet and other sheets
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const results: {
      type: 'transformer' | 'landmark';
      transformer?: Transformer;
      annotation?: AnnotationLabel;
      sheetId: string;
      sheetName: string;
      isCurrentSheet: boolean;
    }[] = [];

    // 1. Search transformers in active sheet first
    const currentSheetObj = sheets.find(s => s.id === activeSheetId);
    if (currentSheetObj && currentSheetObj.transformers) {
      currentSheetObj.transformers.forEach(t => {
        const match = 
          t.peaNo.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          String(t.kva).includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q)) ||
          (t.poleNo && t.poleNo.toLowerCase().includes(q));
        if (match) {
          results.push({
            type: 'transformer',
            transformer: t,
            sheetId: currentSheetObj.id,
            sheetName: `${currentSheetObj.sheetNo || ''} ${currentSheetObj.title || ''}`.trim(),
            isCurrentSheet: true
          });
        }
      });
    }

    // 2. Search landmarks / annotations across all sheets
    sheets.forEach(s => {
      if (s.annotations) {
        s.annotations.forEach(a => {
          const match = a.text && a.text.toLowerCase().includes(q);
          if (match) {
            results.push({
              type: 'landmark',
              annotation: a,
              sheetId: s.id,
              sheetName: `${s.sheetNo || ''} ${s.title || ''}`.trim(),
              isCurrentSheet: s.id === activeSheetId
            });
          }
        });
      }
    });

    // 3. Search transformers in other sheets
    sheets.forEach(s => {
      if (s.id !== activeSheetId && s.transformers) {
        s.transformers.forEach(t => {
          const match = 
            t.peaNo.toLowerCase().includes(q) ||
            t.name.toLowerCase().includes(q) ||
            String(t.kva).includes(q) ||
            (t.notes && t.notes.toLowerCase().includes(q)) ||
            (t.poleNo && t.poleNo.toLowerCase().includes(q));
          if (match) {
            results.push({
              type: 'transformer',
              transformer: t,
              sheetId: s.id,
              sheetName: `${s.sheetNo || ''} ${s.title || ''}`.trim(),
              isCurrentSheet: false
            });
          }
        });
      }
    });

    return results.slice(0, 20); // Top 20 results
  }, [searchQuery, sheets, activeSheetId]);

  const handleResultClick = (item: {
    type: 'transformer' | 'landmark';
    transformer?: Transformer;
    annotation?: AnnotationLabel;
    sheetId: string;
    isCurrentSheet: boolean;
  }) => {
    if (item.type === 'transformer' && item.transformer) {
      if (onSelectTransformer) {
        onSelectTransformer(item.transformer, item.sheetId);
      } else if (!item.isCurrentSheet && onSelectSheet) {
        onSelectSheet(item.sheetId);
      }
    } else if (item.type === 'landmark' && item.annotation) {
      if (onSelectAnnotation) {
        onSelectAnnotation(item.annotation, item.sheetId);
      } else if (!item.isCurrentSheet && onSelectSheet) {
        onSelectSheet(item.sheetId);
      }
    }
    setIsSearchFocused(false);
    setIsMobileSearchOpen(false);
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-30 shadow-xs">
      {/* 1. Brand Title: ผังหม้อแปลงจำหน่าย กฟส.ฝาง */}
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg ${
          isReadOnly 
            ? 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-blue-600' 
            : 'bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600'
        } flex items-center justify-center text-white shadow-sm shrink-0`}>
          {isReadOnly ? <Eye className="w-4 h-4 fill-white/20 text-white" /> : <Zap className="w-4 h-4 fill-white" />}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1 className="font-extrabold text-xs sm:text-sm md:text-base text-slate-900 dark:text-white leading-tight tracking-tight whitespace-nowrap">
              ผังหม้อแปลงจำหน่าย กฟส.ฝาง
            </h1>
            {isReadOnly ? (
              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 rounded flex items-center gap-0.5 shrink-0">
                <Eye className="w-2.5 h-2.5" />
                <span>แสดงอย่างเดียว</span>
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              หน้า {sheetNo} {sheetTitle}
            </span>
            {!isReadOnly && onOpenEditSheetModal && (
              <button
                type="button"
                onClick={onOpenEditSheetModal}
                title="แก้ไขชื่อหน้าผัง / ข้อมูลสายป้อน"
                className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded p-0.5 transition-colors cursor-pointer"
              >
                <Edit3 className="w-2.5 h-2.5" />
              </button>
            )}
            <span className="hidden sm:inline">&bull; {transformerCount} เครื่อง ({totalKva.toLocaleString()} kVA)</span>
          </div>
        </div>
      </div>

      {/* 2. ช่องสำหรับ ค้นหาหม้อแปลง (Search Box for Transformers) */}
      <div 
        ref={searchContainerRef} 
        className="relative flex-1 max-w-xs sm:max-w-sm md:max-w-md min-w-[140px] order-last sm:order-none w-full sm:w-auto mt-1 sm:mt-0"
      >
        <div className="relative flex items-center">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400 pointer-events-none flex items-center">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onChange={e => {
              onSearchChange(e.target.value);
              setIsSearchFocused(true);
            }}
            placeholder="ค้นหาหม้อแปลง (หมายเลข PEA, ชื่อ, ขนาด kVA)..."
            className="w-full pl-8 pr-16 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 hover:bg-white focus:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:focus:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery ? (
              <>
                <span className="hidden md:inline-block text-[9px] px-1 py-0.2 font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 rounded font-mono">
                  {searchResults.length}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange('');
                    searchInputRef.current?.focus();
                  }}
                  title="ล้างคำค้นหา"
                  className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <kbd className="hidden lg:inline-block text-[9px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1 py-0.2 rounded border border-slate-300 dark:border-slate-600">
                Ctrl+K
              </kbd>
            )}
          </div>
        </div>

        {/* Autocomplete / Search Results Popover */}
        {isSearchFocused && searchQuery.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-80 overflow-y-auto z-50 py-1.5 divide-y divide-slate-100 dark:divide-slate-700/60">
            <div className="px-3 py-1 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span>ผลการค้นหา ({searchResults.length} รายการ)</span>
              <span className="text-[10px] text-slate-400">คลิกเพื่อซูมไปยังหม้อแปลง</span>
            </div>

            {searchResults.length === 0 ? (
              <div className="px-4 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                ไม่พบหม้อแปลงที่ตรงกับ &ldquo;<span className="font-semibold text-slate-700 dark:text-slate-200">{searchQuery}</span>&rdquo;
              </div>
            ) : (
              <div className="py-1">
                {searchResults.map((item, idx) => {
                  if (item.type === 'landmark' && item.annotation) {
                    const ann = item.annotation;
                    const landmarkIcons: Record<string, string> = {
                      school: '🏫',
                      temple: '🛕',
                      hospital: '🏥',
                      government: '🏛️',
                      makro: '🔴',
                      lotus: '🟢',
                      seven_eleven: '🏪',
                      road: '🛣️',
                      location: '📍'
                    };
                    const icon = landmarkIcons[ann.type || ''] || '📍';
                    return (
                      <button
                        key={`lm-${item.sheetId}-${ann.id}-${idx}`}
                        type="button"
                        onClick={() => handleResultClick(item)}
                        className="w-full px-3 py-2 text-left hover:bg-amber-50 dark:hover:bg-slate-700/60 transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0 text-sm">
                            {icon}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">
                                {ann.text}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <span className="font-medium text-amber-600 dark:text-amber-400">
                                สถานที่สำคัญบนผัง
                              </span>
                              <span>&bull;</span>
                              <span>{ann.orientation === 'vertical' ? 'แนวตั้ง' : 'แนวนอน'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 text-right">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            item.isCurrentSheet
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {item.isCurrentSheet ? 'หน้านี้' : item.sheetName}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    );
                  }

                  if (!item.transformer) return null;
                  const t = item.transformer;
                  return (
                    <button
                      key={`tf-${item.sheetId}-${t.id}-${idx}`}
                      type="button"
                      onClick={() => handleResultClick(item)}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-slate-700/60 transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 text-[10px] font-bold ${
                          t.type === 'private'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                        }`}>
                          ▲
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              {t.peaNo}
                            </span>
                            <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
                              {t.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className={`font-medium ${t.type === 'private' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}`}>
                              {t.kva} kVA ({t.phase === '2x1P' ? '2x1Ø' : t.phase === '1P' ? '1Ø' : t.phase === 'AC' ? 'AC' : '3Ø'})
                            </span>
                            <span>&bull;</span>
                            <span>{t.type === 'private' ? 'ผู้ใช้ไฟ (เฉพาะราย)' : 'กฟภ. (จำหน่ายทั่วไป)'}</span>
                            {t.feeder && (
                              <>
                                <span>&bull;</span>
                                <span className="truncate">{t.feeder}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 text-right">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          item.isCurrentSheet
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {item.isCurrentSheet ? 'หน้านี้' : item.sheetName}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. View Switcher Tabs */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
        <button
          id="tab-view-canvas"
          onClick={() => onSelectView('canvas')}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
            currentView === 'canvas'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Map className="w-3 h-3" />
          <span>ผัง SLD</span>
        </button>

        <button
          id="tab-view-table"
          onClick={() => onSelectView('table')}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
            currentView === 'table'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Table className="w-3 h-3" />
          <span>ตาราง</span>
        </button>

        <button
          id="tab-view-stats"
          onClick={() => onSelectView('stats')}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
            currentView === 'stats'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-3 h-3" />
          <span>สรุปโหลด</span>
        </button>
      </div>

      {/* 4. Right Controls */}
      <div className="flex items-center gap-1.5">
        {/* Drag/Lock toggle for Canvas (Editor only) */}
        {!isReadOnly && currentView === 'canvas' && (
          <button
            onClick={onToggleDraggable}
            title={isDraggable ? 'ปิดการลากย้าย (Lock Layout)' : 'เปิดการลากย้าย (Unlock Drag)'}
            className={`p-1.5 rounded-lg text-xs flex items-center gap-1 font-medium transition-colors cursor-pointer ${
              isDraggable
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isDraggable ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span className="hidden xl:inline text-xs">{isDraggable ? 'ปลดล็อค' : 'ล็อคผัง'}</span>
          </button>
        )}

        {/* Theme Blueprint Toggle */}
        <button
          onClick={onThemeToggle}
          title={`เปลี่ยนธีมแสดงผล (ปัจจุบัน: ${theme === 'blueprint' ? 'พิมพ์เขียว' : theme === 'white' ? 'ขาววิศวกรรม' : 'ดาร์ก'})`}
          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {theme === 'blueprint' ? (
            <span className="text-[10px] font-bold text-sky-500 px-1 font-mono">BLUEPRINT</span>
          ) : theme === 'dark' ? (
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-500" />
          )}
        </button>

        {/* Share Button (Always visible) */}
        <button
          id="btn-share-modal"
          onClick={onOpenShareModal}
          title="แชร์ลิงก์ดูอย่างเดียว (Share View-Only Link)"
          className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all border border-blue-200 dark:border-blue-800/80 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 shadow-xs cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="hidden sm:inline">แชร์</span>
        </button>

        {/* Cloud Database Button (Editor only) */}
        {!isReadOnly && (
          <div className="flex items-center gap-0.5">
            <button
              id="btn-google-sheets"
              onClick={onOpenGoogleSheetsModal}
              title="จัดการฐานข้อมูล Cloud Database (Firebase Firestore)"
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all border cursor-pointer ${
                sheetConfig.syncStatus === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">Cloud Database</span>
              {sheetConfig.syncStatus === 'success' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </button>
          </div>
        )}

        {/* Print / Export Button */}
        <button
          onClick={onPrintDiagram}
          title="พิมพ์หรือบันทึกภาพผัง (Print / Export)"
          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>

        {/* Login Button when not authenticated */}
        {!currentUser && onSignIn && (
          <button
            onClick={onSignIn}
            title="เข้าสู่ระบบสำหรับเจ้าหน้าที่ เพื่อแก้ไขผังวงจรและบันทึกข้อมูล"
            className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-xs cursor-pointer active:scale-95"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">เข้าสู่ระบบเพื่อแก้ไข</span>
            <span className="sm:hidden">เข้าสู่ระบบ</span>
          </button>
        )}

        {/* User Profile & Sign Out Button */}
        {currentUser && (
          <div className="relative group">
            <button
              id="btn-user-profile"
              onClick={onSignOut}
              title={`เข้าสู่ระบบโดย: ${currentUser.email || currentUser.displayName || 'ผู้ใช้งาน'} (คลิกเพื่อออกจากระบบ)`}
              className="px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/40 text-slate-700 hover:text-red-600 dark:text-slate-200 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700/80 hover:border-red-300 dark:hover:border-red-800 cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="hidden xl:inline max-w-[120px] truncate text-[11px]">
                {currentUser.displayName || currentUser.email?.split('@')[0] || 'ผู้ใช้งาน'}
              </span>
              <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500 transition-colors shrink-0" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
