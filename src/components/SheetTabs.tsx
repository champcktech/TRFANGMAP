import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DiagramSheet, countTransformerUnits } from '../types';
import { 
  Plus, 
  Layers, 
  MoreVertical, 
  Edit3, 
  Copy, 
  Trash2, 
  ChevronRight, 
  ChevronLeft,
  Eye
} from 'lucide-react';

interface SheetTabsProps {
  sheets: DiagramSheet[];
  activeSheetId: string;
  isReadOnly?: boolean;
  canDeleteSheet?: boolean;
  onSelectSheet: (id: string) => void;
  onOpenNewSheetModal: () => void;
  onOpenEditSheetModal: (sheet: DiagramSheet) => void;
  onDuplicateSheet: (sheetId: string) => void;
  onDeleteSheet: (sheetId: string) => void;
}

/**
 * ตัดทอนชื่อแท็บให้กระชับ ไม่ยาวล้น เช่น "กฟส.ฝาง (ไลน์สวนดอก)" -> "ไลน์สวนดอก"
 * โดยยังคงเก็บชื่อเต็มไว้แสดงใน Tooltip และตอนแก้ไข
 */
function formatTabTitle(title?: string): string {
  if (!title) return '';
  const trimmed = title.trim();
  // ถ้ามีวงเล็บไลน์ เช่น "กฟส.ฝาง (ไลน์สวนดอก)" ให้ดึงเฉพาะเนื้อหาในวงเล็บ
  const matchFeeder = trimmed.match(/\((ไลน์[^)]+)\)/);
  if (matchFeeder) return matchFeeder[1];
  // ถ้ามีวงเล็บทั่วไปและข้อความยาว เช่น "กฟส.ฝาง (สวนดอก)" ให้ดึงในวงเล็บ
  const matchParen = trimmed.match(/\(([^)]+)\)/);
  if (matchParen && trimmed.length > 14) return matchParen[1];
  // ลบคำนำหน้า กฟส.ฝาง ถ้ามี
  const cleaned = trimmed.replace(/^กฟส\.[^\s]+\s*/, '');
  return cleaned || trimmed;
}

