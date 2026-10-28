import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  Database, 
  Upload, 
  Sparkles, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  FileSpreadsheet,
  Clock,
  HardDrive,
  Trash2
} from 'lucide-react';
import { DiagramSheet, Transformer } from '../types';
import { FANG_PRESET_SHEETS, scanLocalStorageForBackups } from '../data/fangSubstationPresetData';
import { parseCsvToTransformers } from '../services/googleSheetsService';
import { saveSheetsToCloudFirestore } from '../services/firebaseDbService';

interface DataRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSheets: DiagramSheet[];
  onRestoreSheets: (restoredSheets: DiagramSheet[]) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const DataRecoveryModal: React.FC<DataRecoveryModalProps> = ({
  isOpen,
  onClose,
  currentSheets,
  onRestoreSheets,
  showToast
}) => {
  const [localBackups, setLocalBackups] = useState<{ key: string; sheetCount: number; transformerCount: number; data: any }[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsScanning(true);
      const found = scanLocalStorageForBackups();
      setLocalBackups(found);
      setIsScanning(false);
      setConfirmClearAll(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Option 1: Restore from a discovered localStorage backup key
  const handleRestoreFromKey = async (backup: { key: string; data: any; transformerCount: number }) => {
    setIsApplying(true);
    try {
      let mergedSheets: DiagramSheet[] = [];

      if (Array.isArray(backup.data) && backup.data.length > 0) {
        if (backup.data[0]?.transformers !== undefined) {
          // It's an array of DiagramSheet
          const backupSheets = backup.data as DiagramSheet[];
          // Merge with current sheets or replace if valid
          mergedSheets = currentSheets.map(cur => {
            const match = backupSheets.find(b => b.id === cur.id || b.sheetNo === cur.sheetNo || b.title === cur.title);
            if (match && match.transformers && match.transformers.length > 0) {
              return {
                ...cur,
                transformers: match.transformers,
                updatedAt: new Date().toISOString()
              };
            }
            return cur;
          });

          // Also bring in any extra sheets from backup that didn't exist
          backupSheets.forEach(b => {
            if (!mergedSheets.some(m => m.id === b.id || m.sheetNo === b.sheetNo)) {
              mergedSheets.push(b);
            }
          });
        } else if (backup.data[0]?.peaNo) {
          // It's a direct array of Transformer, apply to active/first sheet
          const tfs = backup.data as Transformer[];
          mergedSheets = currentSheets.map((s, idx) => {
            if (idx === 0) {
              return {
                ...s,
                transformers: tfs,
                updatedAt: new Date().toISOString()
              };
            }
            return s;
          });
        }
      }

      if (mergedSheets.length > 0) {
        onRestoreSheets(mergedSheets);
        try {
          await saveSheetsToCloudFirestore(mergedSheets);
        } catch {}
        showToast(`กู้คืนข้อมูลสำเร็จ ${backup.transformerCount} เครื่อง จากแคช "${backup.key}"`, 'success');
        onClose();
      } else {
        showToast('ไม่สามารถแยกโครงสร้างข้อมูลจากแคชนี้ได้', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการกู้คืน', 'error');
    } finally {
      setIsApplying(false);
    }
  };

  // Option 2: Restore Fang Substation Presets (Full 6 Sheets with 100 transformers)
  const handleRestoreFangPresets = async () => {
    setIsApplying(true);
    try {
      let totalRestored = 0;
      const matchedKeys = new Set<string>();

      // Update existing sheets
      let updatedSheets = currentSheets.map((s, idx) => {
        let matchedKey = '';

        if (FANG_PRESET_SHEETS[s.id]) {
          matchedKey = s.id;
        } else if (s.title?.includes('สวนดอก') || s.sheetNo?.includes('1') || idx === 0) {
          matchedKey = 'sheet-1';
        } else if (s.title?.includes('ป่าบง') || s.sheetNo?.includes('2') || idx === 1) {
          matchedKey = 'sheet-2';
        } else if (s.title?.includes('โป่งน้ำร้อน') || s.sheetNo?.includes('3') || idx === 2) {
          matchedKey = 'sheet-3';
        } else if (s.title?.includes('ม่อบปิ่น') || s.title?.includes('ม่อนปิ่น') || idx === 3) {
          matchedKey = 'sheet-1792469878954';
        } else if (s.title?.includes('บ้านลาน') || idx === 4) {
          matchedKey = 'sheet-1792570504182';
        } else if (s.title?.includes('ศรีดอนชัย') || idx === 5) {
          matchedKey = 'sheet-3-sridonchai';
        }

        const preset = matchedKey ? FANG_PRESET_SHEETS[matchedKey] : null;
        if (preset && preset.transformers && preset.transformers.length > 0) {
          matchedKeys.add(matchedKey);
          totalRestored += preset.transformers.length;
          return {
            ...s,
            title: preset.title || s.title,
            feederCode: preset.feederCode || s.feederCode,
            substation: preset.substation || s.substation,
            transformers: preset.transformers as Transformer[],
            updatedAt: new Date().toISOString()
          };
        }
        return s;
      });

      // If any of the 6 preset sheets wasn't present, append it so the user has the complete set of 6 sheets
      Object.entries(FANG_PRESET_SHEETS).forEach(([key, preset]) => {
        if (!matchedKeys.has(key) && preset.transformers && preset.transformers.length > 0) {
          const newSheet: DiagramSheet = {
            id: key,
            sheetNo: preset.sheetNo || `(${updatedSheets.length + 1})`,
            title: preset.title || `ไลน์ ${key}`,
            feederCode: preset.feederCode || '',
            substation: preset.substation || 'สถานีไฟฟ้าฝาง',
            description: `ผังหม้อแปลง กฟส.ฝาง ${preset.title || ''}`,
            transformers: preset.transformers as Transformer[],
            switches: [],
            feederPaths: [],
            annotations: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          updatedSheets.push(newSheet);
          totalRestored += preset.transformers.length;
        }
      });

      onRestoreSheets(updatedSheets);
      try {
        await saveSheetsToCloudFirestore(updatedSheets);
      } catch (err) {
        console.warn('Cloud save error during preset restoration:', err);
      }
      showToast(`โหลดชุดข้อมูลหม้อแปลงฉบับเต็ม กฟส.ฝาง สำเร็จ (${totalRestored} เครื่อง ครบ 6 ผัง)`, 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการกู้คืนข้อมูลมาตรฐาน', 'error');
    } finally {
      setIsApplying(false);
    }
  };

  // Option 3: Upload CSV file to restore
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCsvToTransformers(text);
        if (parsed.length > 0) {
          // Distribute or assign to current sheet
          const updatedSheets = currentSheets.map((s, idx) => {
            if (idx === 0) {
              return {
                ...s,
                transformers: parsed,
                updatedAt: new Date().toISOString()
              };
            }
            return s;
          });

          onRestoreSheets(updatedSheets);
          try {
            await saveSheetsToCloudFirestore(updatedSheets);
          } catch {}
          showToast(`นำเข้าหม้อแปลงสำเร็จ ${parsed.length} รายการจากไฟล์ ${file.name}`, 'success');
          onClose();
        } else {
          showToast('ไม่พบข้อมูลหม้อแปลงในไฟล์ CSV', 'error');
        }
      } catch {
        showToast('เกิดข้อผิดพลาดในการอ่านไฟล์ CSV', 'error');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // Option 4: Clear all transformers across all sheets
  const handleExecuteClearAll = async () => {
    setIsApplying(true);
    try {
      const cleared = currentSheets.map(s => ({
        ...s,
        transformers: [],
        updatedAt: new Date().toISOString()
      }));
      onRestoreSheets(cleared);
      try {
        await saveSheetsToCloudFirestore(cleared);
      } catch (err) {
        console.warn('Cloud save error during clear:', err);
      }
      showToast('ลบหม้อแปลงทั้งหมดเรียบร้อยแล้ว (0 เครื่อง)', 'info');
      setConfirmClearAll(false);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการลบหม้อแปลง', 'error');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-amber-500/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-sm">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>ศูนย์กู้คืนข้อมูลหม้อแปลง (Data Recovery Center)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                เลือกวิธีกู้คืนข้อมูลหม้อแปลงที่สูญหายกลับสู่ผังวงจรทันที
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Explanation Alert */}
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 text-slate-700 dark:text-slate-300 space-y-1">
            <div className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-blue-600" />
              <span>ไม่ต้องกังวลครับ โครงสร้างผังและข้อมูลยังสามารถกู้คืนได้ตามตัวเลือกด้านล่าง:</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-5">
              ระบบมีทั้งระบบสแกนข้อมูลสำรองในแคชเครื่อง (LocalStorage), นำเข้าจากไฟล์ CSV/Excel, หรือกู้คืนชุดข้อมูลมาตรฐาน กฟส.ฝาง (15-30+ เครื่อง)
            </p>
          </div>

          {/* Option 1: Discovered LocalStorage Backups */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-500" />
                <span>1. ข้อมูลสำรองที่ตรวจพบในเบราว์เซอร์เครื่องนี้ ({localBackups.length} รายการ)</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const found = scanLocalStorageForBackups();
                  setLocalBackups(found);
                  showToast(`สแกนพบแคช ${found.length} จุด`, 'info');
                }}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                สแกนใหม่
              </button>
            </h4>

            {localBackups.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400">
                ไม่พบแคชเก่าที่เก็บหม้อแปลงไว้ใน LocalStorage ปัจจุบัน (สามารถเลือกข้อ 2 หรือ 3 ด้านล่างได้เลยครับ)
              </div>
            ) : (
              <div className="space-y-2">
                {localBackups.map((bk, i) => (
                  <div
                    key={`bk-${i}`}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-3 hover:border-emerald-500/50 transition-all"
                  >
                    <div>
                      <div className="font-mono font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{bk.key}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          {bk.transformerCount} หม้อแปลง
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        ครอบคลุม {bk.sheetCount} หน้าผังวงจร
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isApplying}
                      onClick={() => handleRestoreFromKey(bk)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>กู้คืนชุดนี้</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Option 2: Fang Substation Presets (Recommended) */}
          <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/20 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>2. กู้คืนชุดข้อมูลหม้อแปลงฉบับเต็ม กฟส.ฝาง (100 เครื่อง ครบ 6 ผัง)</span>
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                  นำเข้าหม้อแปลงสมบูรณ์ 100 เครื่อง ครบทุกสายแยกและจุดสำคัญ (รร.ฝางชนูปถัมภ์, รพ.ฝาง, วัดสวนดอก, แมคโคร, โลตัส, ที่ว่าการอำเภอ, ธนาคาร, ตลาด, ปตท., สายแยกต้นหนุน 1-3, หนองโฮ้ง, สันทราย, ห้วยบอน, ภูมณี, สันลมจอย ฯลฯ)
                </p>
              </div>

              <button
                type="button"
                disabled={isApplying}
                onClick={handleRestoreFangPresets}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 active:scale-95 text-white shadow-sm cursor-pointer shrink-0 flex items-center gap-1.5 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>โหลดข้อมูลเต็ม 100 เครื่อง</span>
              </button>
            </div>

            {/* Breakdown Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
              <div className="px-2 py-1 rounded-md bg-white/70 dark:bg-slate-800/70 border border-amber-200/50 dark:border-amber-900/30 flex justify-between items-center text-[10px]">
                <span className="text-slate-600 dark:text-slate-300 font-medium">ผัง (1) ไลน์สวนดอก</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">48 เครื่อง</span>
              </div>
              <div className="px-2 py-1 rounded-md bg-white/70 dark:bg-slate-800/70 border border-amber-200/50 dark:border-amber-900/30 flex justify-between items-center text-[10px]">
                <span className="text-slate-600 dark:text-slate-300 font-medium">ผัง (2) ไลน์ป่าบง</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">14 เครื่อง</span>
              </div>
              <div className="px-2 py-1 rounded-md bg-white/70 dark:bg-slate-800/70 border border-amber-200/50 dark:border-amber-900/30 flex justify-between items-center text-[10px]">
                <span className="text-slate-600 dark:text-slate-300 font-medium">ผัง (3) ไลน์โป่งน้ำร้อน</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">12 เครื่อง</span>
              </div>
              <div className="px-2 py-1 rounded-md bg-white/70 dark:bg-slate-800/70 border border-amber-200/50 dark:border-amber-900/30 flex justify-between items-center text-[10px]">
                <span className="text-slate-600 dark:text-slate-300 font-medium">ผัง (4) ไลน์ม่อนปิ่น</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">10 เครื่อง</span>
              </div>
              <div className="px-2 py-1 rounded-md bg-white/70 dark:bg-slate-800/70 border border-amber-200/50 dark:border-amber-900/30 flex justify-between items-center text-[10px]">
                <span className="text-slate-600 dark:text-slate-300 font-medium">ผัง (5) ไลน์บ้านลาน</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">8 เครื่อง</span>
              </div>
              <div className="px-2 py-1 rounded-md bg-white/70 dark:bg-slate-800/70 border border-amber-200/50 dark:border-amber-900/30 flex justify-between items-center text-[10px]">
                <span className="text-slate-600 dark:text-slate-300 font-medium">ผัง (6) ไลน์ศรีดอนชัย</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">8 เครื่อง</span>
              </div>
            </div>
          </div>

          {/* Option 3: CSV Import */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-blue-500" />
              <span>3. นำเข้าข้อมูลจากไฟล์ CSV หรือ Excel</span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              หากมีไฟล์ตารางหม้อแปลง (PEA No., ชื่อ, kVA, พิกัด) สามารถเลือกไฟล์เพื่อนำเข้าทันที
            </p>
            <div>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer border border-slate-300 dark:border-slate-700 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>เลือกไฟล์ CSV / Excel เพื่อนำเข้า</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleCsvUpload}
                />
              </label>
            </div>
          </div>

          {/* Option 4: Clear All Transformers */}
          <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>4. ลบหม้อแปลงออกทั้งหมด (Clear All Transformers)</span>
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                  ลบหม้อแปลงทุกเครื่องออกจากผังทุกหน้าให้เหลือ 0 เครื่อง โดยยังคงเส้นสายส่งและสวิตช์ไว้ครบถ้วน
                </p>
              </div>

              {!confirmClearAll ? (
                <button
                  type="button"
                  disabled={isApplying}
                  onClick={() => setConfirmClearAll(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-sm cursor-pointer shrink-0 flex items-center gap-1.5 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>ลบหม้อแปลงทั้งหมด</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-150">
                  <button
                    type="button"
                    disabled={isApplying}
                    onClick={handleExecuteClearAll}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-700 hover:bg-red-800 active:scale-95 text-white shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>ยืนยันลบทั้งหมด (0 เครื่อง)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>

      </div>
    </div>
  );
};
