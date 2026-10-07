import React, { useState, useEffect } from 'react';
import { DiagramSheet } from '../types';
import { X, Layers, FileText, Check, Copy, Trash2, Plus } from 'lucide-react';

interface SheetModalProps {
  isOpen: boolean;
  sheet: DiagramSheet | null; // If null, mode is ADD
  sheetsCount: number;
  onClose: () => void;
  onSave: (sheetData: {
    sheetNo: string;
    title: string;
    feederCode?: string;
    substation?: string;
    description?: string;
    cloneFromSheetId?: string;
  }) => void;
  allSheets: DiagramSheet[];
}

export const SheetModal: React.FC<SheetModalProps> = ({
  isOpen,
  sheet,
  sheetsCount,
  onClose,
  onSave,
  allSheets
}) => {
  const [sheetNo, setSheetNo] = useState('');
  const [title, setTitle] = useState('');
  const [feederCode, setFeederCode] = useState('');
  const [substation, setSubstation] = useState('');
  const [description, setDescription] = useState('');
  const [creationMode, setCreationMode] = useState<'blank' | 'clone'>('blank');
  const [cloneFromSheetId, setCloneFromSheetId] = useState<string>('');

  const isEditing = !!sheet;

  useEffect(() => {
    if (isOpen) {
      if (sheet) {
        setSheetNo(sheet.sheetNo || '');
        setTitle(sheet.title || '');
        setFeederCode(sheet.feederCode || '');
        setSubstation(sheet.substation || 'สถานีไฟฟ้าฝาง');
        setDescription(sheet.description || '');
      } else {
        // Auto recommend next page number
        setSheetNo(`(${sheetsCount + 1})`);
        setTitle(`ไลน์ใหม่ ${sheetsCount + 1}`);
        setFeederCode(`FAA-0${(sheetsCount + 5) % 10 || 7}`);
        setSubstation('สถานีไฟฟ้าฝาง');
        setDescription('');
        setCreationMode('blank');
        if (allSheets.length > 0) {
          setCloneFromSheetId(allSheets[0].id);
        }
      }
    }
  }, [isOpen, sheet, sheetsCount, allSheets]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      sheetNo: sheetNo.trim() || `(${sheetsCount + 1})`,
      title: title.trim(),
      feederCode: feederCode.trim() || undefined,
      substation: substation.trim() || undefined,
      description: description.trim() || undefined,
      cloneFromSheetId: !isEditing && creationMode === 'clone' ? cloneFromSheetId : undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? 'แก้ไขข้อมูลหน้าผังวงจร' : 'เพิ่มหน้าผังหม้อแปลงใหม่'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditing ? `รหัสหน้า ${sheet.sheetNo}` : 'สร้างหน้าผังสายป้อนใหม่เพื่อรองรับหลายไลน์'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Creation Mode for New Sheet */}
          {!isEditing && (
            <div className="space-y-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                รูปแบบการสร้างหน้าใหม่:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCreationMode('blank')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-left ${
                    creationMode === 'blank'
                      ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Plus className="w-5 h-5 text-blue-600" />
                  <span>หน้าเปล่า (Blank)</span>
                  <span className="text-[10px] font-normal text-slate-500 text-center">เริ่มวาดผังใหม่ตั้งแต่ต้น</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCreationMode('clone')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-left ${
                    creationMode === 'clone'
                      ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Copy className="w-5 h-5 text-amber-600" />
                  <span>คัดลอกผังเดิม (Clone)</span>
                  <span className="text-[10px] font-normal text-slate-500 text-center">นำอุปกรณ์จากหน้าอื่นมาเป็นต้นแบบ</span>
                </button>
              </div>

              {creationMode === 'clone' && (
                <div className="mt-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    เลือกหน้าที่ต้องการคัดลอก:
                  </label>
                  <select
                    value={cloneFromSheetId}
                    onChange={(e) => setCloneFromSheetId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  >
                    {allSheets.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.sheetNo} {s.title} ({s.transformers?.length || 0} หม้อแปลง)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Sheet Number & Title */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                หมายเลขหน้า *
              </label>
              <input
                type="text"
                value={sheetNo}
                onChange={e => setSheetNo(e.target.value)}
                placeholder="(2)"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                ชื่อผัง / ไลน์สายป้อน *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="เช่น ไลน์แม่สูน, ไลน์ท่าตอน"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Feeder Code & Substation */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                รหัสสายป้อน (Feeder Code)
              </label>
              <input
                type="text"
                value={feederCode}
                onChange={e => setFeederCode(e.target.value)}
                placeholder="เช่น FAA-06, 3S-01"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                สถานีไฟฟ้าต้นทาง
              </label>
              <input
                type="text"
                value={substation}
                onChange={e => setSubstation(e.target.value)}
                placeholder="สถานีไฟฟ้าฝาง"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Description / Notes */}
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              คำอธิบาย / รายละเอียดเพิ่มเติม
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="เช่น ช่วงบ้านห้วยบอน - สันทรายคลองน้อย"
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'บันทึกการแก้ไข' : 'สร้างหน้าผัง'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
