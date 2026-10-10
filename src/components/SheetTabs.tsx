import React, { useState, useRef } from 'react';
import { DiagramSheet } from '../types';
import { 
  Plus, 
  Layers, 
  MoreVertical, 
  Edit3, 
  Copy, 
  Trash2, 
  ChevronRight, 
  ChevronLeft,
  FileText,
  Zap,
  Check,
  Eye
} from 'lucide-react';

interface SheetTabsProps {
  sheets: DiagramSheet[];
  activeSheetId: string;
  isReadOnly?: boolean;
  onSelectSheet: (id: string) => void;
  onOpenNewSheetModal: () => void;
  onOpenEditSheetModal: (sheet: DiagramSheet) => void;
  onDuplicateSheet: (sheetId: string) => void;
  onDeleteSheet: (sheetId: string) => void;
}

export const SheetTabs: React.FC<SheetTabsProps> = ({
  sheets = [],
  activeSheetId,
  isReadOnly = false,
  onSelectSheet,
  onOpenNewSheetModal,
  onOpenEditSheetModal,
  onDuplicateSheet,
  onDeleteSheet
}) => {
  const [menuOpenSheetId, setMenuOpenSheetId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activeSheet = sheets?.find(s => s.id === activeSheetId) || sheets?.[0] || { id: '', title: '', sheetNo: '' };
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

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-slate-100/95 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700/80 px-2 py-1 flex items-center justify-between gap-1.5 text-xs select-none min-h-[36px]">
      {/* Left: Sheet Label & Navigation Arrows */}
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-bold shrink-0 pr-1.5 border-r border-slate-300 dark:border-slate-700 mr-0.5">
          <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="text-[11px] font-semibold">หน้าผัง ({sheets.length}):</span>
        </div>

        {/* Prev / Next Page Quick Buttons */}
        {sheets.length > 1 && (
          <div className="flex items-center gap-0.5 shrink-0 pr-1">
            <button
              onClick={handlePrevSheet}
              disabled={activeIndex <= 0}
              title="สลับไปหน้าก่อนหน้า"
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono font-bold text-slate-500">
              {activeIndex + 1}/{sheets.length}
            </span>
            <button
              onClick={handleNextSheet}
              disabled={activeIndex >= sheets.length - 1}
              title="สลับไปหน้าถัดไป"
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Items Scrollable Container */}
        <div 
          ref={scrollContainerRef}
          className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5"
        >
          {sheets.map((sheet, index) => {
            const isActive = sheet.id === activeSheetId;
            const tfCount = sheet.transformers?.length || 0;
            const isMenuOpen = menuOpenSheetId === sheet.id;

            return (
              <div key={sheet.id} className="relative group shrink-0">
                <button
                  type="button"
                  id={`btn-sheet-tab-${sheet.id}`}
                  onClick={() => {
                    onSelectSheet(sheet.id);
                    setMenuOpenSheetId(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer text-xs ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-300 dark:border-slate-700 ring-1 ring-blue-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 bg-slate-200/40 dark:bg-slate-800/40 border border-transparent'
                  }`}
                  title={`คลิกเพื่อเปิดหน้าผัง ${sheet.sheetNo} ${sheet.title} (${tfCount} หม้อแปลง)`}
                >
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                    isActive 
                      ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300' 
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    {sheet.sheetNo || `(${index + 1})`}
                  </span>
                  <span className="truncate max-w-[140px] text-xs">{sheet.title || `ผังหน้า ${index + 1}`}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-medium ${
                    isActive 
                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800' 
                      : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-500'
                  }`}>
                    {tfCount} ลูก
                  </span>

                  {/* Quick Edit Icon on active tab */}
                  {!isReadOnly && isActive && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEditSheetModal(sheet);
                      }}
                      className="p-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 transition-colors cursor-pointer"
                      title="คลิกเพื่อเปลี่ยนชื่อหน้าผัง / ข้อมูลสายป้อน"
                    >
                      <Edit3 className="w-3 h-3" />
                    </span>
                  )}

                  {/* More Action Dot Button (Editor only) */}
                  {!isReadOnly && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenSheetId(isMenuOpen ? null : sheet.id);
                      }}
                      className={`p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer ${
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

                    {sheets.length > 1 && (
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

          {/* Add New Sheet Button (Editor only) */}
          {!isReadOnly && (
            <div className="flex items-center gap-1 shrink-0 ml-1">
              <button
                onClick={onOpenNewSheetModal}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1 transition-all shadow-xs shrink-0 cursor-pointer text-[11px]"
                title="เพิ่มหน้าผังวงจรใหม่"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มหน้าใหม่</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: Quick Active Sheet Info or Read-Only Tag */}
      <div className="hidden md:flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] shrink-0 font-medium pl-2 border-l border-slate-300 dark:border-slate-700">
        {isReadOnly ? (
          <span className="px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10px] font-semibold flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>โหมดแสดงผล (คลิกแท็บสลับดูได้ทุกหน้า)</span>
          </span>
        ) : (
          <span className="truncate max-w-[200px]">
            เปิดอยู่: <b className="text-slate-800 dark:text-slate-200 font-bold">{activeSheet?.sheetNo} {activeSheet?.title}</b>
          </span>
        )}
      </div>
    </div>
  );
};
