import React, { useState, useEffect } from 'react';
import { SwitchNode } from '../types';
import {
  X,
  Trash2,
  Save,
  RotateCw,
  Power,
  ToggleLeft,
  ToggleRight,
  SlidersHorizontal,
  Tag,
  Zap
} from 'lucide-react';

interface SwitchDrawerProps {
  selectedSwitch: SwitchNode | null;
  isReadOnly?: boolean;
  onClose: () => void;
  onUpdateSwitch: (sw: SwitchNode) => void;
  onDeleteSwitch: (id: string) => void;
}

export const SwitchDrawer: React.FC<SwitchDrawerProps> = ({
  selectedSwitch,
  isReadOnly = false,
  onClose,
  onUpdateSwitch,
  onDeleteSwitch
}) => {
  const [formData, setFormData] = useState<SwitchNode | null>(null);

  useEffect(() => {
    if (selectedSwitch) {
      setFormData({ ...selectedSwitch });
    } else {
      setFormData(null);
    }
  }, [selectedSwitch]);

  if (!selectedSwitch || !formData) return null;

  const handleChange = (field: keyof SwitchNode, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onUpdateSwitch(updated);
  };

  const handleToggleStatus = () => {
    const newStatus = formData.status === 'opened' ? 'closed' : 'opened';
    handleChange('status', newStatus);
  };

  const handleRotate = () => {
    const currentRotation = formData.rotation || 0;
    const nextRotation = (currentRotation + 90) % 360;
    handleChange('rotation', nextRotation);
  };

  return (
    <div
      id="switch-detail-drawer"
      className="absolute top-16 right-4 z-40 w-80 max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-4 animate-in slide-in-from-right-4 duration-200 text-slate-800 dark:text-slate-100 max-h-[calc(100vh-6rem)] overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${
            formData.status === 'opened' 
              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' 
              : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
          }`}>
            <Power className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm">สวิตช์ / อุปกรณ์ตัดตอน</h3>
            <p className="text-[11px] text-slate-400 font-mono">{formData.code}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Switch Status Toggle Button */}
      <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold block text-slate-700 dark:text-slate-300">สถานะหน้าสัมผัส</span>
          <span className={`text-[11px] font-bold ${
            formData.status === 'opened' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {formData.status === 'opened' ? '⚪ ปลดสวิตช์ (Opened / Normal Open)' : '🟢 สับสวิตช์ (Closed / ไฟผ่านปกติ)'}
          </span>
        </div>
        {!isReadOnly && (
          <button
            onClick={handleToggleStatus}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
              formData.status === 'opened'
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {formData.status === 'opened' ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
            <span>สลับสถานะ</span>
          </button>
        )}
      </div>

      {/* Code / Tag Name Input */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          รหัสอุปกรณ์ / ชื่อสวิตช์ (Code)
        </label>
        <input
          type="text"
          disabled={isReadOnly}
          value={formData.code}
          onChange={(e) => handleChange('code', e.target.value)}
          placeholder="เช่น 3S-05, 8F-07, FAA-09"
          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800"
        />
      </div>

      {/* Switch Type Selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          ประเภทอุปกรณ์ (Device Type)
        </label>
        <select
          disabled={isReadOnly}
          value={formData.type}
          onChange={(e) => handleChange('type', e.target.value)}
          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800"
        >
          <option value="ABS">ABS (Air Break Switch / สวิตช์ใบมีด)</option>
          <option value="DISCONNECT">DISCONNECT (Disconnecting Switch)</option>
          <option value="FUSE">FUSE (Drop-out Fuse Cutout)</option>
          <option value="RECLOSER">RECLOSER (Auto Recloser / รีโคลสเซอร์)</option>
          <option value="SECTIONALIZER">SECTIONALIZER (เซกชันนัลไลเซอร์)</option>
          <option value="FEEDER_TAG">FEEDER_TAG (ป้ายชื่อหัวสายป้อน / ปลายทาง)</option>
          <option value="SUBSTATION">SUBSTATION (สถานีไฟฟ้าย่อย / จุดเชื่อมโยง)</option>
          <option value="CROSS_BOX">CROSS_BOX (กล่องจุดตัดสายส่ง)</option>
        </select>
      </div>

      {/* Rotation Control */}
      <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
        <div>
          <span className="text-xs font-semibold block text-slate-700 dark:text-slate-300">การหมุนสัญลักษณ์</span>
          <span className="text-[10px] text-slate-400 font-mono">{formData.rotation || 0}° องศา</span>
        </div>
        <button
          onClick={handleRotate}
          className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>หมุน 90°</span>
        </button>
      </div>

      {/* Coordinates (X, Y) */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-500">พิกัด X</label>
          <input
            type="number"
            value={formData.x}
            onChange={(e) => handleChange('x', Number(e.target.value))}
            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-500">พิกัด Y</label>
          <input
            type="number"
            value={formData.y}
            onChange={(e) => handleChange('y', Number(e.target.value))}
            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono"
          />
        </div>
      </div>

      {/* Delete Button */}
      {!isReadOnly && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <button
            id="btn-delete-switch"
            onClick={() => {
              onDeleteSwitch(formData.id);
              onClose();
            }}
            className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>ลบสวิตช์ / อุปกรณ์นี้ (Delete)</span>
          </button>
        </div>
      )}
    </div>
  );
};
