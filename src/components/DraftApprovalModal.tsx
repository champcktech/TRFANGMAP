import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  AlertCircle, 
  ArrowRight, 
  X,
  Search,
  Filter,
  Layers,
  Zap,
  Check,
  ChevronRight,
  ShieldCheck,
  Eye
} from 'lucide-react';
import { TransformerDraft, DiagramSheet, Transformer } from '../types';
import { approveTransformerDraft, rejectTransformerDraft, deleteTransformerDraft } from '../services/firebaseDbService';

interface DraftApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  drafts: TransformerDraft[];
  sheets: DiagramSheet[];
  currentUser?: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
  } | null;
  onApproveAndApply: (draft: TransformerDraft) => Promise<void>;
  onNavigateToTransformer?: (sheetId: string, transformerId?: string, x?: number, y?: number) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const DraftApprovalModal: React.FC<DraftApprovalModalProps> = ({
  isOpen,
  onClose,
  drafts = [],
  sheets = [],
  currentUser,
  onApproveAndApply,
  onNavigateToTransformer,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [isRejectingId, setIsRejectingId] = useState<string | null>(null);
  const [confirmDeleteDraftId, setConfirmDeleteDraftId] = useState<string | null>(null);

  const isAdmin = !!currentUser;

  // Count by status
  const counts = useMemo(() => {
    return {
      pending: drafts.filter(d => d.status === 'pending').length,
      approved: drafts.filter(d => d.status === 'approved').length,
      rejected: drafts.filter(d => d.status === 'rejected').length,
      all: drafts.length
    };
  }, [drafts]);

  // Filtered drafts list
  const filteredDrafts = useMemo(() => {
    return drafts.filter(d => {
      if (activeTab !== 'all' && d.status !== activeTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const pea = d.transformerData?.peaNo?.toLowerCase() || '';
        const name = d.transformerData?.name?.toLowerCase() || '';
        const req = d.requesterName.toLowerCase();
        const note = d.requestNotes?.toLowerCase() || '';
        return pea.includes(q) || name.includes(q) || req.includes(q) || note.includes(q);
      }
      return true;
    });
  }, [drafts, activeTab, searchQuery]);

  const activeDraft = useMemo(() => {
    if (selectedDraftId) {
      return drafts.find(d => d.id === selectedDraftId) || filteredDrafts[0] || null;
    }
    return filteredDrafts[0] || null;
  }, [drafts, selectedDraftId, filteredDrafts]);

  if (!isOpen) return null;

  const handleApprove = async (draft: TransformerDraft) => {
    if (!isAdmin) {
      showToast('เฉพาะผู้ดูแลระบบที่เข้าสู่ระบบแล้วเท่านั้นที่สามารถอนุมัติได้', 'error');
      return;
    }

    setProcessingId(draft.id);
    try {
      await onApproveAndApply(draft);
      showToast(`อนุมัติแบบร่างเรียบร้อยแล้ว และอัปเดตข้อมูลลงในผังวงจร`, 'success');
    } catch (err: any) {
      console.error('Approve failed:', err);
      showToast('เกิดข้อผิดพลาดในการอนุมัติ: ' + (err.message || 'โปรดลองอีกครั้ง'), 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (draft: TransformerDraft) => {
    if (!isAdmin) {
      showToast('เฉพาะผู้ดูแลระบบที่เข้าสู่ระบบแล้วเท่านั้นที่สามารถปฏิเสธได้', 'error');
      return;
    }

    setProcessingId(draft.id);
    try {
      const adminEmail = currentUser?.email || currentUser?.displayName || 'admin';
      await rejectTransformerDraft(draft.id, adminEmail, rejectNote);
      setIsRejectingId(null);
      setRejectNote('');
      showToast(`ปฏิเสธแบบร่างเรียบร้อยแล้ว`, 'info');
    } catch (err: any) {
      console.error('Reject failed:', err);
      showToast('เกิดข้อผิดพลาดในการปฏิเสธ: ' + (err.message || 'โปรดลองอีกครั้ง'), 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (draftId: string) => {
    if (!isAdmin) return;

    setProcessingId(draftId);
    try {
      await deleteTransformerDraft(draftId);
      showToast('ลบรายการแบบร่างเรียบร้อยแล้ว', 'info');
      setConfirmDeleteDraftId(null);
      if (selectedDraftId === draftId) setSelectedDraftId(null);
    } catch (err: any) {
      console.error('Delete draft failed:', err);
      showToast('เกิดข้อผิดพลาดในการลบ: ' + (err.message || 'โปรดลองอีกครั้ง'), 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const getSheetName = (sheetId: string) => {
    const s = sheets.find(item => item.id === sheetId);
    return s ? `${s.sheetNo || ''} ${s.title || ''}`.trim() : sheetId;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full h-[88vh] max-h-[820px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-xs">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  ระบบตรวจสอบและอนุมัติแบบร่างหม้อแปลง
                </h2>
                {isAdmin ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>โหมดผู้ดูแลระบบ (Admin)</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>โหมดติดตามสถานะ (Viewer)</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isAdmin 
                  ? 'ตรวจสอบคำขอเพิ่มหรือแก้ไขหม้อแปลงจากบุคคลทั่วไปหรือช่างในพื้นที่ เพื่อกดยืนยันนำเข้าผังหลัก'
                  : 'ติดตามสถานะแบบร่างที่ส่งเข้าสู่ระบบ (ต้องเข้าสู่ระบบแอดมินเพื่อกดอนุมัติหรือปฏิเสธ)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Search Bar */}
        <div className="px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>รอการอนุมัติ</span>
              {counts.pending > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'pending' ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'}`}>
                  {counts.pending}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('approved')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'approved'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>อนุมัติแล้ว ({counts.approved})</span>
            </button>

            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'rejected'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>ปฏิเสธ ({counts.rejected})</span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              ทั้งหมด ({counts.all})
            </button>
          </div>

          {/* Search input */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหารหัส PEA, ชื่อ, ผู้เสนอ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Modal Main Content: Split Master-Detail */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          
          {/* Left Column: Drafts List (5 cols) */}
          <div className="md:col-span-5 border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-3 space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
            {filteredDrafts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <FileText className="w-10 h-10 mx-auto opacity-30" />
                <p className="font-semibold">ไม่พบรายการแบบร่างในหมวดนี้</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  เมื่อมีผู้ส่งแบบร่างเพิ่มหรือแก้ไขหม้อแปลง รายการจะแสดงขึ้นที่นี่แบบเรียลไทม์
                </p>
              </div>
            ) : (
              filteredDrafts.map((draft) => {
                const isSelected = activeDraft?.id === draft.id;
                const isCreate = draft.actionType === 'create';
                const dateStr = new Date(draft.createdAt).toLocaleString('th-TH', {
                  dateStyle: 'short',
                  timeStyle: 'short'
                });

                return (
                  <div
                    key={draft.id}
                    onClick={() => setSelectedDraftId(draft.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white dark:bg-slate-800 border-blue-500 dark:border-blue-500 shadow-md ring-1 ring-blue-500/30'
                        : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isCreate 
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                        }`}>
                          {isCreate ? '+ เพิ่มใหม่' : '✏️ ขอแก้ไข'}
                        </span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                          {draft.transformerData?.peaNo || 'ไม่ระบุ PEA'}
                        </span>
                      </div>

                      <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        draft.status === 'pending'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300'
                          : draft.status === 'approved'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300'
                      }`}>
                        {draft.status === 'pending' ? 'รออนุมัติ' : draft.status === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธ'}
                      </span>
                    </div>

                    <div className="text-slate-700 dark:text-slate-300 font-medium truncate mb-1">
                      {draft.transformerData?.name || '-'} ({draft.transformerData?.kva || 50} kVA)
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                      <span className="flex items-center gap-1 truncate max-w-[140px]">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{draft.requesterName}</span>
                      </span>
                      <span>{dateStr}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Detailed Diff & Approval Action (7 cols) */}
          <div className="md:col-span-7 overflow-y-auto p-5 bg-white dark:bg-slate-900 flex flex-col justify-between">
            {activeDraft ? (
              <div className="space-y-4">
                
                {/* Detail Header */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                        activeDraft.actionType === 'create'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300'
                      }`}>
                        {activeDraft.actionType === 'create' ? 'เสนอเพิ่มหม้อแปลงใหม่' : 'เสนอแก้ไขข้อมูลหม้อแปลง'}
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {activeDraft.transformerData?.peaNo}
                      </span>
                    </div>

                    <span className="text-slate-500 text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(activeDraft.createdAt).toLocaleString('th-TH')}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-slate-700/80">
                    <div>
                      <span className="text-slate-400">หน้าผังเป้าหมาย:</span>{' '}
                      <b className="text-slate-800 dark:text-slate-200">{getSheetName(activeDraft.sheetId)}</b>
                    </div>
                    <div>
                      <span className="text-slate-400">ผู้เสนอแบบร่าง:</span>{' '}
                      <b className="text-slate-800 dark:text-slate-200">{activeDraft.requesterName}</b>
                      {activeDraft.requesterContact && (
                        <span className="text-slate-500 ml-1">({activeDraft.requesterContact})</span>
                      )}
                    </div>
                  </div>

                  {activeDraft.requestNotes && (
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs">
                      <span className="font-bold">เหตุผล/หมายเหตุจากผู้เสนอ:</span> {activeDraft.requestNotes}
                    </div>
                  )}

                  {activeDraft.status !== 'pending' && (
                    <div className={`p-2 rounded-lg border text-xs ${
                      activeDraft.status === 'approved'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    }`}>
                      <b>{activeDraft.status === 'approved' ? '✅ อนุมัติแล้ว' : '❌ ปฏิเสธแล้ว'}</b> โดย {activeDraft.reviewedBy || 'แอดมิน'}
                      {activeDraft.reviewedAt && <span> เมื่อ {new Date(activeDraft.reviewedAt).toLocaleString('th-TH')}</span>}
                      {activeDraft.reviewNote && <p className="mt-0.5">หมายเหตุการพิจารณา: {activeDraft.reviewNote}</p>}
                    </div>
                  )}
                </div>

                {/* Diff Comparison or Spec Card */}
                {activeDraft.actionType === 'update' && activeDraft.originalData ? (
                  /* Side-by-side Diff View */
                  <div className="space-y-2">
                    <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                      <span>เปรียบเทียบข้อมูล (เดิม vs ที่ขอแก้ไข)</span>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-700">
                      <div className="grid grid-cols-12 bg-slate-100 dark:bg-slate-800 p-2 font-bold text-slate-500">
                        <div className="col-span-4">หัวข้อ</div>
                        <div className="col-span-4">ข้อมูลเดิมในผัง</div>
                        <div className="col-span-4">ข้อมูลที่เสนอแก้ไข</div>
                      </div>

                      {[
                        { label: 'รหัส PEA', oldVal: activeDraft.originalData.peaNo, newVal: activeDraft.transformerData.peaNo },
                        { label: 'ชื่อหม้อแปลง', oldVal: activeDraft.originalData.name, newVal: activeDraft.transformerData.name },
                        { label: 'ขนาด (kVA)', oldVal: activeDraft.originalData.kva ? `${activeDraft.originalData.kva} kVA` : '-', newVal: activeDraft.transformerData.kva ? `${activeDraft.transformerData.kva} kVA` : '-' },
                        { label: 'ประเภท', oldVal: activeDraft.originalData.type === 'public' ? 'กฟภ.' : 'ผู้ใช้ไฟ', newVal: activeDraft.transformerData.type === 'public' ? 'กฟภ.' : 'ผู้ใช้ไฟ' },
                        { label: 'เฟส', oldVal: activeDraft.originalData.phase || '-', newVal: activeDraft.transformerData.phase || '-' },
                        { label: 'หมายเลขเสา', oldVal: activeDraft.originalData.poleNo || '-', newVal: activeDraft.transformerData.poleNo || '-' },
                        { label: 'ระดับแรงดัน', oldVal: activeDraft.originalData.voltage || '-', newVal: activeDraft.transformerData.voltage || '-' },
                        { label: 'พิกัด GPS', oldVal: activeDraft.originalData.latitude ? `${activeDraft.originalData.latitude}, ${activeDraft.originalData.longitude}` : '-', newVal: activeDraft.transformerData.latitude ? `${activeDraft.transformerData.latitude}, ${activeDraft.transformerData.longitude}` : '-' },
                        { label: 'หมายเหตุ', oldVal: activeDraft.originalData.notes || '-', newVal: activeDraft.transformerData.notes || '-' }
                      ].map(row => {
                        const isChanged = String(row.oldVal || '') !== String(row.newVal || '');
                        return (
                          <div 
                            key={row.label} 
                            className={`grid grid-cols-12 p-2 items-center ${isChanged ? 'bg-amber-50/70 dark:bg-amber-950/20 font-semibold' : ''}`}
                          >
                            <div className="col-span-4 text-slate-500 font-medium">{row.label}</div>
                            <div className="col-span-4 text-slate-700 dark:text-slate-300 truncate pr-1">{row.oldVal || '-'}</div>
                            <div className={`col-span-4 truncate ${isChanged ? 'text-amber-700 dark:text-amber-300 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                              {row.newVal || '-'}
                              {isChanged && <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">แก้</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Single Spec Card (New Transformer) */
                  <div className="space-y-2">
                    <div className="font-bold text-slate-700 dark:text-slate-200">
                      รายละเอียดหม้อแปลงใหม่ที่ขอเพิ่ม
                    </div>

                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 bg-slate-50/60 dark:bg-slate-800/40 grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-400">รหัส PEA:</span>{' '}
                        <b className="font-mono text-slate-900 dark:text-slate-100">{activeDraft.transformerData.peaNo || '-'}</b>
                      </div>
                      <div>
                        <span className="text-slate-400">ชื่อหม้อแปลง:</span>{' '}
                        <b className="text-slate-900 dark:text-slate-100">{activeDraft.transformerData.name || '-'}</b>
                      </div>
                      <div>
                        <span className="text-slate-400">ขนาด:</span>{' '}
                        <b className="text-blue-600 dark:text-blue-400 font-bold">{activeDraft.transformerData.kva} kVA</b>
                      </div>
                      <div>
                        <span className="text-slate-400">ประเภท:</span>{' '}
                        <b>{activeDraft.transformerData.type === 'public' ? 'กฟภ. (จำหน่ายทั่วไป)' : 'ผู้ใช้ไฟ (เฉพาะราย)'}</b>
                      </div>
                      <div>
                        <span className="text-slate-400">ระบบเฟส:</span>{' '}
                        <b>{activeDraft.transformerData.phase || '3P'}</b>
                      </div>
                      <div>
                        <span className="text-slate-400">หมายเลขเสา:</span>{' '}
                        <b>{activeDraft.transformerData.poleNo || '-'}</b>
                      </div>
                      {activeDraft.transformerData.latitude && (
                        <div className="col-span-2">
                          <span className="text-slate-400">พิกัด GPS:</span>{' '}
                          <span className="font-mono">{activeDraft.transformerData.latitude}, {activeDraft.transformerData.longitude}</span>
                        </div>
                      )}
                      {activeDraft.transformerData.notes && (
                        <div className="col-span-2">
                          <span className="text-slate-400">หมายเหตุ:</span>{' '}
                          <span>{activeDraft.transformerData.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Reject Input Box if actively rejecting */}
                {isRejectingId === activeDraft.id && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-2">
                    <div className="font-bold text-rose-900 dark:text-rose-200">ระบุเหตุผลในการปฏิเสธแบบร่าง:</div>
                    <input
                      type="text"
                      placeholder="เช่น ข้อมูลซ้ำซ้อน, กรอกรหัส PEA ไม่ถูกต้อง, ติดต่อผู้ขอไม่ได้"
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setIsRejectingId(null)}
                        className="px-3 py-1 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                      <button
                        onClick={() => handleReject(activeDraft)}
                        disabled={processingId === activeDraft.id}
                        className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                      >
                        ยืนยันปฏิเสธ
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons for Admin */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {onNavigateToTransformer && (
                      <button
                        onClick={() => {
                          onNavigateToTransformer(
                            activeDraft.sheetId,
                            activeDraft.targetTransformerId,
                            activeDraft.transformerData.x,
                            activeDraft.transformerData.y
                          );
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        <span>ส่องตำแหน่งบนผัง</span>
                      </button>
                    )}

                    {isAdmin && (
                      confirmDeleteDraftId !== activeDraft.id ? (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteDraftId(activeDraft.id)}
                          disabled={processingId === activeDraft.id}
                          title="ลบรายการแบบร่างนี้"
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 animate-in fade-in duration-150">
                          <button
                            type="button"
                            onClick={() => handleDelete(activeDraft.id)}
                            disabled={processingId === activeDraft.id}
                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer active:scale-95 shadow-sm"
                          >
                            ยืนยันลบ
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteDraftId(null)}
                            className="px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      )
                    )}
                  </div>

                  {isAdmin && activeDraft.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setIsRejectingId(activeDraft.id);
                          setRejectNote('');
                        }}
                        disabled={processingId === activeDraft.id}
                        className="px-4 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950 font-bold transition-all cursor-pointer"
                      >
                        ปฏิเสธคำขอ
                      </button>
                      <button
                        onClick={() => handleApprove(activeDraft)}
                        disabled={processingId === activeDraft.id}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>{processingId === activeDraft.id ? 'กำลังอนุมัติ...' : 'อนุมัติและนำเข้าผังหลัก'}</span>
                      </button>
                    </div>
                  )}

                  {!isAdmin && activeDraft.status === 'pending' && (
                    <div className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>รอผู้ดูแลระบบตรวจสอบและอนุมัติ</span>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="text-center py-20 text-slate-400">
                เลือกแบบร่างจากรายการทางด้านซ้ายเพื่อดูรายละเอียด
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
