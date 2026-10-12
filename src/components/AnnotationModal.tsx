import React, { useState, useEffect } from 'react';
import { AnnotationLabel, AnnotationType } from '../types';
import { X, Save, Trash2, Type, Palette, Check, Eye, Landmark, MapPin, Compass } from 'lucide-react';

interface AnnotationModalProps {
  isOpen: boolean;
  annotation: AnnotationLabel | null;
  defaultPosition?: { x: number; y: number };
  onClose: () => void;
  onSave: (ann: AnnotationLabel) => void;
  onDelete?: (id: string) => void;
}

const COLOR_PRESETS = [
  { label: 'น้ำเงินถนน/โรงเรียน', value: '#1d4ed8' },
  { label: 'ฟ้าข้อความ/ราชการ', value: '#0284c7' },
  { label: 'แดง รพ./แมคโคร', value: '#dc2626' },
  { label: 'ส้มเซเว่น (7-11)', value: '#ea580c' },
  { label: 'เขียวโลตัส/สถานที่', value: '#059669' },
  { label: 'เหลืองอำพัน/วัด', value: '#d97706' },
  { label: 'ม่วงเฉพาะราย', value: '#9333ea' },
  { label: 'ชมพูเข้ม/แมคโคร', value: '#e11d48' },
  { label: 'ดำ/เทาเข้ม', value: '#0f172a' }
];

