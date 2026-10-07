import React, { useState, useMemo, useEffect } from 'react';
import { DiagramSheet } from '../types';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Eye, 
  QrCode, 
  ExternalLink, 
  ShieldCheck, 
  FileText, 
  Smartphone,
  Globe,
  Download,
  Upload,
  Layers,
  Link2,
  Sparkles,
  Loader2
} from 'lucide-react';
import { encodeSheetsToUrlHash } from '../utils/shareUtils';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheets?: DiagramSheet[];
  activeSheetId?: string;
  sheetId?: string;
  sheetTitle?: string;
  onEnterViewerMode?: () => void;
  onImportSheets?: (sheets: DiagramSheet[]) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  sheets = [],
  activeSheetId,
  sheetId,
  sheetTitle,
  onEnterViewerMode,
  onImportSheets
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedShort, setCopiedShort] = useState(false);
  const [shareScope, setShareScope] = useState<'all' | 'current'>('all');
  // includeFullData is false by default so link is clean and short
  const [includeFullData, setIncludeFullData] = useState(false);
  const [showQrCode, setShowQrCode] = useState(true);

  // Shortener states
  const [tinyUrl, setTinyUrl] = useState<string>('');
  const [isShortening, setIsShortening] = useState(false);
  const [shortenError, setShortenError] = useState<string | null>(null);

  const effectiveActiveSheetId = activeSheetId || sheetId || '';

  const activeSheet = useMemo(() => {
    if (!sheets || sheets.length === 0) {
      return { id: effectiveActiveSheetId, title: sheetTitle || '', sheetNo: '' };
    }
    return sheets.find(s => s.id === effectiveActiveSheetId) || sheets[0];
  }, [sheets, effectiveActiveSheetId, sheetTitle]);

  // Clean, short shareable URL
  const cleanShareUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const params = new URLSearchParams();
    params.set('mode', 'view');

    if (shareScope === 'current' && activeSheet?.id) {
      params.set('sheet', activeSheet.id);
    }

    return `${origin}${pathname}?${params.toString()}`;
  }, [shareScope, activeSheet]);

  // Full shareable URL (with optional embedded data hash if user specifically toggles it)
  const shareableUrl = useMemo(() => {
    if (!includeFullData) return cleanShareUrl;

    let hash = '';
    if (sheets.length > 0) {
      const targetSheets = shareScope === 'current' && activeSheet 
        ? [activeSheet as DiagramSheet] 
        : sheets;
      const encoded = encodeSheetsToUrlHash(targetSheets, activeSheet?.id);
      if (encoded) {
        hash = `#data=${encoded}`;
      }
    }

    return `${cleanShareUrl}${hash}`;
  }, [cleanShareUrl, includeFullData, sheets, shareScope, activeSheet]);

  // Reset tinyUrl when scope or url changes
  useEffect(() => {
    setTinyUrl('');
    setShortenError(null);
  }, [cleanShareUrl]);

  // Generate QR Code using the clean short URL (much faster and easier to scan)
  const qrCodeUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(cleanShareUrl)}&bgcolor=ffffff&color=1e3a8a&margin=1`;
  }, [cleanShareUrl]);

  if (!isOpen) return null;

  const copyToClipboard = async (text: string, isShort = false) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      if (isShort) {
        setCopiedShort(true);
        setTimeout(() => setCopiedShort(false), 2500);
      } else {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  };

  const handleOpenInNewTab = (urlToOpen: string) => {
    window.open(urlToOpen, '_blank');
  };

  // One-click TinyURL generator
  const handleGenerateTinyUrl = async () => {
    setIsShortening(true);
    setShortenError(null);
    try {
      // Use TinyURL API
      const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(cleanShareUrl)}`);
      if (response.ok) {
        const short = await response.text();
        if (short && short.startsWith('http')) {
          setTinyUrl(short.trim());
          copyToClipboard(short.trim(), true);
          setIsShortening(false);
          return;
        }
      }
      throw new Error('TinyURL response error');
    } catch (err) {
      console.warn('TinyURL fetch direct failed, trying fallback shortener...', err);
      // Fallback: try is.gd
      try {
        const fallbackRes = await fetch(`https://is.gd/create.php?format=json&url=${encodeURIComponent(cleanShareUrl)}`);
        const json = await fallbackRes.json();
        if (json && json.shorturl) {
          setTinyUrl(json.shorturl);
          copyToClipboard(json.shorturl, true);
          setIsShortening(false);
          return;
        }
      } catch (fallbackErr) {
        console.error('All shortener services unreachable', fallbackErr);
      }
      setShortenError('ไม่สามารถเชื่อมต่อบริการย่อลิงก์ได้ สามารถใช้ "ลิงก์สั้นมาตรฐาน" ด้านบนได้ทันที');
      setIsShortening(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = JSON.stringify({
      appName: 'ผังหม้อแปลง กฟส.ฝาง',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      sheets
    }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pea_fang_all_sheets_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const importedSheets = Array.isArray(parsed) ? parsed : (parsed.sheets || []);
        if (Array.isArray(importedSheets) && importedSheets.length > 0) {
          if (onImportSheets) {
            onImportSheets(importedSheets);
            onClose();
          }
        } else {
          alert('รูปแบบไฟล์ JSON ไม่ถูกต้อง หรือไม่พบข้อมูลหน้าผัง');
        }
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ JSON');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-sm">
              <Share2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">แชร์ลิงก์เปิดดูผังวงจร (โหมดแสดงอย่างเดียว)</h3>
              <p className="text-[11px] text-blue-100">ส่งต่อให้เจ้าหน้าที่เปิดดู สลับหน้าผัง ตรวจสอบข้อมูล และพิมพ์ได้</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Security Notice Card */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
              <div className="font-semibold">ความปลอดภัย: ลิงก์โหมดแสดงอย่างเดียว (Read-Only)</div>
              <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                ผู้รับจะเปิดดูผังวงจรและสลับดูได้ทุกหน้า แต่จะไม่สามารถแก้ไขหรือลบข้อมูลในระบบได้
              </p>
            </div>
          </div>

          {/* Scope Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              ตัวเลือกขอบเขตการแชร์
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShareScope('all')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  shareScope === 'all'
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-500 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>ผังทั้งหมด ({sheets.length} หน้า)</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  ผู้รับสลับดูได้ทุกหน้าผัง
                </div>
              </button>

              <button
                type="button"
                onClick={() => setShareScope('current')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  shareScope === 'current'
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-500 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>เฉพาะหน้า {activeSheet?.sheetNo || '(1)'}</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {activeSheet?.title || 'หน้าปัจจุบัน'}
                </div>
              </button>
            </div>
          </div>

          {/* Primary Short Link Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-blue-600" />
                <span>ลิงก์สั้นมาตรฐาน (Clean Short URL)</span>
              </label>
              {copied && (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> คัดลอกแล้ว
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareableUrl}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 font-mono focus:outline-none select-all"
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <button
                type="button"
                onClick={() => copyToClipboard(shareableUrl, false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
              <span>ความยาว: {shareableUrl.length} ตัวอักษร (สั้นกระชับ ส่งใน LINE ได้ทันที)</span>
              <button
                type="button"
                onClick={() => handleOpenInNewTab(shareableUrl)}
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
              >
                <span>เปิดทดสอบ</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* TinyURL Generator Button & Box */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>ย่อลิงก์ให้สั้นลงอีก (TinyURL)</span>
              </div>
              {!tinyUrl && (
                <button
                  type="button"
                  onClick={handleGenerateTinyUrl}
                  disabled={isShortening}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                >
                  {isShortening ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  <span>{isShortening ? 'กำลังย่อลิงก์...' : 'กดสร้างลิงก์ย่อ TinyURL'}</span>
                </button>
              )}
            </div>

            {tinyUrl && (
              <div className="flex items-center gap-2 pt-1 animate-in fade-in">
                <input
                  type="text"
                  readOnly
                  value={tinyUrl}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 font-mono font-bold select-all focus:outline-none"
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(tinyUrl, true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                    copiedShort
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                >
                  {copiedShort ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedShort ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                </button>
              </div>
            )}

            {shortenError && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400">{shortenError}</p>
            )}
          </div>

          {/* QR Code Section */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/40">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <QrCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>QR Code สแกนผ่านกล้องหรือ LINE บนมือถือ</span>
              </div>
              <button
                type="button"
                onClick={() => setShowQrCode(!showQrCode)}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
              >
                {showQrCode ? 'ซ่อน QR' : 'แสดง QR'}
              </button>
            </div>

            {showQrCode && (
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                <div className="w-28 h-28 bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code for View-Only Link"
                    className="w-full h-full object-contain rounded-lg"
                    loading="lazy"
                  />
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 text-center sm:text-left flex-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-center sm:justify-start gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                    <span>เปิดดูหน้างานได้ทันที</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    สแกน QR Code เพื่อเปิดดูผัง Single Line Diagram และคลิกดูพิกัดหม้อแปลงเพื่อกดนำทาง Google Maps ได้ทันที
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Advanced toggle for offline payload */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeFullData}
                onChange={e => setIncludeFullData(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span className="text-[11px] text-slate-600 dark:text-slate-400">
                แนบข้อมูลผังสำรองแบบเต็มลงในลิงก์ (URL Hash Data - ลิงก์จะยาวขึ้น เหมาะสำหรับส่งข้อมูลสดข้ามเครื่อง)
              </span>
            </label>
          </div>

          {/* Backup / Export / Import Section */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-400" />
              <span>สำรองข้อมูลเป็นไฟล์:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer text-xs"
                title="ดาวน์โหลดไฟล์สำรองข้อมูลผังทุกหน้าเป็น JSON"
              >
                <Download className="w-3 h-3 text-slate-500" />
                <span>ส่งออก JSON</span>
              </button>

              <label className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer text-xs">
                <Upload className="w-3 h-3 text-slate-500" />
                <span>นำเข้า JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            ปิด
          </button>

          <div className="flex items-center gap-2">
            {onEnterViewerMode && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEnterViewerMode();
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5 transition-all shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>เข้าสู่โหมดแสดงผล</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
