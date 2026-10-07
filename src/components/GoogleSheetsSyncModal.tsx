import React, { useState, useMemo } from 'react';
import { Transformer, GoogleSheetConfig, DiagramSheet } from '../types';
import { 
  downloadCsvFile, 
  parseCsvToTransformers
} from '../services/googleSheetsService';
import {
  saveSheetsToCloudFirestore,
  fetchSheetsFromCloudFirestore
} from '../services/firebaseDbService';
import { 
  X, 
  CloudUpload, 
  CloudDownload, 
  Download, 
  Upload, 
  AlertCircle,
  Database,
  ShieldCheck,
  Trash2,
  Users
} from 'lucide-react';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  transformers: Transformer[];
  config: GoogleSheetConfig;
  allSheets?: DiagramSheet[];
  activeSheetId?: string;
  cloudUser?: { uid: string; email?: string | null; displayName?: string | null } | null;
  isCloudAutoSync?: boolean;
  onToggleCloudAutoSync?: (enabled: boolean) => void;
  onClose: () => void;
  onUpdateConfig: (newConfig: GoogleSheetConfig) => void;
  onUpdateTransformers: (newTransformers: Transformer[]) => void;
  onUpdateAllSheetsTransformers?: (sheets: DiagramSheet[]) => void;
  onClearAllTransformers?: () => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  transformers,
  config,
  allSheets = [],
  isCloudAutoSync = true,
  onToggleCloudAutoSync,
  onClose,
  onUpdateConfig,
  onUpdateTransformers,
  onUpdateAllSheetsTransformers,
  onClearAllTransformers
}) => {
  const [activeTab, setActiveTab] = useState<'cloud' | 'csv'>('cloud');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const allSheetsTransformers = useMemo(() => {
    if (!allSheets || allSheets.length === 0) return transformers;
    const list: Transformer[] = [];
    allSheets.forEach(s => {
      const sheetNameTag = s.title ? `${s.title} ${s.sheetNo || ''}`.trim() : (s.sheetNo || 'หน้าผัง');
      (s.transformers || []).forEach(tr => {
        list.push({
          ...tr,
          feeder: tr.feeder || s.feederCode || sheetNameTag
        });
      });
    });
    return list;
  }, [allSheets, transformers]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCsvToTransformers(text);
        if (parsed.length > 0) {
          onUpdateTransformers(parsed);
          setStatusMessage({ type: 'success', text: `นำเข้าข้อมูลสำเร็จ ${parsed.length} รายการจากไฟล์ ${file.name}` });
        } else {
          setStatusMessage({ type: 'error', text: 'ไม่พบข้อมูลที่ถูกต้องในไฟล์ CSV' });
        }
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการอ่านไฟล์ CSV' });
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // --- Shared Cloud Firestore Database Handlers (No Login Required) ---
  const handleSaveToCloudDb = async () => {
    setIsLoading(true);
    setStatusMessage({ type: 'info', text: 'กำลังบันทึกข้อมูลผังหม้อแปลง เส้นสายป้อน และสวิตช์ทั้งหมดขึ้นฐานข้อมูลกลาง (Cloud Database)...' });
    try {
      const count = await saveSheetsToCloudFirestore(allSheets);
      const now = new Date().toLocaleTimeString('th-TH');
      onUpdateConfig({
        ...config,
        lastSyncedAt: now,
        syncStatus: 'success'
      });
      setStatusMessage({
        type: 'success',
        text: `บันทึกผังวงจรทั้งหมด ${count} หน้า (รวมหม้อแปลง ${allSheetsTransformers.length} ลูก + เส้นวงจร + สวิตช์) ลง Cloud Database กลางสำเร็จ! ทุกคนที่เข้าเว็บจะเห็นข้อมูลชุดนี้ทันที (${now})`
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'เกิดข้อผิดพลาดในการบันทึกขึ้น Cloud Database' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadFromCloudDb = async () => {
    setIsLoading(true);
    setStatusMessage({ type: 'info', text: 'กำลังดึงข้อมูลผังวงจรล่าสุดจากฐานข้อมูลกลาง (Cloud Database)...' });
    try {
      const loadedSheets = await fetchSheetsFromCloudFirestore();
      if (loadedSheets.length === 0) {
        setStatusMessage({
          type: 'info',
          text: 'ยังไม่มีข้อมูลผังที่บันทึกไว้ใน Cloud Database (กดปุ่ม "บันทึกขึ้น Cloud Database" เพื่อบันทึกผังปัจจุบันได้เลย)'
        });
      } else {
        if (onUpdateAllSheetsTransformers) {
          onUpdateAllSheetsTransformers(loadedSheets);
        } else if (loadedSheets[0]?.transformers) {
          onUpdateTransformers(loadedSheets[0].transformers);
        }
        const totalTr = loadedSheets.reduce((sum, s) => sum + (s.transformers?.length || 0), 0);
        const now = new Date().toLocaleTimeString('th-TH');
        onUpdateConfig({
          ...config,
          lastSyncedAt: now,
          syncStatus: 'success'
        });
        setStatusMessage({
          type: 'success',
          text: `ดึงข้อมูลจาก Cloud Database สำเร็จ! โหลดผังจำนวน ${loadedSheets.length} หน้า (หม้อแปลงรวม ${totalTr} ลูก) เรียบร้อยแล้ว (${now})`
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลจาก Cloud Database' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAllTransformers = async () => {
    if (!confirm('ยืนยันการลบข้อมูลหม้อแปลงทั้งหมดออกจากทุกหน้าผัง และล้างในฐานข้อมูลกลาง (Cloud Database) หรือไม่?')) {
      return;
    }

    setIsLoading(true);
    try {
      const clearedSheets = allSheets.map(s => ({
        ...s,
        transformers: [],
        updatedAt: new Date().toISOString()
      }));

      if (onClearAllTransformers) {
        onClearAllTransformers();
      } else if (onUpdateAllSheetsTransformers) {
        onUpdateAllSheetsTransformers(clearedSheets);
      } else {
        onUpdateTransformers([]);
      }

      await saveSheetsToCloudFirestore(clearedSheets);

      const now = new Date().toLocaleTimeString('th-TH');
      onUpdateConfig({
        ...config,
        lastSyncedAt: now,
        syncStatus: 'success'
      });

      setStatusMessage({
        type: 'success',
        text: `ลบข้อมูลหม้อแปลงทั้งหมดออกจากทุกหน้าผังและฐานข้อมูล Cloud เรียบร้อยแล้ว (เหลือ 0 ลูก) เวลา ${now}`
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'เกิดข้อผิดพลาดในการลบข้อมูลหม้อแปลงทั้งหมด'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>ระบบฐานข้อมูลกลาง Cloud Database</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 rounded-full">
                  ไม่ต้อง Login
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ทุกคนที่เปิดเว็บจะเชื่อมต่อฐานข้อมูลกลางชุดเดียวกันโดยอัตโนมัติ (ไม่ต้องกดเข้าสู่ระบบ)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('cloud')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
              activeTab === 'cloud'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>ฐานข้อมูลกลาง (Cloud Firestore)</span>
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
              activeTab === 'csv'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>นำเข้า / ส่งออกไฟล์ CSV</span>
          </button>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-center justify-between gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : statusMessage.type === 'error'
              ? 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800'
              : 'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
          }`}>
            <div className="flex items-center gap-2 flex-1">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{statusMessage.text}</span>
            </div>
            {statusMessage.type === 'success' && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shrink-0 transition-colors cursor-pointer shadow-xs"
              >
                ดูในผังทันที
              </button>
            )}
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 0: CLOUD FIRESTORE DATABASE */}
          {activeTab === 'cloud' && (
            <div className="space-y-4">
              {/* Shared Connection Status Card */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/40 dark:to-blue-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-600 text-white">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>ฐานข้อมูลกลาง กฟส.ฝาง (Shared Cloud Database)</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>ออนไลน์พร้อมใช้งานทุกคน</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        ผู้ใช้งานคนอื่นสามารถเปิดลิงก์เว็บเพื่อดูและใช้งานผังวงจรชุดเดียวกันได้ทันทีโดย<strong>ไม่ต้องกด Login</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {onToggleCloudAutoSync && (
                  <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      บันทึกข้อมูลขึ้นฐานข้อมูลกลางอัตโนมัติเมื่อแก้ไขผัง (Auto-Save)
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleCloudAutoSync(!isCloudAutoSync)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        isCloudAutoSync
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {isCloudAutoSync ? 'เปิดใช้งานอยู่ (ON)' : 'ปิด (OFF)'}
                    </button>
                  </div>
                )}
              </div>

              {/* Cloud Database Save & Load Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleSaveToCloudDb}
                  disabled={isLoading}
                  className="p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all flex flex-col items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer"
                >
                  <div className="p-2.5 bg-blue-700/60 rounded-lg group-hover:scale-110 transition-transform">
                    <CloudUpload className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-sm">บันทึกขึ้นฐานข้อมูลกลาง (Save)</div>
                    <div className="text-[11px] text-blue-100">
                      อัปเดตทั้ง {allSheets.length} หน้าผัง ({allSheetsTransformers.length} หม้อแปลง + เส้นวงจร) ให้ทุกคนเห็นตรงกัน
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleLoadFromCloudDb}
                  disabled={isLoading}
                  className="p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all flex flex-col items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer"
                >
                  <div className="p-2.5 bg-indigo-700/60 rounded-lg group-hover:scale-110 transition-transform">
                    <CloudDownload className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-sm">ดึงข้อมูลล่าสุดจากฐานข้อมูลกลาง</div>
                    <div className="text-[11px] text-indigo-100">
                      โหลดผังหม้อแปลงและเส้นวงจรล่าสุดจาก Cloud Firestore
                    </div>
                  </div>
                </button>
              </div>

              {/* Clear All Transformers Card */}
              <div className="p-4 bg-red-50/70 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800/70 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-red-900 dark:text-red-200 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>ล้างข้อมูลหม้อแปลงทั้งหมด (ปัจจุบันมี {allSheetsTransformers.length} ลูก)</span>
                  </div>
                  <p className="text-[11px] text-red-700 dark:text-red-400">
                    ลบหม้อแปลงทั้งหมดออกจากทุกหน้าผัง (คงเส้นสายป้อน สวิตช์ และป้ายชื่อไว้)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteAllTransformers}
                  disabled={isLoading || allSheetsTransformers.length === 0}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  ลบหม้อแปลงทั้งหมด
                </button>
              </div>

              {config.lastSyncedAt && (
                <div className="text-center text-xs text-slate-500 pt-1">
                  ซิงค์ฐานข้อมูลล่าสุดเมื่อ: <span className="font-semibold text-slate-700 dark:text-slate-300">{config.lastSyncedAt}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: CSV IMPORT/EXPORT */}
          {activeTab === 'csv' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Export Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                      <Download className="w-4 h-4 text-emerald-600" />
                      <span>ส่งออกไฟล์ CSV</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">
                      ดาวน์โหลดไฟล์ CSV รองรับภาษาไทย (UTF-8 BOM) สำหรับสำรองข้อมูลหม้อแปลงในหน้าปัจจุบัน
                    </p>
                  </div>
                  <button
                    onClick={() => downloadCsvFile(transformers, `ผังหม้อแปลง_${new Date().toISOString().slice(0, 10)}.csv`)}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>ดาวน์โหลด CSV ({transformers.length} รายการ)</span>
                  </button>
                </div>

                {/* Import Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-blue-600" />
                      <span>นำเข้าไฟล์ CSV</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">
                      อัปโหลดไฟล์ CSV ที่มีข้อมูลหม้อแปลงเพื่ออัปเดตเข้าสู่ผังวงจรหน้าปัจจุบันทันที
                    </p>
                  </div>
                  <label className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition-colors flex items-center justify-center gap-2 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>เลือกไฟล์ CSV เพื่อนำเข้า</span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end items-center">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
