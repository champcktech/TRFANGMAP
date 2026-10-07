import React, { useState, useEffect } from 'react';
import { SwitchNode } from '../types';
import { X, Save, Trash2, Power, RotateCw, Tag } from 'lucide-react';

interface SwitchModalProps {
  isOpen: boolean;
  switchNode: SwitchNode | null;
  defaultPosition?: { x: number; y: number };
  onClose: () => void;
  onSave: (sw: SwitchNode) => void;
  onDelete?: (id: string) => void;
}

export const SwitchModal: React.FC<SwitchModalProps> = ({
  isOpen,
  switchNode,
  defaultPosition,
  onClose,
  onSave,
  onDelete
}) => {
  const [formData, setFormData] = useState<Partial<SwitchNode>>({
    code: '3S-01',
    name: 'สวิตช์ใบมีด',
    type: 'ABS',
    x: 400,
    y: 400,
    rotation: 0,
    status: 'closed',
    feeder: 'ไลน์สวนดอก'
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (switchNode) {
      setFormData(switchNode);
    } else {
      setFormData({
        id: `sw-${Date.now()}`,
        code: '3S-01',
        name: 'สวิตช์ใบมีด',
        type: 'ABS',
        x: defaultPosition?.x || 400,
        y: defaultPosition?.y || 400,
        rotation: 0,
        status: 'closed',
        feeder: 'ไลน์สวนดอก'
      });
    }
    setErrors({});
  }, [switchNode, defaultPosition, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code?.trim()) {
      setErrors({ code: 'กรุณาระบุรหัสสวิตช์ เช่น 3S-05, FAA-09, 8F-07' });
      return;
    }

    const payload: SwitchNode = {
      id: formData.id || `sw-${Date.now()}`,
      code: formData.code.trim(),
      name: formData.name?.trim() || undefined,
      type: formData.type || 'ABS',
      x: Number(formData.x) || 400,
      y: Number(formData.y) || 400,
      rotation: Number(formData.rotation) || 0,
      status: formData.status || 'closed',
      feeder: formData.feeder || 'ไลน์สวนดอก'
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="switch-modal"
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden text-slate-800 dark:text-slate-100"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {switchNode ? 'แก้ไขสวิตช์ / อุปกรณ์ตัดตอน' : 'เพิ่มสวิตช์ / อุปกรณ์ตัดตอนใหม่'}
              </h2>
              <p className="text-xs text-slate-500">
                {switchNode ? `รหัส: ${switchNode.code}` : 'กำหนดรหัสและประเภทสวิตช์บนผัง'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              รหัสอุปกรณ์ / ชื่อสวิตช์ (Code) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.code || ''}
              onChange={(e) => {
                setFormData({ ...formData, code: e.target.value });
                if (errors.code) setErrors({});
              }}
              placeholder="เช่น 3S-05, FAA-09, 8F-07, SF6-01"
              className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none ${
                errors.code ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
              }`}
            />
            {errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                ประเภทอุปกรณ์
              </label>
              <select
                value={formData.type || 'ABS'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="ABS">ABS (สวิตช์ใบมีด)</option>
                <option value="DISCONNECT">DISCONNECT (สวิตช์ตัดตอน)</option>
                <option value="FUSE">FUSE (ฟิวส์แรงสูง)</option>
                <option value="RECLOSER">RECLOSER (รีโคลสเซอร์)</option>
                <option value="SECTIONALIZER">SECTIONALIZER</option>
                <option value="FEEDER_TAG">FEEDER_TAG (ป้ายหัวสายป้อน)</option>
                <option value="SUBSTATION">SUBSTATION (สถานีไฟฟ้าย่อย / จุดเชื่อมโยง)</option>
                <option value="CROSS_BOX">CROSS_BOX (กล่องจุดตัดสายส่ง)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                สถานะปกติ
              </label>
              <select
                value={formData.status || 'closed'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="closed">🟢 สับสวิตช์ (Closed - ไฟผ่าน)</option>
                <option value="opened">⚪ ปลดสวิตช์ (Opened - ปลดโหลด)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-500">พิกัด X</label>
              <input
                type="number"
                value={formData.x || 0}
                onChange={(e) => setFormData({ ...formData, x: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-500">พิกัด Y</label>
              <input
                type="number"
                value={formData.y || 0}
                onChange={(e) => setFormData({ ...formData, y: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            {switchNode && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(switchNode.id);
                  onClose();
                }}
                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>ลบสวิตช์</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-xs font-bold transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>บันทึก</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
