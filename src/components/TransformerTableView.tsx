import React, { useState, useMemo } from 'react';
import { Transformer, TransformerType } from '../types';
import { 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Edit3, 
  Download, 
  ArrowUpDown, 
  Eye, 
  CheckSquare, 
  Square,
  Zap,
  Building,
  Hash,
  MapPin,
  Navigation,
  ExternalLink,
  FileSpreadsheet
} from 'lucide-react';
import { downloadCsvFile } from '../services/googleSheetsService';
import { getGoogleMapsNavUrl, isValidLatLng, formatLatLng } from '../utils/geoUtils';

interface TransformerTableViewProps {
  transformers: Transformer[];
  isReadOnly?: boolean;
  sheetUrl?: string;
  onSelectTransformer: (t: Transformer) => void;
  onEditTransformer: (t: Transformer) => void;
  onDeleteTransformer: (id: string) => void;
  onDeleteMultiple?: (ids: string[]) => void;
  onAddNewTransformer: () => void;
  onSwitchToCanvasWithFocus: (t: Transformer) => void;
}

export const TransformerTableView: React.FC<TransformerTableViewProps> = ({
  transformers = [],
  isReadOnly = false,
  sheetUrl,
  onSelectTransformer,
  onEditTransformer,
  onDeleteTransformer,
  onDeleteMultiple,
  onAddNewTransformer,
  onSwitchToCanvasWithFocus
}) => {
  const [search, setSearch] = useState('');
  const [selectedKva, setSelectedKva] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<'all' | 'public' | 'private'>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof Transformer>('peaNo');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Distinct branches for filtering
  const branches = useMemo(() => {
    const set = new Set<string>();
    transformers.forEach(t => {
      if (t.branch) set.add(t.branch);
    });
    return Array.from(set);
  }, [transformers]);

  // Filter & Sort
  const filteredTransformers = useMemo(() => {
    return transformers
      .filter(t => {
        const matchesSearch = !search || 
          t.peaNo.toLowerCase().includes(search.toLowerCase()) ||
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          (t.notes && t.notes.toLowerCase().includes(search.toLowerCase())) ||
          (t.branch && t.branch.toLowerCase().includes(search.toLowerCase())) ||
          (t.latitude !== undefined && String(t.latitude).includes(search)) ||
          (t.longitude !== undefined && String(t.longitude).includes(search)) ||
          String(t.kva).includes(search);

        const matchesKva = selectedKva === null || t.kva === selectedKva;
        const matchesType = selectedType === 'all' || t.type === selectedType;
        const matchesBranch = selectedBranch === 'all' || t.branch === selectedBranch;

        return matchesSearch && matchesKva && matchesType && matchesBranch;
      })
      .sort((a, b) => {
        let valA = a[sortField] ?? '';
        let valB = b[sortField] ?? '';
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc
          ? String(valA).localeCompare(String(valB), 'th')
          : String(valB).localeCompare(String(valA), 'th');
      });
  }, [transformers, search, selectedKva, selectedType, selectedBranch, sortField, sortAsc]);

  const handleSort = (field: keyof Transformer) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredTransformers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransformers.map(t => t.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`คุณต้องการลบหม้อแปลงที่เลือกจำนวน ${selectedIds.size} รายการหรือไม่?`)) {
      if (onDeleteMultiple) {
        onDeleteMultiple(Array.from(selectedIds));
      } else {
        selectedIds.forEach(id => onDeleteTransformer(id));
      }
      setSelectedIds(new Set());
    }
  };

  const handleExportSelected = () => {
    const toExport = selectedIds.size > 0 
      ? transformers.filter(t => selectedIds.has(t.id))
      : filteredTransformers;
    downloadCsvFile(toExport, `transformers_export_${Date.now()}.csv`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[300px]">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหารหัส PEA, ชื่อสถานที่, ขนาด kVA, สายแยก..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value as any)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
          >
            <option value="all">ทุกประเภทหม้อแปลง</option>
            <option value="public">ทั่วไป (สามเหลี่ยมโปร่ง)</option>
            <option value="private">เฉพาะราย (สามเหลี่ยมทึบ)</option>
          </select>

          {/* kVA Filter */}
          <select
            value={selectedKva || ''}
            onChange={e => setSelectedKva(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
          >
            <option value="">ทุกขนาด kVA</option>
            <option value="30">30 kVA</option>
            <option value="50">50 kVA</option>
            <option value="100">100 kVA</option>
            <option value="160">160 kVA</option>
            <option value="250">250 kVA</option>
          </select>

          {/* Branch Filter */}
          {branches.length > 0 && (
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            >
              <option value="all">ทุกสายแยก</option>
              {branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!isReadOnly && selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="px-3 py-2 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ลบที่เลือก ({selectedIds.size})</span>
            </button>
          )}

          {!isReadOnly && transformers.length > 0 && (
            <button
              onClick={() => {
                if (confirm(`คุณต้องการลบหม้อแปลงทั้งหมดในหน้านี้ (${transformers.length} รายการ) ใช่หรือไม่?`)) {
                  if (onDeleteMultiple) {
                    onDeleteMultiple(transformers.map(t => t.id));
                  } else {
                    transformers.forEach(t => onDeleteTransformer(t.id));
                  }
                  setSelectedIds(new Set());
                }
              }}
              className="px-3 py-2 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ลบทั้งหมด ({transformers.length})</span>
            </button>
          )}

          <button
            onClick={handleExportSelected}
            className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออก CSV</span>
          </button>

          {!isReadOnly && (
            <button
              onClick={onAddNewTransformer}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มหม้อแปลง</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-3 w-10 text-center">
                <button
                  onClick={handleToggleSelectAll}
                  className="text-slate-400 hover:text-slate-700"
                >
                  {selectedIds.size > 0 && selectedIds.size === filteredTransformers.length ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="p-3 cursor-pointer hover:bg-slate-200/60 transition-colors" onClick={() => handleSort('peaNo')}>
                <div className="flex items-center gap-1 font-bold">
                  <span>รหัส PEA</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:bg-slate-200/60 transition-colors" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1 font-bold">
                  <span>ชื่อสถานที่ / ผู้ใช้ไฟ</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:bg-slate-200/60 transition-colors" onClick={() => handleSort('kva')}>
                <div className="flex items-center gap-1 font-bold">
                  <span>ขนาด (kVA)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:bg-slate-200/60 transition-colors" onClick={() => handleSort('type')}>
                <div className="flex items-center gap-1 font-bold">
                  <span>ประเภท</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3">
                <span className="font-bold">ระบบเฟส</span>
              </th>
              <th className="p-3 cursor-pointer hover:bg-slate-200/60 transition-colors" onClick={() => handleSort('branch')}>
                <div className="flex items-center gap-1 font-bold">
                  <span>สายป้อน / สายแยก</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3 text-center">
                <span className="font-bold">พิกัด GPS / นำทาง</span>
              </th>
              <th className="p-3 text-center">
                <span className="font-bold">พิกัดผัง (X, Y)</span>
              </th>
              <th className="p-3 text-right">
                <span className="font-bold">จัดการ</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            {filteredTransformers.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-400">
                  ไม่พบข้อมูลหม้อแปลงตามเงื่อนไขที่ค้นหา
                </td>
              </tr>
            ) : (
              filteredTransformers.map((t, idx) => {
                const isSelected = selectedIds.has(t.id);
                const hasGps = isValidLatLng(t.latitude, t.longitude);
                return (
                  <tr 
                    key={t.id} 
                    className={`hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-colors ${
                      isSelected ? 'bg-blue-50/70 dark:bg-blue-900/20' : idx % 2 === 1 ? 'bg-slate-50/40 dark:bg-slate-800/20' : ''
                    }`}
                  >
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleToggleSelect(t.id)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {t.peaNo}
                    </td>
                    <td className="p-3 font-medium text-slate-900 dark:text-white">
                      <div>{t.name}</div>
                      {t.notes && <div className="text-[10px] text-slate-400 italic">{t.notes}</div>}
                    </td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold">
                        {t.kva} kVA
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <svg width="14" height="12" viewBox="0 0 18 16">
                          <polygon
                            points="9,2 16,14 2,14"
                            fill={t.type === 'private' ? '#0f172a' : '#ffffff'}
                            stroke="#0f172a"
                            strokeWidth="2"
                          />
                        </svg>
                        <span className={`text-[11px] font-medium ${
                          t.type === 'private' ? 'text-purple-700 dark:text-purple-300' : 'text-slate-600 dark:text-slate-300'
                        }`}>
                          {t.type === 'private' ? 'เฉพาะราย' : 'ทั่วไป'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      {t.phase || '3P'} ({t.voltage || '22 kV'})
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      <div>{t.feeder || 'ไลน์สวนดอก'}</div>
                      {t.branch && <div className="text-[10px] text-slate-400">{t.branch}</div>}
                    </td>
                    <td className="p-3 text-center">
                      {hasGps ? (
                        <a
                          href={getGoogleMapsNavUrl(t.latitude!, t.longitude!)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`เปิดนำทาง Google Maps (${t.latitude}, ${t.longitude})`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold transition-colors shadow-2xs"
                        >
                          <Navigation className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          <span>นำทาง</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono text-[11px] text-slate-500">
                      ({t.x}, {t.y})
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onSwitchToCanvasWithFocus(t)}
                          title="ดูบนผังวงจร (Locate on Diagram)"
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {!isReadOnly && (
                          <>
                            <button
                              onClick={() => onEditTransformer(t)}
                              title="แก้ไขข้อมูล (Edit)"
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`คุณต้องการลบหม้อแปลง ${t.peaNo} (${t.name}) หรือไม่?`)) {
                                  onDeleteTransformer(t.id);
                                }
                              }}
                              title="ลบ (Delete)"
                              className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer Stats */}
      <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
        <div>
          แสดง <strong>{filteredTransformers.length}</strong> จากทั้งหมด <strong>{transformers.length}</strong> รายการหม้อแปลง
        </div>
        <div className="flex items-center gap-4">
          <div>
            รวมพิกัด: <strong className="text-slate-900 dark:text-white">
              {filteredTransformers.reduce((sum, t) => sum + (t.kva || 0), 0).toLocaleString()} kVA
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};
