import React from 'react';
import { Transformer } from '../types';
import { 
  X, 
  Edit3, 
  Trash2, 
  Zap, 
  MapPin, 
  Building2, 
  Hash, 
  Tag, 
  CheckCircle, 
  Activity,
  Layers,
  FileSpreadsheet,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Move,
  Navigation,
  ExternalLink,
  Copy,
  Check,
  Compass
} from 'lucide-react';
import { 
  getGoogleMapsNavUrl, 
  getGoogleMapsViewUrl, 
  isValidLatLng, 
  formatLatLng 
} from '../utils/geoUtils';

interface TransformerDetailDrawerProps {
  transformer: Transformer | null;
  isReadOnly?: boolean;
  onClose: () => void;
  onEdit: (t: Transformer) => void;
  onDelete: (id: string) => void;
  onUpdatePosition?: (id: string, x: number, y: number) => void;
}

export const TransformerDetailDrawer: React.FC<TransformerDetailDrawerProps> = ({
  transformer,
  isReadOnly = false,
  onClose,
  onEdit,
  onDelete,
  onUpdatePosition
}) => {
  const [copied, setCopied] = React.useState(false);
  const [copiedGps, setCopiedGps] = React.useState(false);
  if (!transformer) return null;

  const hasGps = isValidLatLng(transformer.latitude, transformer.longitude);

  const handleCopyInfo = () => {
    const gpsStr = hasGps ? `\nพิกัด GPS: ${transformer.latitude}, ${transformer.longitude}` : '';
    const text = `PEA: ${transformer.peaNo}\nชื่อ: ${transformer.name}\nขนาด: ${transformer.kva} kVA\nประเภท: ${transformer.type === 'private' ? 'เฉพาะราย' : 'จำหน่ายทั่วไป'}\nสายป้อน: ${transformer.feeder || '-'}\nสาขา: ${transformer.branch || '-'}\nเลขเสา: ${transformer.poleNo || '-'}${gpsStr}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyGps = () => {
    if (!hasGps) return;
    navigator.clipboard.writeText(`${transformer.latitude}, ${transformer.longitude}`);
    setCopiedGps(true);
    setTimeout(() => setCopiedGps(false), 2000);
  };

  const handleNudge = (dx: number, dy: number) => {
    if (!onUpdatePosition) return;
    onUpdatePosition(transformer.id, transformer.x + dx, transformer.y + dy);
  };

  return (
    <div className="absolute top-16 right-4 z-30 w-84 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 animate-in fade-in slide-in-from-right-4 duration-200 text-slate-800 dark:text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              รายละเอียดหม้อแปลง
            </div>
            <div className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
              {transformer.peaNo}
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

      {/* Main Stats Badges */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50">
          <div className="text-[10px] font-semibold text-amber-800 dark:text-amber-300">ขนาดพิกัด</div>
          <div className="text-xl font-black text-amber-700 dark:text-amber-400 font-mono">
            {transformer.kva} <span className="text-xs font-normal">kVA</span>
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="text-[10px] font-semibold text-slate-500">ประเภท</div>
          <div className="text-xs font-bold mt-1 flex items-center gap-1.5">
            <svg width="14" height="12" viewBox="0 0 18 16">
              <polygon
                points="9,2 16,14 2,14"
                fill={transformer.type === 'private' ? '#0f172a' : '#ffffff'}
                stroke="#0f172a"
                strokeWidth="2"
              />
            </svg>
            <span className={transformer.type === 'private' ? 'text-purple-600' : 'text-slate-700 dark:text-slate-300'}>
              {transformer.type === 'private' ? 'เฉพาะราย' : 'จำหน่ายทั่วไป'}
            </span>
          </div>
        </div>
      </div>

      {/* Position Nudge Controls (Editor only) */}
      {!isReadOnly && onUpdatePosition && (
        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Move className="w-3.5 h-3.5 text-blue-500" />
              <span>ตำแหน่งพิกัดผัง</span>
            </span>
            <span className="font-mono text-slate-800 dark:text-slate-200">
              X: {transformer.x}, Y: {transformer.y}
            </span>
          </div>

          <div className="flex items-center justify-center gap-1.5 pt-1">
            <button
              onClick={() => handleNudge(-10, 0)}
              title="เลื่อนซ้าย (-10px)"
              className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleNudge(0, -10)}
                title="เลื่อนขึ้น (-10px)"
                className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleNudge(0, 10)}
                title="เลื่อนลง (+10px)"
                className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => handleNudge(10, 0)}
              title="เลื่อนขวา (+10px)"
              className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-center text-slate-400">
            *หรือคลิกลากตัวหม้อแปลงบนผังวงจรได้โดยตรง
          </p>
        </div>
      )}

      {/* GPS Coordinates & Navigation Card */}
      <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200/80 dark:border-blue-900/50 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-blue-900 dark:text-blue-200 font-bold text-xs">
            <Navigation className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>พิกัด GPS / แผนที่นำทาง</span>
          </div>
          {hasGps && (
            <button
              type="button"
              onClick={handleCopyGps}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-800 flex items-center gap-1 font-medium"
              title="คัดลอกพิกัด Lat, Long"
            >
              {copiedGps ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedGps ? 'คัดลอกแล้ว' : 'คัดลอกพิกัด'}</span>
            </button>
          )}
        </div>

        {hasGps ? (
          <div className="space-y-2">
            <div className="bg-white/80 dark:bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900/60 font-mono text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>{formatLatLng(transformer.latitude, transformer.longitude)}</span>
              <span className="text-[10px] text-slate-400 uppercase font-sans">WGS84</span>
            </div>

            {/* Navigation and View Buttons */}
            <div className="grid grid-cols-1 gap-1.5">
              <a
                href={getGoogleMapsNavUrl(transformer.latitude!, transformer.longitude!)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Navigation className="w-3.5 h-3.5 text-blue-200" />
                <span>นำทางด้วย Google Maps</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>

              <a
                href={getGoogleMapsViewUrl(transformer.latitude!, transformer.longitude!)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-1.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                <span>เปิดดูหมุดบนแผนที่</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center py-1">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
              ยังไม่ได้ระบุพิกัด Lat, Long
            </p>
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => onEdit(transformer)}
                className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-lg text-xs font-semibold border border-blue-200 dark:border-blue-800 transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                <MapPin className="w-3 h-3 text-blue-500" />
                <span>เพิ่มพิกัด GPS / แผนที่</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Info List */}
      <div className="space-y-2.5 text-xs">
        <div>
          <div className="text-slate-400 text-[11px]">ชื่อสถานที่ / ผู้ใช้ไฟ</div>
          <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
            {transformer.name}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <div>
            <div className="text-slate-400 text-[11px]">สายป้อน</div>
            <div className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">
              {transformer.feeder || 'ไลน์สวนดอก'}
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">สายแยก / กิ่ง</div>
            <div className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">
              {transformer.branch || '-'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <div>
            <div className="text-slate-400 text-[11px]">ระบบไฟ / แรงดัน</div>
            <div className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">
              {transformer.phase || '3P'} ({transformer.voltage || '22 kV'})
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">ทิศทางสัญลักษณ์</div>
            <div className="font-medium text-slate-700 dark:text-slate-300 mt-0.5 capitalize">
              {transformer.orientation || 'top'}
            </div>
          </div>
        </div>

        {transformer.notes && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
            <div className="text-slate-400 text-[11px]">หมายเหตุ</div>
            <div className="text-slate-600 dark:text-slate-300 italic text-[11px] mt-0.5">
              {transformer.notes}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
        {isReadOnly ? (
          <>
            <button
              type="button"
              onClick={handleCopyInfo}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Tag className="w-3.5 h-3.5" />}
              <span>{copied ? 'คัดลอกข้อมูลแล้ว' : 'คัดลอกข้อมูล PEA'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
            >
              ปิด
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onEdit(transformer)}
              className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>แก้ไขข้อมูล</span>
            </button>

            <button
              onClick={() => {
                if (confirm(`คุณต้องการลบหม้อแปลง ${transformer.peaNo} (${transformer.name}) หรือไม่?`)) {
                  onDelete(transformer.id);
                  onClose();
                }
              }}
              className="p-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 rounded-xl transition-colors"
              title="ลบหม้อแปลง"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
