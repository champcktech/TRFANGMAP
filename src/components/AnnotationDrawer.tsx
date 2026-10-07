import React, { useState, useEffect } from 'react';
import { AnnotationLabel } from '../types';
import {
  X,
  Trash2,
  Type,
  AlignLeft,
  AlignCenter,
  Palette,
  Compass
} from 'lucide-react';

interface AnnotationDrawerProps {
  selectedAnnotation: AnnotationLabel | null;
  isReadOnly?: boolean;
  onClose: () => void;
  onUpdateAnnotation: (ann: AnnotationLabel) => void;
  onDeleteAnnotation: (id: string) => void;
}

const COLOR_PRESETS = [
  { label: 'น้ำเงินถนน (มาตรฐาน)', value: '#1d4ed8' },
  { label: 'ฟ้าข้อความ', value: '#2563eb' },
  { label: 'แดงเตือน/ปลายทาง', value: '#dc2626' },
  { label: 'เขียวสถานที่', value: '#059669' },
  { label: 'ดำ/เทาเข้ม', value: '#0f172a' },
  { label: 'ม่วงสายป้อน', value: '#7c3aed' }
];

export const AnnotationDrawer: React.FC<AnnotationDrawerProps> = ({
  selectedAnnotation,
  isReadOnly = false,
  onClose,
  onUpdateAnnotation,
  onDeleteAnnotation
}) => {
  const [formData, setFormData] = useState<AnnotationLabel | null>(null);

  useEffect(() => {
    if (selectedAnnotation) {
      setFormData({ ...selectedAnnotation });
    } else {
      setFormData(null);
    }
  }, [selectedAnnotation]);

  if (!selectedAnnotation || !formData) return null;

  const handleChange = (field: keyof AnnotationLabel, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onUpdateAnnotation(updated);
  };

  return (
    <div
      id="annotation-detail-drawer"
      className="absolute top-16 right-4 z-40 w-80 max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-4 animate-in slide-in-from-right-4 duration-200 text-slate-800 dark:text-slate-100 max-h-[calc(100vh-6rem)] overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
            <Type className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm">ข้อความกำกับ / ชื่อถนน</h3>
            <p className="text-[11px] text-slate-400 truncate max-w-[160px]">{formData.text}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Text Input */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          ข้อความที่แสดง (Label Text)
        </label>
        <input
          type="text"
          value={formData.text}
          onChange={(e) => handleChange('text', e.target.value)}
          placeholder="เช่น ถนนสาย เชียงใหม่ - ฝาง, ไป บ.ต้นหนุน"
          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* Annotation Type & Orientation */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            ประเภทข้อความ
          </label>
          <select
            value={formData.type || 'road'}
            onChange={(e) => handleChange('type', e.target.value)}
            className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="road">ชื่อถนน / ทางหลวง</option>
            <option value="location">สถานที่ / หมู่บ้าน</option>
            <option value="feeder_title">หัวสายป้อน</option>
            <option value="terminal">ปลายทาง (Terminal)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            แนวการวางตัว
          </label>
          <select
            value={formData.orientation || 'horizontal'}
            onChange={(e) => handleChange('orientation', e.target.value)}
            className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="horizontal">แนวนอน (Horizontal)</option>
            <option value="vertical">แนวตั้ง (Vertical)</option>
          </select>
        </div>
      </div>

      {/* Font Size Slider */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span>ขนาดตัวอักษร</span>
          <span className="font-mono">{formData.fontSize || 14}px</span>
        </div>
        <input
          type="range"
          min="10"
          max="32"
          step="1"
          value={formData.fontSize || 14}
          onChange={(e) => handleChange('fontSize', Number(e.target.value))}
          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>

      {/* Color Palette Presets */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-slate-400" />
          <span>สีของข้อความ</span>
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {COLOR_PRESETS.map((preset) => {
            const isSelected = (formData.color || '#1d4ed8') === preset.value;
            return (
              <button
                key={preset.value}
                onClick={() => handleChange('color', preset.value)}
                className={`px-2 py-1.5 rounded-lg border text-[10px] font-semibold flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0 shadow-inner"
                  style={{ backgroundColor: preset.value }}
                />
                <span className="truncate">{preset.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
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
            id="btn-delete-annotation"
            onClick={() => {
              onDeleteAnnotation(formData.id);
              onClose();
            }}
            className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>ลบข้อความนี้ (Delete Label)</span>
          </button>
        </div>
      )}
    </div>
  );
};