export const SheetTabs: React.FC<SheetTabsProps> = ({
  sheets = [],
  activeSheetId,
  isReadOnly = false,
  canDeleteSheet = true,
  onSelectSheet,
  onOpenNewSheetModal,
  onOpenEditSheetModal,
  onDuplicateSheet,
  onDeleteSheet
}) => {
  const [menuOpenSheetId, setMenuOpenSheetId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activeIndex = sheets.findIndex(s => s.id === activeSheetId);

  const handlePrevSheet = () => {
    if (activeIndex > 0) {
      onSelectSheet(sheets[activeIndex - 1].id);
    }
  };

  const handleNextSheet = () => {
    if (activeIndex < sheets.length - 1) {
      onSelectSheet(sheets[activeIndex + 1].id);
    }
  };

  // หมุนล้อเม้าส์เพื่อเลื่อนแท็บในแนวนอน
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current && e.deltaY !== 0) {
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  // เลื่อนโฟกัสให้แท็บที่เลือกแสดงตรงกลางเมื่อเปลี่ยนหน้า
  useEffect(() => {
    if (scrollContainerRef.current && activeSheetId) {
      const activeEl = scrollContainerRef.current.querySelector(`#btn-sheet-tab-${activeSheetId}`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }, [activeSheetId]);

  // ปิดเมนูป๊อปอัปเมื่อคลิกนอกแท็บ
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.sheet-context-menu-wrapper')) {
        setMenuOpenSheetId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-slate-100/95 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700/80 px-2 py-1 flex items-center gap-2 text-xs select-none min-h-[36px] relative z-30">
      {/* Left Dock: Sheet Label, Prev/Next Arrows & Add Sheet Button */}
      <div className="flex items-center gap-1.5 shrink-0 pr-2 border-r border-slate-300 dark:border-slate-700">
        <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-bold">
          <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="text-[11px] font-semibold whitespace-nowrap">หน้าผัง ({sheets.length}):</span>
        </div>

        {/* Prev / Next Page Quick Buttons */}
        {sheets.length > 1 && (
          <div className="flex items-center gap-0.5">
            <button
              onClick={handlePrevSheet}
              disabled={activeIndex <= 0}
              title="สลับไปหน้าก่อนหน้า"
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono font-bold text-slate-500 whitespace-nowrap">
              {activeIndex + 1}/{sheets.length}
            </span>
            <button
              onClick={handleNextSheet}
              disabled={activeIndex >= sheets.length - 1}
              title="สลับไปหน้าถัดไป"
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Add New Sheet Quick Button (Docked on left so it never overflows or gets pushed off) */}
        {!isReadOnly && (
          <button
            onClick={onOpenNewSheetModal}
            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-md font-bold flex items-center gap-1 transition-all shadow-2xs shrink-0 cursor-pointer text-[10.5px]"
            title="เพิ่มหน้าผังวงจรใหม่"
          >
            <Plus className="w-3 h-3" />
            <span className="hidden sm:inline">เพิ่มหน้า</span>
          </button>
        )}
      </div>

      {/* Center: Scrollable Tabs Container (Clean, compact tabs without overflow) */}
      <div 
        ref={scrollContainerRef}
        onWheel={handleWheel}
        className="flex items-center gap-1.5 overflow-x-auto min-w-0 flex-1 py-0.5 scrollbar-none"
      >
        {sheets.map((sheet, index) => {
          const isActive = sheet.id === activeSheetId;
          const tfCount = countTransformerUnits(sheet.transformers);
          const isMenuOpen = menuOpenSheetId === sheet.id;
          const cleanNo = (sheet.sheetNo || `${index + 1}`).replace(/[()]/g, '').trim();
          const displayTitle = formatTabTitle(sheet.title) || `ผังหน้า ${cleanNo}`;

          return (
            <div key={sheet.id} className="relative group shrink-0 sheet-context-menu-wrapper">
              <button
                type="button"
                id={`btn-sheet-tab-${sheet.id}`}
                onClick={() => {
                  onSelectSheet(sheet.id);
                  setMenuOpenSheetId(null);
                }}
                className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer text-xs ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-300 dark:border-slate-700 font-bold ring-1 ring-blue-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 bg-slate-200/40 dark:bg-slate-800/40 border border-transparent'
                }`}
                title={`หน้า ${sheet.sheetNo || `(${index + 1})`} ${sheet.title} (${tfCount} เครื่อง)`}
              >
                {/* Number Badge */}
                <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                  isActive 
                    ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300' 
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {cleanNo}
                </span>

                {/* Short Title (Compact Feeder Name) */}
                <span className="whitespace-nowrap text-xs">{displayTitle}</span>

                {/* Transformer Count Pill */}
                <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-mono font-medium shrink-0 ${
                  isActive 
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800' 
                    : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-500'
                }`}>
                  {tfCount} เครื่อง
                </span>

                {/* Edit Icon on active tab */}
                {!isReadOnly && isActive && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenEditSheetModal(sheet);
                    }}
                    className="p-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 transition-colors cursor-pointer shrink-0"
                    title="คลิกเพื่อเปลี่ยนชื่อหน้าผัง / ข้อมูลสายป้อน"
                  >
                    <Edit3 className="w-3 h-3" />
                  </span>
                )}

                {/* Context Menu Dot Button (Editor only) */}
                {!isReadOnly && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenSheetId(isMenuOpen ? null : sheet.id);
                    }}
                    className={`p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer shrink-0 ${
                      isActive ? 'opacity-70 hover:opacity-100' : 'opacity-0 group-hover:opacity-70 hover:!opacity-100'
                    }`}
                    title="เมนูจัดการหน้านี้ (เปลี่ยนชื่อ / คัดลอก / ลบ)"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </span>
                )}
              </button>

              {/* Sheet Context Menu (Editor only) */}
              {!isReadOnly && isMenuOpen && (
                <div 
                  className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      onOpenEditSheetModal(sheet);
                      setMenuOpenSheetId(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                    <span>เปลี่ยนชื่อ / ข้อมูลหน้า</span>
                  </button>

                  <button
                    onClick={() => {
                      onDuplicateSheet(sheet.id);
                      setMenuOpenSheetId(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-500" />
                    <span>คัดลอกหน้านี้ (Duplicate)</span>
                  </button>

                  {canDeleteSheet && sheets.length > 1 && (
                    <button
                      onClick={() => {
                        onDeleteSheet(sheet.id);
                        setMenuOpenSheetId(null);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 text-red-600 dark:text-red-400 border-t border-slate-100 dark:border-slate-700 mt-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ลบหน้านี้</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Right: Read-Only Status Indicator (if applicable) */}
      {isReadOnly && (
        <div className="hidden lg:flex items-center gap-1.5 text-purple-700 dark:text-purple-300 text-[10px] font-semibold bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800 shrink-0">
          <Eye className="w-3 h-3" />
          <span>โหมดแสดงผล</span>
        </div>
      )}
    </div>
  );
};
