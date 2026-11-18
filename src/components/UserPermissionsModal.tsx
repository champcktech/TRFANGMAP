import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  UserPlus,
  Trash2,
  Mail,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Edit3
} from 'lucide-react';
import { AuthorizedUser } from '../types';
import {
  SUPER_ADMIN_EMAIL,
  subscribeToAuthorizedUsers,
  addAuthorizedUser,
  updateAuthorizedUser,
  removeAuthorizedUser
} from '../services/firebaseDbService';

interface UserPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const UserPermissionsModal: React.FC<UserPermissionsModalProps> = ({
  isOpen,
  onClose,
  showToast
}) => {
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<'editor' | 'admin'>('editor');
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingList(true);
    setError(null);
    const unsub = subscribeToAuthorizedUsers(
      (list) => {
        setUsers(list);
        setLoadingList(false);
      },
      (err) => {
        setError(err?.message || 'ไม่สามารถโหลดรายชื่อผู้มีสิทธิ์ได้');
        setLoadingList(false);
      }
    );
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('กรุณากรอกอีเมลที่ถูกต้อง');
      return;
    }

    setSubmitting(true);
    try {
      await addAuthorizedUser({
        email: cleanEmail,
        displayName: newDisplayName.trim(),
        role: newRole
      });
      showToast(`เพิ่มสิทธิ์ให้ ${cleanEmail} เรียบร้อยแล้ว`, 'success');
      setNewEmail('');
      setNewDisplayName('');
      setNewRole('editor');
    } catch (err: any) {
      setError(err?.message || 'ไม่สามารถเพิ่มสิทธิ์ผู้ใช้งานได้');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (u: AuthorizedUser) => {
    setProcessingId(u.id);
    try {
      await updateAuthorizedUser(u.id, {
        displayName: u.displayName,
        role: u.role,
        active: !u.active
      });
      showToast(
        !u.active ? `เปิดสิทธิ์การใช้งานให้ ${u.email} แล้ว` : `ระงับสิทธิ์ ${u.email} ชั่วคราวแล้ว`,
        'info'
      );
    } catch (err: any) {
      showToast(err?.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleChangeRole = async (u: AuthorizedUser, role: 'admin' | 'editor') => {
    if (u.role === role) return;
    setProcessingId(u.id);
    try {
      await updateAuthorizedUser(u.id, {
        displayName: u.displayName,
        role,
        active: u.active
      });
      showToast(`เปลี่ยนบทบาทของ ${u.email} เป็น ${role === 'admin' ? 'Admin' : 'Editor'} แล้ว`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'เกิดข้อผิดพลาดในการเปลี่ยนบทบาท', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemove = async (u: AuthorizedUser) => {
    setProcessingId(u.id);
    try {
      await removeAuthorizedUser(u.id);
      showToast(`ถอนสิทธิ์ ${u.email} เรียบร้อยแล้ว`, 'info');
    } catch (err: any) {
      showToast(err?.message || 'เกิดข้อผิดพลาดในการถอนสิทธิ์', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                จัดการสิทธิ์ผู้ใช้งาน (Access Control)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                จำกัดสิทธิ์เฉพาะอีเมลที่อนุญาตให้เข้าสู่โหมดแก้ไขและบันทึกข้อมูล
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs">
          {/* Role Legend */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded-xl border border-purple-200 dark:border-purple-800/70 bg-purple-50/70 dark:bg-purple-950/30">
              <div className="font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                <span>Super Admin</span>
              </div>
              <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80 mt-0.5">
                จัดการทุกอย่าง + เพิ่ม/ถอนสิทธิ์ผู้ใช้ ({SUPER_ADMIN_EMAIL})
              </p>
            </div>
            <div className="p-2.5 rounded-xl border border-blue-200 dark:border-blue-800/70 bg-blue-50/70 dark:bg-blue-950/30">
              <div className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin</span>
              </div>
              <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80 mt-0.5">
                แก้ไขผัง ลบหน้าผัง และอนุมัติ/ลบแบบร่างได้ทั้งหมด
              </p>
            </div>
            <div className="p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/30">
              <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editor</span>
              </div>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                เพิ่ม/แก้ไขหม้อแปลง สายป้อน และอนุมัติแบบร่าง (ห้ามลบหน้าผัง)
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Add New Authorized Email Form */}
          <form
            onSubmit={handleAddUser}
            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 space-y-3"
          >
            <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-indigo-500" />
              <span>เพิ่มอีเมลเจ้าหน้าที่ที่มีสิทธิ์แก้ไข</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-5 relative">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="อีเมล Google หรือ Email ที่ยืนยันแล้ว"
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-4 relative">
                <UserIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="ชื่อ-ตำแหน่ง (ไม่บังคับ)"
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-3 flex gap-2">
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'editor' | 'admin')}
                  className="flex-1 px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1 shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'เพิ่ม'}
                </button>
              </div>
            </div>
          </form>

          {/* Authorized Users List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 dark:text-slate-100">
                รายชื่อผู้มีสิทธิ์เข้าใช้งาน ({users.length + 1} บัญชี)
              </h4>
            </div>

            {/* Pinned Super Admin Row */}
            <div className="p-3 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/40 dark:bg-purple-950/20 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                  <span>{SUPER_ADMIN_EMAIL}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white">
                    Super Admin
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  ผู้ดูแลระบบหลัก (ไม่สามารถลบหรือลดสิทธิ์ได้)
                </p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
            </div>

            {loadingList ? (
              <div className="py-8 flex items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังโหลดรายชื่อ...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="py-6 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                ยังไม่มีบัญชีเจ้าหน้าที่อื่นเพิ่มเติม (เข้าได้เฉพาะ Super Admin)
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => {
                  const isBusy = processingId === u.id;
                  return (
                    <div
                      key={u.id}
                      className={`p-3 rounded-xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 transition-all ${
                        u.active
                          ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/50 opacity-70'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                          <span>{u.email}</span>
                          {!u.active && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                              ระงับชั่วคราว
                            </span>
                          )}
                        </div>
                        {u.displayName && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {u.displayName}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={u.role}
                          disabled={isBusy}
                          onChange={(e) => handleChangeRole(u, e.target.value as 'admin' | 'editor')}
                          className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold text-[11px] cursor-pointer"
                        >
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </select>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleActive(u)}
                          className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] border cursor-pointer transition-colors ${
                            u.active
                              ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                              : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          }`}
                        >
                          {u.active ? 'ระงับสิทธิ์' : 'เปิดสิทธิ์'}
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRemove(u)}
                          title="ลบสิทธิ์บัญชีนี้ถาวร"
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer"
                        >
                          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold text-xs cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
