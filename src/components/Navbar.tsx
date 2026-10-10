import React from 'react';
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
  Edit3
} from 'lucide-react';
import { GoogleSheetConfig, DiagramSheet } from '../types';

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
  onThemeToggle,
  onToggleDraggable,
  onToggleReadOnly,
  onOpenShareModal,
  onOpenAddModal,
  onOpenGoogleSheetsModal,
  onPrintDiagram,
  onOpenEditSheetModal
}) => {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-30 shadow-xs">
      {/* Brand & Title / Sheet Selector */}
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg ${
          isReadOnly 
            ? 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-blue-600' 
            : 'bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600'
        } flex items-center justify-center text-white shadow-sm shrink-0`}>
          {isReadOnly ? <Eye className="w-3.5 h-3.5 fill-white/20 text-white" /> : <Zap className="w-3.5 h-3.5 fill-white" />}
        </div>

        <div className="min-w-0 flex items-center gap-1.5">
          {/* Direct Sheet Selector Dropdown in Navbar */}
          {sheets.length > 1 && onSelectSheet ? (
            <div className="relative flex items-center">
              <select
                value={activeSheetId}
                onChange={(e) => onSelectSheet(e.target.value)}
                className="appearance-none pl-2 pr-6 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                title="คลิกเพื่อเลือกหน้าผังวงจร"
              >
                {sheets.map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    {s.sheetNo || `(${idx + 1})`} {s.title || `ผังหน้า ${idx + 1}`} ({s.transformers?.length || 0} ลูก)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-1.5 text-slate-500 pointer-events-none" />
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight truncate">
                ผังหม้อแปลง {sheetTitle}
              </h1>
              <span className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 rounded font-mono">
                {sheetNo}
              </span>
            </div>
          )}

          {!isReadOnly && onOpenEditSheetModal && (
            <button
              type="button"
              onClick={onOpenEditSheetModal}
              title="แก้ไขชื่อหน้าผัง / ข้อมูลสายป้อน (เปลี่ยนชื่อหน้า)"
              className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}

          {isReadOnly ? (
            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 rounded flex items-center gap-0.5 shrink-0">
              <Eye className="w-2.5 h-2.5" />
              <span>แสดงอย่างเดียว</span>
            </span>
          ) : null}

          <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden lg:inline">
            &bull; {transformerCount} ลูก ({totalKva.toLocaleString()} kVA)
          </span>
        </div>
      </div>

      {/* View Switcher Tabs */}
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

      {/* Search Input */}
      <div className="relative hidden md:block w-36 lg:w-48">
        <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="ค้นหาหม้อแปลง..."
          className="w-full pl-7 pr-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
          >
            &times;
          </button>
        )}
      </div>

      {/* Right Controls */}
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
