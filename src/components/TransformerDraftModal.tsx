import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Send, 
  X, 
  Zap, 
  User, 
  Phone, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle,
  MapPin,
  Sparkles
} from 'lucide-react';
import { Transformer, TransformerType } from '../types';
import { submitTransformerDraft } from '../services/firebaseDbService';

interface TransformerDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetId: string;
  sheetTitle?: string;
  actionType: 'create' | 'update';
  initialTransformer?: Transformer | null;
  proposedPosition?: { x: number; y: number };
  onDraftSubmitted?: (draftId: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TransformerDraftModal: React.FC<TransformerDraftModalProps> = ({
  isOpen,
  onClose,
  sheetId,
  sheetTitle = 'ผังวงจร',
  actionType,
  initialTransformer,
  proposedPosition,
  onDraftSubmitted,
  showToast
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Requester fields
  const [requesterName, setRequesterName] = useState(() => {
    try {
      return localStorage.getItem('last_draft_requester_name') || '';
    } catch {
      return '';
    }
  });
  const [requesterContact, setRequesterContact] = useState(() => {
    try {
      return localStorage.getItem('last_draft_requester_contact') || '';
    } catch {
      return '';
    }
  });
  const [requestNotes, setRequestNotes] = useState('');

  // Transformer fields
  const [peaNo, setPeaNo] = useState('');
  const [name, setName] = useState('');
  const [kva, setKva] = useState<number>(50);
  const [type, setType] = useState<TransformerType>('public');
  const [phase, setPhase] = useState<'1P' | '2x1P' | '3P' | 'AC'>('3P');
  const [poleNo, setPoleNo] = useState('');
  const [voltage, setVoltage] = useState('22 kV');
  const [notes, setNotes] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [orientation, setOrientation] = useState<'left' | 'right' | 'top' | 'bottom'>('right');

  // Reset or initialize values when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (actionType === 'update' && initialTransformer) {
      setPeaNo(initialTransformer.peaNo || '');
      setName(initialTransformer.name || '');
      setKva(initialTransformer.kva || 50);
      setType(initialTransformer.type || 'public');
      setPhase(initialTransformer.phase || '3P');
      setPoleNo(initialTransformer.poleNo || '');
      setVoltage(initialTransformer.voltage || '22 kV');
      setNotes(initialTransformer.notes || '');
      setLatitude(initialTransformer.latitude !== undefined ? String(initialTransformer.latitude) : '');
      setLongitude(initialTransformer.longitude !== undefined ? String(initialTransformer.longitude) : '');
      setOrientation(initialTransformer.orientation || 'right');
      setRequestNotes('');
    } else {
      // Create new draft
      setPeaNo('');
      setName('');
      setKva(50);
      setType('public');
      setPhase('3P');
      setPoleNo('');
      setVoltage('22 kV');
      setNotes('');
      setLatitude('');
      setLongitude('');
      setOrientation('right');
      setRequestNotes('');
    }
  }, [isOpen, actionType, initialTransformer]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requesterName.trim()) {
      showToast('กรุณาระบุชื่อผู้เสนอแบบร่าง', 'error');
      return;
    }

    if (!peaNo.trim() && !name.trim()) {
      showToast('กรุณากรอกรหัส PEA หรือ ชื่อหม้อแปลง', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // Save requester name & contact for convenience next time
      try {
        localStorage.setItem('last_draft_requester_name', requesterName.trim());
        if (requesterContact.trim()) {
          localStorage.setItem('last_draft_requester_contact', requesterContact.trim());
        }
      } catch {}

      const parsedLat = latitude.trim() ? parseFloat(latitude.trim()) : undefined;
      const parsedLng = longitude.trim() ? parseFloat(longitude.trim()) : undefined;

      const posX = proposedPosition?.x ?? (initialTransformer?.x ?? 500);
      const posY = proposedPosition?.y ?? (initialTransformer?.y ?? 500);

      const transformerData: Partial<Transformer> = {
        peaNo: peaNo.trim(),
        name: name.trim() || peaNo.trim(),
        kva: Number(kva) || 50,
        type,
        phase,
        poleNo: poleNo.trim(),
        voltage: voltage.trim(),
        notes: notes.trim(),
        x: posX,
        y: posY,
        orientation,
        ...(parsedLat && !isNaN(parsedLat) ? { latitude: parsedLat } : {}),
        ...(parsedLng && !isNaN(parsedLng) ? { longitude: parsedLng } : {})
      };

      const draftId = await submitTransformerDraft({
        sheetId,
        actionType,
        targetTransformerId: actionType === 'update' ? initialTransformer?.id : undefined,
        transformerData,
        originalData: actionType === 'update' && initialTransformer ? initialTransformer : undefined,
        requesterName: requesterName.trim(),
        requesterContact: requesterContact.trim() || undefined,
        requestNotes: requestNotes.trim() || undefined
      });

      showToast('ส่งแบบร่างหม้อแปลงเรียบร้อยแล้ว! ผู้ดูแลระบบจะตรวจสอบและยืนยันข้อมูลต่อไป', 'success');
      onDraftSubmitted?.(draftId);
      onClose();
    } catch (err: any) {
      console.error('Failed to submit draft:', err);
      showToast('เกิดข้อผิดพลาดในการส่งแบบร่าง: ' + (err.message || 'โปรดลองอีกครั้ง'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-amber-500/10 dark:bg-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>{actionType === 'create' ? 'เสนอเพิ่มหม้อแปลงใหม่ (แบบร่าง)' : 'เสนอแก้ไขข้อมูลหม้อแปลง (แบบร่าง)'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  รออนุมัติ
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                หน้าผัง: <b className="text-slate-700 dark:text-slate-300 font-semibold">{sheetTitle}</b>
                {actionType === 'update' && initialTransformer && (
                  <span> • หม้อแปลงเดิม: <b className="text-blue-600 dark:text-blue-400">{initialTransformer.peaNo} {initialTransformer.name}</b></span>
                )}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Banner */}
        <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200/80 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <b>โหมดส่งแบบร่าง (Draft Proposal):</b> ข้อมูลที่คุณกรอกจะถูกส่งไปยังคิวตรวจสอบ ผู้ดูแลระบบ (Admin) สามารถตรวจสอบ เปรียบเทียบข้อมูล และกดยืนยันเพื่อนำเข้าสู่ผังวงจรหลักได้ทันที
          </div>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          
          {/* Section 1: ข้อมูลผู้เสนอ */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200 text-[13px]">
              <User className="w-4 h-4 text-blue-600" />
              <span>ข้อมูลผู้เสนอแบบร่าง (Requester Info)</span>
              <span className="text-rose-500">*</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  ชื่อ-นามสกุล / ผู้แจ้ง <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สมชาย ใจดี, ช่างแผนกมิเตอร์"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  เบอร์โทรศัพท์ หรือ แผนก/สังกัด
                </label>
                <input
                  type="text"
                  placeholder="เช่น 081-234-5678 หรือ แผนกปฏิบัติการ"
                  value={requesterContact}
                  onChange={(e) => setRequesterContact(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                เหตุผลหรือรายละเอียดการขอเพิ่ม/แก้ไข
              </label>
              <textarea
                rows={2}
                placeholder="เช่น ขอเปลี่ยนขนาดหม้อแปลงจาก 50 เป็น 100 kVA ตามใบคำขอ, ติดตั้งหม้อแปลงลูกใหม่หน้าโรงพยาบาล"
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Section 2: ข้อมูลหม้อแปลงที่เสนอ */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200 text-[13px]">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>ข้อมูลหม้อแปลงที่เสนอ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  รหัส PEA No. <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น 54-003396, 66-001009"
                  value={peaNo}
                  onChange={(e) => setPeaNo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  ชื่อหม้อแปลง / สถานที่
                </label>
                <input
                  type="text"
                  placeholder="เช่น สวนดอก 1, กฟส.ฝาง"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  ขนาด (kVA)
                </label>
                <select
                  value={kva}
                  onChange={(e) => setKva(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[10, 15, 20, 25, 30, 45, 50, 75, 100, 160, 250, 315, 400, 500, 1000, 1250, 1500, 2000, 2500].map(val => (
                    <option key={val} value={val}>{val} kVA</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  ประเภทหม้อแปลง
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as TransformerType)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="public">กฟภ. (จำหน่ายทั่วไป)</option>
                  <option value="private">ผู้ใช้ไฟ (เฉพาะราย)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  ระบบเฟส
                </label>
                <select
                  value={phase}
                  onChange={(e) => setPhase(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1P">1P (1 เฟส)</option>
                  <option value="2x1P">2x1P (เปิด 2 ตัว)</option>
                  <option value="3P">3P (3 เฟส)</option>
                  <option value="AC">AC</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  หมายเลขเสา (Pole No.)
                </label>
                <input
                  type="text"
                  placeholder="เช่น 12/4, A-42"
                  value={poleNo}
                  onChange={(e) => setPoleNo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  ระดับแรงดัน
                </label>
                <input
                  type="text"
                  placeholder="22 kV"
                  value={voltage}
                  onChange={(e) => setVoltage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  ละติจูด (Lat)
                </label>
                <input
                  type="text"
                  placeholder="เช่น 19.917456"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  ลองจิจูด (Long)
                </label>
                <input
                  type="text"
                  placeholder="เช่น 99.214532"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                หมายเหตุเพิ่มเติมเกี่ยวกับหม้อแปลง
              </label>
              <input
                type="text"
                placeholder="เช่น เปลี่ยนหม้อแปลงวันที่ 15 ต.ค. 67, ชำรุดระหว่างพายุ"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'กำลังส่งแบบร่าง...' : 'ส่งแบบร่างให้ผู้ดูแลระบบตรวจสอบ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
