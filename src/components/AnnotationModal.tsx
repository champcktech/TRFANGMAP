import React, { useState, useEffect } from 'react';
import { AnnotationLabel } from '../types';
import { X, Save, Trash2, Type, Palette, Check, Eye } from 'lucide-react';

interface AnnotationModalProps {
  isOpen: boolean;
  annotation: AnnotationLabel | null;
  defaultPosition?: { x: number; y: number };
  onClose: () => void;
  onSave: (ann: AnnotationLabel) => void;
  onDelete?: (id: string) => void;
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

export const AnnotationModal: React.FC<AnnotationModalProps> = ({
  isOpen,
  annotation,
  defaultPosition,
  onClose,
  onSave,
  onDelete
}) => {
  const [formData, setFormData] = useState<Partial<AnnotationLabel>>({
    text: '',
    type: 'road',
    orientation: 'horizontal',
    color: '#1d4ed8',
    fontSize: 14,
    x: 400,
    y: 400
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (annotation) {
      setFormData(annotation);
    } else {
      setFormData({
        id: `ann-${Date.now()}`,
        text: '',
        type: 'road',
        orientation: 'horizontal',
        color: '#1d4ed8',
        fontSize: 14,
        x: defaultPosition?.x || 400,
        y: defaultPosition?.y || 400
      });
    }
    setErrors({});
  }, [annotation, defaultPosition, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.text?.trim()) {
      setErrors({ text: 'กรุณาระบุข้อความ เช่น ถนนสาย เชียงใหม่ - ฝาง, ไป บ.ห้วยบอน' });
      return;
    }

    const payload: AnnotationLabel = {
      id: formData.id || `ann-${Date.now()}`,
      text: formData.text.trim(),
      type: formData.type || 'road',
      orientation: formData.orientation || 'horizontal',
      color: formData.color || '#1d4ed8',
      fontSize: Number(formData.fontSize) || 14,
      x: Number(formData.x) || 400,
      y: Number(formData.y) || 400
    };

    onSave(payload);
    onClose();
  };

  const currentColor = formData.color || '#1d4ed8';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="annotation-modal"
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden text-slate-800 dark:text-slate-100"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <Type className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {annotation ? 'แก้ไขข้อความกำกับ / ชื่อถนน' : 'เพิ่มข้อความกำกับ / ชื่อถนนใหม่'}
              </h2>
              <p className="text-xs text-slate-500">
                {annotation ? `ข้อความ: ${annotation.text}` : 'ระบุชื่อถนน สถานที่ หรือป้ายสายป้อน'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
          {/* Text Input with Real-time Color Feedback */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                ข้อความที่ต้องการแสดง <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-mono font-bold flex items-center gap-1.5" style={{ color: currentColor }}>
                <span className="w-2.5 h-2.5 rounded-full inline-block shadow-xs" style={{ backgroundColor: currentColor }} />
                <span>สี: {currentColor}</span>
              </span>
            </div>
            <input
              type="text"
              value={formData.text || ''}
              onChange={(e) => {
                setFormData({ ...formData, text: e.target.value });
                if (errors.text) setErrors({});
              }}
              style={{ color: currentColor }}
              placeholder="เช่น ถนนสาย เชียงใหม่ - ฝาง, ไป บ.ต้นหนุน"
              className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${
                errors.text ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
              }`}
            />
            {errors.text && <p className="text-xs text-red-500">{errors.text}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                ประเภทข้อความ
              </label>
              <select
                value={formData.type || 'road'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="road">ชื่อถนน / ทางหลวง</option>
                <option value="location">สถานที่ / หมู่บ้าน</option>
                <option value="feeder_title">หัวสายป้อน</option>
                <option value="terminal">ปลายทาง (Terminal)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                แนวการวางตัว
              </label>
              <select
                value={formData.orientation || 'horizontal'}
                onChange={(e) => setFormData({ ...formData, orientation: e.target.value as any })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="horizontal">แนวนอน (Horizontal)</option>
                <option value="vertical">แนวตั้ง (Vertical)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>ขนาดตัวอักษร</span>
              <span className="font-mono">{formData.fontSize || 14}px</span>
            </div>
            <input
              type="range"
              min="10"
              max="32"
              step="1"
              value={formData.fontSize || 14}
              onChange={(e) => setFormData({ ...formData, fontSize: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Color Selection Palette & Custom Color Picker */}
          <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-blue-500" />
                <span>เลือกสีของข้อความ</span>
              </label>
              {/* Color Preview Swatch */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  {currentColor}
                </span>
                <div
                  className="w-4 h-4 rounded-full border border-white dark:border-slate-700 shadow-xs"
                  style={{ backgroundColor: currentColor }}
                />
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = currentColor.toLowerCase() === preset.value.toLowerCase();
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: preset.value })}
                    className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/30 shadow-xs font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-black/10 flex items-center justify-center"
                      style={{ backgroundColor: preset.value }}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white drop-shadow-sm" />}
                    </div>
                    <span className="truncate">{preset.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Color Picker Input & Hex field */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 flex items-center gap-2">
              <label
                htmlFor="ann-color-picker"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer shadow-xs transition-colors shrink-0"
              >
                <input
                  id="ann-color-picker"
                  type="color"
                  value={currentColor}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent shrink-0"
                />
                <span>จานสีอิสระ</span>
              </label>

              <div className="flex-1 flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1">
                <span className="text-slate-400 text-xs font-mono">#</span>
                <input
                  type="text"
                  value={currentColor.replace('#', '')}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setFormData({ ...formData, color: val ? `#${val}` : '#1d4ed8' });
                  }}
                  placeholder="1d4ed8"
                  maxLength={6}
                  className="w-full bg-transparent text-xs font-mono font-bold uppercase outline-none text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Live Diagram Preview Box inside Modal */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-200/80 dark:border-blue-900/60 shadow-xs space-y-1.5">
            <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                <span>ตัวอย่างข้อความจริงบนผัง (Live Preview):</span>
              </span>
              <span className="text-[10px] font-mono font-semibold" style={{ color: currentColor }}>
                {formData.fontSize || 14}px
              </span>
            </div>

            <div className="h-16 flex items-center justify-center bg-slate-50 dark:bg-slate-950/70 rounded-lg border border-slate-100 dark:border-slate-800 px-3 overflow-hidden">
              <span
                style={{
                  color: currentColor,
                  fontSize: `${formData.fontSize || 14}px`,
                  fontWeight: 'bold',
                  writingMode: formData.orientation === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
                  letterSpacing: formData.orientation === 'vertical' ? '2px' : 'normal'
                }}
                className="truncate max-w-full text-center transition-all"
              >
                {formData.text?.trim() || 'ตัวอย่างข้อความกำกับ (Preview)'}
              </span>
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
            {annotation && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(annotation.id);
                  onClose();
                }}
                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>ลบข้อความ</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
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