export const LANDMARK_DEFINITIONS: {
  type: AnnotationType;
  icon: string;
  label: string;
  badgeBg: string;
  defaultColor: string;
  examples: string[];
}[] = [
  {
    type: 'school',
    icon: '🏫',
    label: 'โรงเรียน',
    badgeBg: '#eff6ff',
    defaultColor: '#1d4ed8',
    examples: ['รร.ฝางชนูปถัมภ์', 'รร.บ้านเวียงฝาง', 'รร.รัตนาเอื้อวิทยา', 'รร.บ้านห้วยบอน']
  },
  {
    type: 'temple',
    icon: '🛕',
    label: 'วัด',
    badgeBg: '#fffbeb',
    defaultColor: '#d97706',
    examples: ['วัดสวนดอก', 'วัดศรีบุญเรือง', 'วัดพระบาทอุดม', 'วัดป่าบง']
  },
  {
    type: 'hospital',
    icon: '🏥',
    label: 'โรงพยาบาล',
    badgeBg: '#fef2f2',
    defaultColor: '#dc2626',
    examples: ['รพ.ฝาง', 'รพ.สต.เวียง', 'รพ.สต.สันทราย', 'คลินิกแพทย์']
  },
  {
    type: 'government',
    icon: '🏛️',
    label: 'สถานที่ราชการ',
    badgeBg: '#f0f9ff',
    defaultColor: '#0284c7',
    examples: ['ที่ว่าการอำเภอฝาง', 'อบต.เวียง', 'สภ.ฝาง', 'กฟส.ฝาง', 'สนง.ที่ดิน']
  },
  {
    type: 'makro',
    icon: '🔴',
    label: 'แมคโคร (Makro)',
    badgeBg: '#fff1f2',
    defaultColor: '#e11d48',
    examples: ['แมคโคร ฝาง (Makro)', 'แมคโคร ฟูดเซอร์วิส']
  },
  {
    type: 'lotus',
    icon: '🟢',
    label: 'โลตัส (Lotus\'s)',
    badgeBg: '#ecfdf5',
    defaultColor: '#059669',
    examples: ['โลตัส ฝาง (Lotus\'s)', 'โลตัส โกเฟรช']
  },
  {
    type: 'seven_eleven',
    icon: '🏪',
    label: 'เซเว่น (7-Eleven)',
    badgeBg: '#fff7ed',
    defaultColor: '#ea580c',
    examples: ['7-Eleven สาขาสวนดอก', '7-Eleven หน้า รพ.ฝาง', '7-Eleven สาขาตลาดฝาง', '7-Eleven ปตท.ฝาง']
  }
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

  const currentType = formData.type || 'road';
  const matchedLandmark = LANDMARK_DEFINITIONS.find(l => l.type === currentType);

  const handleSelectLandmarkPreset = (landmark: typeof LANDMARK_DEFINITIONS[0]) => {
    setFormData(prev => ({
      ...prev,
      type: landmark.type,
      color: landmark.defaultColor,
      text: (!prev.text || prev.text === 'ข้อความใหม่' || LANDMARK_DEFINITIONS.some(lm => lm.examples.includes(prev.text || '') || lm.label === prev.text))
        ? landmark.examples[0]
        : prev.text
    }));
    if (errors.text) setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.text?.trim()) {
      setErrors({ text: 'กรุณาระบุชื่อสถานที่ หรือข้อความกำกับ เช่น รร.ฝางชนูปถัมภ์, วัดสวนดอก' });
      return;
    }

    const currentTextPos = formData.textPosition || (formData.orientation === 'vertical' ? 'bottom' : 'right');
    const payload: AnnotationLabel = {
      id: formData.id || `ann-${Date.now()}`,
      text: formData.text.trim(),
      type: (formData.type as AnnotationType) || 'road',
      orientation: formData.orientation || ((currentTextPos === 'top' || currentTextPos === 'bottom') ? 'vertical' : 'horizontal'),
      textPosition: currentTextPos,
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
        className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-850 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              {matchedLandmark ? (
                <span className="text-lg leading-none">{matchedLandmark.icon}</span>
              ) : (
                <Type className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold">
                {annotation ? 'แก้ไขสัญลักษณ์ / ข้อความกำกับ' : 'เพิ่มสัญลักษณ์สถานที่ / ข้อความกำกับ'}
              </h2>
              <p className="text-xs text-slate-500">
                โรงเรียน, วัด, โรงพยาบาล, สถานที่ราชการ, แมคโคร, โลตัส, เซเว่น หรือชื่อถนน
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Quick Landmark Presets Bar */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Landmark className="w-3.5 h-3.5 text-blue-500" />
                <span>เลือกประเภทสัญลักษณ์สถานที่สำคัญ:</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">คลิกเลือกเพื่อเปลี่ยนสัญลักษณ์และสีอัตโนมัติ</span>
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-0.5">
              {LANDMARK_DEFINITIONS.map(lm => {
                const isSelected = currentType === lm.type;
                return (
                  <button
                    key={lm.type}
                    type="button"
                    onClick={() => handleSelectLandmarkPreset(lm)}
                    title={`เลือกสัญลักษณ์ ${lm.label}`}
                    className={`px-1.5 py-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/30 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span className="text-lg leading-none">{lm.icon}</span>
                    <span className="text-[10px] font-bold truncate max-w-full leading-tight">{lm.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick suggestions chips if landmark selected */}
          {matchedLandmark && (
            <div className="space-y-1 p-2.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-900/40">
              <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 block">
                ตัวอย่างชื่อ {matchedLandmark.label} (คลิกเพื่อเลือกทันที):
              </span>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {matchedLandmark.examples.map(ex => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, text: ex });
                      if (errors.text) setErrors({});
                    }}
                    className="px-2 py-0.5 rounded-lg text-xs bg-white dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium transition-colors cursor-pointer"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Text Input with Real-time Color Feedback */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                ชื่อสถานที่ / ข้อความกำกับ <span className="text-red-500">*</span>
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
              placeholder={matchedLandmark ? `เช่น ${matchedLandmark.examples[0]}` : 'เช่น ถนนสาย เชียงใหม่ - ฝาง, รร.ฝางชนูปถัมภ์'}
              className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${
                errors.text ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
              }`}
            />
            {errors.text && <p className="text-xs text-red-500">{errors.text}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                ประเภทสัญลักษณ์ / ข้อความ
              </label>
              <select
                value={formData.type || 'road'}
                onChange={(e) => {
                  const val = e.target.value as AnnotationType;
                  const lm = LANDMARK_DEFINITIONS.find(l => l.type === val);
                  setFormData({
                    ...formData,
                    type: val,
                    color: lm ? lm.defaultColor : (formData.color || '#1d4ed8')
                  });
                }}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              >
                <optgroup label="สัญลักษณ์สถานที่สำคัญ (Landmarks)">
                  <option value="school">🏫 โรงเรียน (School)</option>
                  <option value="temple">🛕 วัด (Wat / Temple)</option>
                  <option value="hospital">🏥 โรงพยาบาล (Hospital)</option>
                  <option value="government">🏛️ สถานที่ราชการ (Govt Office)</option>
                  <option value="makro">🔴 แมคโคร (Makro)</option>
                  <option value="lotus">🟢 โลตัส (Lotus's)</option>
                  <option value="seven_eleven">🏪 เซเว่น (7-Eleven)</option>
                </optgroup>
                <optgroup label="ข้อความกำกับทั่วไป">
                  <option value="road">🛣️ ชื่อถนน / ทางหลวง</option>
                  <option value="location">📍 สถานที่ / หมู่บ้าน</option>
                  <option value="feeder_title">🏷️ หัวสายป้อน</option>
                  <option value="terminal">🛑 ปลายทาง (Terminal)</option>
                </optgroup>
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

          {/* Text Placement Direction for Landmarks */}
          <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-blue-500" />
                <span>ทิศทางการวางข้อความ {matchedLandmark ? '(เทียบกับสัญลักษณ์)' : ''}</span>
              </label>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">
                {formData.textPosition === 'left' ? '👈 ด้านซ้าย' :
                 formData.textPosition === 'top' ? '☝️ ด้านบน' :
                 formData.textPosition === 'bottom' ? '👇 ด้านล่าง' : '👉 ด้านขวา (ปกติ)'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[
                { id: 'left' as const, label: 'ซ้าย (Left)', icon: '👈', desc: 'ข้อความอยู่ซ้าย ไอคอนอยู่ขวา' },
                { id: 'right' as const, label: 'ขวา (Right)', icon: '👉', desc: 'ไอคอนอยู่ซ้าย ข้อความอยู่ขวา' },
                { id: 'top' as const, label: 'ด้านบน (Top)', icon: '☝️', desc: 'ข้อความอยู่บน ไอคอนอยู่ล่าง' },
                { id: 'bottom' as const, label: 'ด้านล่าง (Bottom)', icon: '👇', desc: 'ไอคอนอยู่บน ข้อความอยู่ล่าง' },
              ].map(dir => {
                const currentPos = formData.textPosition || (formData.orientation === 'vertical' ? 'bottom' : 'right');
                const isSelected = currentPos === dir.id;
                return (
                  <button
                    key={dir.id}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        textPosition: dir.id,
                        orientation: (dir.id === 'top' || dir.id === 'bottom') ? 'vertical' : 'horizontal'
                      }));
                    }}
                    className={`py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/30 font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium'
                    }`}
                    title={dir.desc}
                  >
                    <span className="text-base leading-none">{dir.icon}</span>
                    <span className="text-[11px] leading-tight">{dir.label}</span>
                  </button>
                );
              })}
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
                <span>เลือกสีของสัญลักษณ์ / ข้อความ</span>
              </label>
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

            {/* Custom Color Picker Input */}
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
                <span>ตัวอย่างสัญลักษณ์จริงบนผัง (Live Preview):</span>
              </span>
              <span className="text-[10px] font-mono font-semibold" style={{ color: currentColor }}>
                {formData.fontSize || 14}px
              </span>
            </div>

            <div className="h-20 flex items-center justify-center bg-slate-50 dark:bg-slate-950/70 rounded-lg border border-slate-100 dark:border-slate-800 p-2 overflow-hidden">
              {matchedLandmark ? (
                <div 
                  className={`inline-flex items-center gap-2 p-1.5 transition-all ${
                    (formData.textPosition === 'top')
                      ? 'flex-col-reverse'
                      : (formData.textPosition === 'bottom' || (!formData.textPosition && formData.orientation === 'vertical'))
                      ? 'flex-col'
                      : (formData.textPosition === 'left')
                      ? 'flex-row-reverse'
                      : 'flex-row'
                  }`}
                >
                  <span className="text-xl leading-none">{matchedLandmark.icon}</span>
                  <span 
                    className="font-bold truncate text-center"
                    style={{
                      color: currentColor,
                      fontSize: `${formData.fontSize || 14}px`
                    }}
                  >
                    {formData.text?.trim() || matchedLandmark.examples[0]}
                  </span>
                </div>
              ) : (
                <span
                  style={{
                    color: currentColor,
                    fontSize: `${formData.fontSize || 14}px`,
                    fontWeight: 'bold',
                    writingMode: (formData.orientation === 'vertical' || formData.textPosition === 'top' || formData.textPosition === 'bottom') ? 'vertical-rl' : 'horizontal-tb',
                    letterSpacing: (formData.orientation === 'vertical' || formData.textPosition === 'top' || formData.textPosition === 'bottom') ? '2px' : 'normal'
                  }}
                  className="truncate max-w-full text-center transition-all"
                >
                  {formData.text?.trim() || 'ตัวอย่างข้อความกำกับ (Preview)'}
                </span>
              )}
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
                <span>ลบสัญลักษณ์</span>
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
