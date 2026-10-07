import React from 'react';
import { FeederPath } from '../types';
import { 
  X, 
  Trash2, 
  GitCommit, 
  Palette, 
  Layers, 
  Sliders, 
  Plus, 
  Check, 
  Move,
  CornerDownRight
} from 'lucide-react';

interface LineEditorDrawerProps {
  selectedPath: FeederPath | null;
  isReadOnly?: boolean;
  onClose: () => void;
  onUpdatePath: (path: FeederPath) => void;
  onDeletePath: (id: string) => void;
  onAddPointToPath: (pathId: string) => void;
}

export const LineEditorDrawer: React.FC<LineEditorDrawerProps> = ({
  selectedPath,
  isReadOnly = false,
  onClose,
  onUpdatePath,
  onDeletePath,
  onAddPointToPath
}) => {
  if (!selectedPath) return null;

  const handleNameChange = (name: string) => {
    onUpdatePath({ ...selectedPath, name });
  };

  const handleStyleChange = (style: 'solid' | 'dashed') => {
    onUpdatePath({ ...selectedPath, style });
  };

  const handleStrokeWidthChange = (strokeWidth: number) => {
    onUpdatePath({ ...selectedPath, strokeWidth });
  };

  const handleColorChange = (color: string) => {
    onUpdatePath({ ...selectedPath, color });
  };

  const colorOptions = [
    { label: 'ดำ (มาตรฐาน)', value: '#000000' },
    { label: 'น้ำเงิน (สายเมน)', value: '#2563eb' },
    { label: 'แดง (แรงสูง 22kV)', value: '#dc2626' },
    { label: 'เขียว (สายป้อน 3)', value: '#16a34a' },
    { label: 'ม่วง (สายเฉพาะราย)', value: '#9333ea' },
    { label: 'ส้ม (สายฉุกเฉิน)', value: '#ea580c' }
  ];

  return (
    <div className="absolute top-16 right-4 z-30 w-80 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 animate-in fade-in slide-in-from-right-4 duration-200 text-slate-800 dark:text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
            <GitCommit className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              แก้ไขเส้นวงจร (Feeder Line)
            </div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              {selectedPath.name || selectedPath.id}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Path Name Input */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          ชื่อเส้นสายป้อน / สายแยก
        </label>
        <input
          type="text"
          disabled={isReadOnly}
          value={selectedPath.name || ''}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="เช่น สายเมน เชียงใหม่-ฝาง, สายแยกบ้านห้วยบอน"
          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75 disabled:bg-slate-50 dark:disabled:bg-slate-900/50"
        />
      </div>

      {/* Line Style Toggle */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          รูปแบบเส้น
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={isReadOnly}
            onClick={() => handleStyleChange('solid')}
            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
              (selectedPath.style || 'solid') === 'solid'
                ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <div className="w-6 h-0.5 bg-current"></div>
            <span>เส้นทึบ (สายหลัก)</span>
          </button>
          <button
            disabled={isReadOnly}
            onClick={() => handleStyleChange('dashed')}
            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
              selectedPath.style === 'dashed'
                ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <div className="w-6 h-0.5 border-b-2 border-dashed border-current"></div>
            <span>เส้นประ (Tie Line)</span>
          </button>
        </div>
      </div>

      {/* Stroke Width Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600 dark:text-slate-300">ความหนาเส้น</span>
          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
            {selectedPath.strokeWidth || 2.5} px
          </span>
        </div>
        <input
          type="range"
          disabled={isReadOnly}
          min="1"
          max="6"
          step="0.5"
          value={selectedPath.strokeWidth || 2.5}
          onChange={(e) => handleStrokeWidthChange(parseFloat(e.target.value))}
          className="w-full accent-blue-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        />
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>1px (บาง)</span>
          <span>3px (ปานกลาง)</span>
          <span>6px (หนา)</span>
        </div>
      </div>

      {/* Color Selection */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          สีของเส้นสาย
        </label>
        <div className="grid grid-cols-3 gap-2">
          {colorOptions.map((c) => (
            <button
              key={c.value}
              disabled={isReadOnly}
              onClick={() => handleColorChange(c.value)}
              className={`p-2 rounded-xl text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
                (selectedPath.color || '#000000') === c.value
                  ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/30'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <div
                className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-sm shrink-0"
                style={{ backgroundColor: c.value }}
              />
              <span className="truncate">{c.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Points Coordinate List & Vertex Deletion */}
      <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-600 dark:text-slate-300">จุดข้อต่อบนเส้น (Vertices)</span>
          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
            {selectedPath.points.length} จุด
          </span>
        </div>
        
        {/* Scrollable Points List */}
        <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
          {selectedPath.points.map((pt, idx) => (
            <div 
              key={idx}
              className="flex items-center justify-between px-2.5 py-1.5 bg-white dark:bg-slate-800 rounded-lg text-[11px] border border-slate-200 dark:border-slate-700"
            >
              <span className="font-medium text-slate-500">จุดที่ {idx + 1}:</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                X: {pt.x}, Y: {pt.y}
              </span>
              {!isReadOnly && selectedPath.points.length > 2 ? (
                <button
                  onClick={() => {
                    const newPoints = selectedPath.points.filter((_, i) => i !== idx);
                    onUpdatePath({ ...selectedPath, points: newPoints });
                  }}
                  title={`ลบจุดที่ ${idx + 1}`}
                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="text-[10px] text-slate-400 italic">จุดหลัก</span>
              )}
            </div>
          ))}
        </div>

        <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
          {isReadOnly 
            ? '*โหมดแสดงผล (Read-Only) ล็อคการแก้ไขเส้นวงจร'
            : '*คลิกลากจุดวงกลมบนเส้นเพื่อดัดแนว, ดับเบิ้ลคลิกเพื่อลบจุด หรือคลิกปุ่ม + บนเส้นเพื่อเพิ่มมุมหัก'}
        </p>
      </div>

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => {
              onDeletePath(selectedPath.id);
              onClose();
            }}
            className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>ลบเส้นสายนี้ (Delete Line)</span>
          </button>
        </div>
      )}
    </div>
  );
};
