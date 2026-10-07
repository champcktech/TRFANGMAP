import React from 'react';
import { Transformer, SwitchNode } from '../types';
import { 
  Zap, 
  Layers, 
  Building2, 
  PieChart, 
  BarChart3, 
  ShieldCheck, 
  ArrowRight,
  TrendingUp,
  Cpu
} from 'lucide-react';

interface StatisticsPanelProps {
  transformers: Transformer[];
  switches: SwitchNode[];
  onSelectKvaFilter?: (kva: number | null) => void;
  onSelectTypeFilter?: (type: 'all' | 'public' | 'private') => void;
}

export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({
  transformers,
  switches,
  onSelectKvaFilter,
  onSelectTypeFilter
}) => {
  const totalKva = transformers.reduce((sum, t) => sum + (t.kva || 0), 0);
  const publicCount = transformers.filter(t => t.type === 'public').length;
  const privateCount = transformers.filter(t => t.type === 'private').length;
  const publicKva = transformers.filter(t => t.type === 'public').reduce((sum, t) => sum + (t.kva || 0), 0);
  const privateKva = transformers.filter(t => t.type === 'private').reduce((sum, t) => sum + (t.kva || 0), 0);

  // Group by kVA
  const kvaDistribution: { [key: number]: { count: number; totalKva: number } } = {};
  transformers.forEach(t => {
    const k = t.kva || 50;
    if (!kvaDistribution[k]) {
      kvaDistribution[k] = { count: 0, totalKva: 0 };
    }
    kvaDistribution[k].count += 1;
    kvaDistribution[k].totalKva += k;
  });

  const sortedKvaKeys = Object.keys(kvaDistribution)
    .map(Number)
    .sort((a, b) => a - b);

  // Group by branch
  const branchDistribution: { [key: string]: { count: number; totalKva: number } } = {};
  transformers.forEach(t => {
    const b = t.branch || 'สายเมนหลัก';
    if (!branchDistribution[b]) {
      branchDistribution[b] = { count: 0, totalKva: 0 };
    }
    branchDistribution[b].count += 1;
    branchDistribution[b].totalKva += (t.kva || 0);
  });

  const sortedBranches = Object.entries(branchDistribution)
    .sort((a, b) => b[1].totalKva - a[1].totalKva);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto overflow-y-auto h-full text-slate-800 dark:text-slate-200">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <span>สรุปภาพรวมและสถิติหม้อแปลง ไลน์สวนดอก</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          ข้อมูลวิเคราะห์โหลดรวม ขนาดพิกัด และการกระจายตัวของหม้อแปลงในระบบ
        </p>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total kVA */}
        <div className="p-5 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl shadow-md">
          <div className="flex items-center justify-between opacity-80 mb-2">
            <span className="text-xs font-semibold">พิกัดรวมทั้งหมด (Total Capacity)</span>
            <Zap className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight">
            {totalKva.toLocaleString()}
            <span className="text-sm font-normal ml-1">kVA</span>
          </div>
          <div className="text-[11px] opacity-75 mt-2">
            เฉลี่ย {(transformers.length ? Math.round(totalKva / transformers.length) : 0)} kVA ต่อลูก
          </div>
        </div>

        {/* Total Count */}
        <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">จำนวนหม้อแปลงทั้งหมด</span>
            <Layers className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {transformers.length}
            <span className="text-sm font-normal text-slate-500 ml-1">ลูก</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            สวิตช์และอุปกรณ์ตัดตอน {switches.length} จุด
          </div>
        </div>

        {/* Public Transformers */}
        <div 
          onClick={() => onSelectTypeFilter?.('public')}
          className="p-5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-500 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">จำหน่ายทั่วไป (Public)</span>
            <svg width="20" height="18" viewBox="0 0 18 16">
              <polygon points="9,2 16,14 2,14" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
            </svg>
          </div>
          <div className="text-3xl font-extrabold text-blue-600">
            {publicCount}
            <span className="text-sm font-normal text-slate-500 ml-1">ลูก</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            โหลดรวม {publicKva.toLocaleString()} kVA ({Math.round((publicKva / (totalKva || 1)) * 100)}%)
          </div>
        </div>

        {/* Private Transformers */}
        <div 
          onClick={() => onSelectTypeFilter?.('private')}
          className="p-5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-purple-500 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">เฉพาะราย (Private)</span>
            <svg width="20" height="18" viewBox="0 0 18 16">
              <polygon points="9,2 16,14 2,14" fill="#0f172a" stroke="#0f172a" strokeWidth="2" />
            </svg>
          </div>
          <div className="text-3xl font-extrabold text-purple-600">
            {privateCount}
            <span className="text-sm font-normal text-slate-500 ml-1">ลูก</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            โหลดรวม {privateKva.toLocaleString()} kVA ({Math.round((privateKva / (totalKva || 1)) * 100)}%)
          </div>
        </div>
      </div>

      {/* Grid: Distribution by kVA Size & Branches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: kVA Distribution */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-500" />
              <span>การกระจายตามขนาดพิกัด (kVA Distribution)</span>
            </h3>
            <span className="text-xs text-slate-400">คลิกเพื่อกรองข้อมูล</span>
          </div>

          <div className="space-y-3">
            {sortedKvaKeys.map(k => {
              const data = kvaDistribution[k];
              const pct = Math.round((data.count / (transformers.length || 1)) * 100);
              return (
                <div
                  key={k}
                  onClick={() => onSelectKvaFilter?.(k)}
                  className="group p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors border border-transparent hover:border-slate-200"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold font-mono">
                        {k} kVA
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {data.count} ลูก
                      </span>
                    </div>
                    <div className="text-slate-500">
                      รวม {data.totalKva.toLocaleString()} kVA ({pct}%)
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full group-hover:bg-amber-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 2: Branch Breakdown */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              <span>สรุปตามสายแยก / พื้นที่ (Branch Analysis)</span>
            </h3>
          </div>

          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {sortedBranches.map(([branchName, info]) => {
              const pct = Math.round((info.totalKva / (totalKva || 1)) * 100);
              return (
                <div key={branchName} className="p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {branchName || 'สายเมน'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{info.count} ลูก</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {info.totalKva.toLocaleString()} kVA
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
