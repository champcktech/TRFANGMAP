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
  { label: 'น้ำเงินถนน', value: '#1d4ed8' },
  { label: 'ฟ้าข้อความ', value: '#2563eb' },
  { label: 'แดงเตือน/22kV', value: '#dc2626' },
  { label: 'เขียวสถานที่', value: '#16a34a' },
  { label: 'ดำ/เทาเข้ม', value: '#0f172a' },
  { label: 'ม่วงเฉพาะราย', value: '#9333ea' },
  { label: 'ส้มจุดต่อ', value: '#ea580c' },
  { label: 'เหลืองอำพัน', value: '#d97706' },
  { label: 'ฟ้าคราม/น้ำ', value: '#0284c7' }
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
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            ข้อความที่แสดง (Label Text)
          </label>
          <span className="text-[11px] font-mono font-bold flex items-center gap-1.5" style={{ color: formData.color || '#1d4ed8' }}>
            <span className="w-2.5 h-2.5 rounded-full inline-block shadow-xs" style={{ backgroundColor: formData.color || '#1d4ed8' }} />
            <span>{formData.color || '#1d4ed8'}</span>
          </span>
        </div>
        <input
          type="text"
          value={formData.text}
          onChange={(e) => handleChange('text', e.target.value)}
          style={{ color: formData.color || '#1d4ed8' }}
          placeholder="เช่น ถนนสาย เชียงใหม่ - ฝาง, ไป บ.ต้นหนุน"
          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
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

      {/* Color Palette Presets & Color Picker */}
      <div className="space-y-2 p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-750">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-blue-500" />
            <span>สีของข้อความ</span>
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-500 uppercase">{formData.color || '#1d4ed8'}</span>
            <div
              className="w-3.5 h-3.5 rounded-full border border-white dark:border-slate-700 shadow-xs"
              style={{ backgroundColor: formData.color || '#1d4ed8' }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {COLOR_PRESETS.map((preset) => {
            const isSelected = (formData.color || '#1d4ed8').toLowerCase() === preset.value.toLowerCase();
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => handleChange('color', preset.value)}
                className={`px-1.5 py-1.5 rounded-lg border text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0 shadow-xs border border-black/10"
                  style={{ backgroundColor: preset.value }}
                />
                <span className="truncate">{preset.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 flex items-center gap-2">
          <label
            htmlFor="drawer-ann-color-picker"
            className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer shadow-xs transition-colors shrink-0"
          >
            <input
              id="drawer-ann-color-picker"
              type="color"
              value={formData.color || '#1d4ed8'}
              onChange={(e) => handleChange('color', e.target.value)}
              className="w-4 h-4 rounded cursor-pointer border-0 p-0 bg-transparent shrink-0"
            />
            <span>จานสี</span>
          </label>

          <div className="flex-1 flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-0.5">
            <span className="text-slate-400 text-xs font-mono">#</span>
            <input
              type="text"
              value={(formData.color || '#1d4ed8').replace('#', '')}
              onChange={(e) => {
                const val = e.target.value.trim();
                handleChange('color', val ? `#${val}` : '#1d4ed8');
              }}
              placeholder="1d4ed8"
              maxLength={6}
              className="w-full bg-transparent text-xs font-mono font-bold uppercase outline-none text-slate-800 dark:text-slate-200"
            />
          </div>
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
