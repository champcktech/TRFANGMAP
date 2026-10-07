import React, { useState, useEffect } from 'react';
import { Transformer, TransformerType } from '../types';
import { 
  X, 
  Save, 
  Trash2, 
  Zap, 
  MapPin, 
  Hash, 
  Building2, 
  AlignLeft, 
  Compass, 
  Navigation, 
  LocateFixed, 
  ExternalLink, 
  Check, 
  ClipboardPaste,
  Info
} from 'lucide-react';
import { 
  parseLatLngInput, 
  getGoogleMapsNavUrl, 
  getGoogleMapsViewUrl, 
  getCurrentDeviceLocation, 
  isValidLatLng 
} from '../utils/geoUtils';

interface TransformerModalProps {
  isOpen: boolean;
  transformer: Transformer | null;
  defaultPosition?: { x: number; y: number };
  onClose: () => void;
  onSave: (transformer: Transformer) => void;
  onDelete?: (id: string) => void;
}

const COMMON_KVA_OPTIONS = [30, 50, 100, 160, 250, 315, 500, 1000];

export const TransformerModal: React.FC<TransformerModalProps> = ({
  isOpen,
  transformer,
  defaultPosition,
  onClose,
  onSave,
  onDelete
}) => {
  const [formData, setFormData] = useState<Partial<Transformer>>({
    peaNo: '',
    name: '',
    kva: 50,
    type: 'public',
    phase: '3P',
    voltage: '22 kV',
    feeder: 'ไลน์สวนดอก',
    branch: 'สายเมน เชียงใหม่-ฝาง',
    x: 400,
    y: 400,
    orientation: 'left',
    notes: '',
    latitude: undefined,
    longitude: undefined
  });

  const [rawGpsInput, setRawGpsInput] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (transformer) {
      setFormData(transformer);
      if (transformer.latitude && transformer.longitude) {
        setRawGpsInput(`${transformer.latitude}, ${transformer.longitude}`);
      } else {
        setRawGpsInput('');
      }
    } else {
      setFormData({
        id: `tr-${Date.now()}`,
        peaNo: '',
        name: '',
        kva: 50,
        type: 'public',
        phase: '3P',
        voltage: '22 kV',
        feeder: 'ไลน์สวนดอก',
        branch: 'สายเมน เชียงใหม่-ฝาง',
        x: defaultPosition?.x || 400,
        y: defaultPosition?.y || 400,
        orientation: 'left',
        notes: '',
        latitude: undefined,
        longitude: undefined
      });
      setRawGpsInput('');
    }
    setGpsMessage(null);
    setErrors({});
  }, [transformer, defaultPosition, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.peaNo?.trim()) {
      newErrors.peaNo = 'กรุณาระบุรหัสหม้อแปลง (PEA No.) เช่น 54-003396';
    }
    if (!formData.name?.trim()) {
      newErrors.name = 'กรุณาระบุชื่อสถานที่ หรือผู้ใช้ไฟ';
    }
    if (!formData.kva || formData.kva <= 0) {
      newErrors.kva = 'กรุณาระบุขนาด kVA ที่ถูกต้อง';
    }
    if (formData.latitude !== undefined && formData.latitude !== null && !isNaN(formData.latitude)) {
      if (formData.latitude < -90 || formData.latitude > 90) {
        newErrors.latitude = 'ค่าละติจูดต้องอยู่ระหว่าง -90 ถึง 90';
      }
    }
    if (formData.longitude !== undefined && formData.longitude !== null && !isNaN(formData.longitude)) {
      if (formData.longitude < -180 || formData.longitude > 180) {
        newErrors.longitude = 'ค่าลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleParseGps = (text: string) => {
    setRawGpsInput(text);
    if (!text.trim()) {
      setFormData(prev => ({ ...prev, latitude: undefined, longitude: undefined }));
      setGpsMessage(null);
      return;
    }

    const parsed = parseLatLngInput(text);
    if (parsed && parsed.latitude !== undefined && parsed.longitude !== undefined) {
      setFormData(prev => ({
        ...prev,
        latitude: parsed.latitude,
        longitude: parsed.longitude
      }));
      setGpsMessage({
        type: 'success',
        text: `แปลงพิกัดสำเร็จ: Lat ${parsed.latitude.toFixed(6)}, Long ${parsed.longitude.toFixed(6)}`
      });
    } else {
      setGpsMessage({
        type: 'info',
        text: 'วางพิกัด เช่น 19.917456, 99.214532 หรือลิงก์จาก Google Maps'
      });
    }
  };

  const handleFetchCurrentLocation = async () => {
    setIsLocating(true);
    setGpsMessage({ type: 'info', text: 'กำลังดึงพิกัด GPS ปัจจุบันจากอุปกรณ์...' });
    try {
      const loc = await getCurrentDeviceLocation();
      setFormData(prev => ({
        ...prev,
        latitude: Number(loc.latitude.toFixed(6)),
        longitude: Number(loc.longitude.toFixed(6))
      }));
      setRawGpsInput(`${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`);
      setGpsMessage({
        type: 'success',
        text: `ดึงพิกัดปัจจุบันสำเร็จ: ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`
      });
    } catch (err: any) {
      setGpsMessage({
        type: 'error',
        text: err.message || 'ไม่สามารถดึงตำแหน่งได้'
      });
    } finally {
      setIsLocating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const lat = formData.latitude !== undefined && formData.latitude !== null && !isNaN(Number(formData.latitude)) 
      ? Number(formData.latitude) 
      : undefined;
    const lng = formData.longitude !== undefined && formData.longitude !== null && !isNaN(Number(formData.longitude)) 
      ? Number(formData.longitude) 
      : undefined;

    const payload: Transformer = {
      id: formData.id || `tr-${Date.now()}`,
      peaNo: formData.peaNo!.trim(),
      name: formData.name!.trim(),
      kva: Number(formData.kva) || 50,
      type: (formData.type as TransformerType) || 'public',
      phase: formData.phase || '3P',
      voltage: formData.voltage || '22 kV',
      feeder: formData.feeder?.trim() || 'ไลน์สวนดอก',
      branch: formData.branch?.trim() || '',
      x: Number(formData.x) || 400,
      y: Number(formData.y) || 400,
      orientation: formData.orientation || 'left',
      notes: formData.notes?.trim() || '',
      latitude: lat,
      longitude: lng
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {transformer ? 'แก้ไขข้อมูลหม้อแปลง' : 'เพิ่มหม้อแปลงใหม่'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ผังหม้อแปลง PEA ไลน์สวนดอก / เชียงใหม่-ฝาง
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Row 1: PEA No & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-blue-500" />
                <span>รหัสหม้อแปลง (PEA No.) *</span>
              </label>
              <input
                type="text"
                value={formData.peaNo || ''}
                onChange={e => setFormData({ ...formData, peaNo: e.target.value })}
                placeholder="เช่น 54-003396 หรือ 61-009154"
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                  errors.peaNo 
                    ? 'border-red-500 focus:ring-red-200' 
                    : 'border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-200'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 font-mono`}
              />
              {errors.peaNo && <p className="text-xs text-red-500 mt-1">{errors.peaNo}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                <span>ชื่อสถานที่ / ผู้ใช้ไฟ *</span>
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="เช่น สวนดอก 1, สำนักงานฝาง, 7-11"
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                  errors.name 
                    ? 'border-red-500 focus:ring-red-200' 
                    : 'border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-200'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
          </div>

          {/* Row 2: kVA Capacity & Type (Public vs Private) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>ขนาดพิกัด (kVA) *</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formData.kva || ''}
                  onChange={e => setFormData({ ...formData, kva: Number(e.target.value) })}
                  className="w-28 px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 font-bold"
                />
                <div className="flex-1 flex flex-wrap gap-1">
                  {COMMON_KVA_OPTIONS.slice(0, 5).map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setFormData({ ...formData, kva: size })}
                      className={`px-2 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                        formData.kva === size
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              {errors.kva && <p className="text-xs text-red-500 mt-1">{errors.kva}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ประเภทหม้อแปลง (สัญลักษณ์) *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  formData.type === 'public'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}>
                  <input
                    type="radio"
                    name="type"
                    value="public"
                    checked={formData.type === 'public'}
                    onChange={() => setFormData({ ...formData, type: 'public' })}
                    className="sr-only"
                  />
                  <svg width="18" height="16" viewBox="0 0 18 16">
                    <polygon points="9,2 16,14 2,14" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
                  </svg>
                  <div className="text-xs">
                    <div className="font-bold">จำหน่ายทั่วไป</div>
                    <div className="text-[10px] text-slate-500">สามเหลี่ยมโปร่ง</div>
                  </div>
                </label>

                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  formData.type === 'private'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}>
                  <input
                    type="radio"
                    name="type"
                    value="private"
                    checked={formData.type === 'private'}
                    onChange={() => setFormData({ ...formData, type: 'private' })}
                    className="sr-only"
                  />
                  <svg width="18" height="16" viewBox="0 0 18 16">
                    <polygon points="9,2 16,14 2,14" fill="#0f172a" stroke="#0f172a" strokeWidth="2" />
                  </svg>
                  <div className="text-xs">
                    <div className="font-bold">เฉพาะราย</div>
                    <div className="text-[10px] text-slate-500">สามเหลี่ยมทึบ</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Row 3: Feeder & Branch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                สายป้อนหลัก (Feeder)
              </label>
              <input
                type="text"
                value={formData.feeder || ''}
                onChange={e => setFormData({ ...formData, feeder: e.target.value })}
                placeholder="เช่น ไลน์สวนดอก, บ้านห้วยบอน, FAA-06"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                สายแยก / กิ่งย่อย (Branch)
              </label>
              <input
                type="text"
                value={formData.branch || ''}
                onChange={e => setFormData({ ...formData, branch: e.target.value })}
                placeholder="เช่น สายเมน เชียงใหม่-ฝาง, ต้นหนุน, อำเภอฝาง"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          {/* Row 4: Phase, Voltage, Orientation */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ระบบเฟส
              </label>
              <select
                value={formData.phase || '3P'}
                onChange={e => setFormData({ ...formData, phase: e.target.value as any })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="3P">3 เฟส (3P)</option>
                <option value="1P">1 เฟส (1P)</option>
                <option value="AC">AC</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ระดับแรงดัน
              </label>
              <select
                value={formData.voltage || '22 kV'}
                onChange={e => setFormData({ ...formData, voltage: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="22 kV">22 kV</option>
                <option value="33 kV">33 kV</option>
                <option value="400V">400 V</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Compass className="w-3 h-3 text-slate-500" />
                <span>ทิศทางสัญลักษณ์</span>
              </label>
              <select
                value={formData.orientation || 'left'}
                onChange={e => setFormData({ ...formData, orientation: e.target.value as any })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="left">ชี้ซ้าย (Left)</option>
                <option value="right">ชี้ขวา (Right)</option>
                <option value="top">ชี้บน (Top)</option>
                <option value="bottom">ชี้ล่าง (Bottom)</option>
              </select>
            </div>
          </div>

          {/* Row 5: GPS Geographic Coordinates (Latitude / Longitude) & Navigation */}
          <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>พิกัด GPS / นำทาง (Latitude & Longitude)</span>
              </div>
              <button
                type="button"
                onClick={handleFetchCurrentLocation}
                disabled={isLocating}
                className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-300 dark:border-blue-700/80 transition-all flex items-center gap-1 shadow-xs disabled:opacity-50"
                title="ดึงพิกัดจากอุปกรณ์ของคุณ ณ จุดที่ยืนอยู่"
              >
                <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-blue-600' : 'text-blue-500'}`} />
                <span>{isLocating ? 'กำลังค้นหาพิกัด...' : 'ใช้พิกัดปัจจุบัน'}</span>
              </button>
            </div>

            {/* Quick paste / search coordinate string */}
            <div>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <ClipboardPaste className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={rawGpsInput}
                    onChange={e => handleParseGps(e.target.value)}
                    placeholder="วางพิกัด เช่น 19.917456, 99.214532 หรือลิงก์ Google Maps"
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
                  />
                </div>
              </div>
              {gpsMessage && (
                <p className={`text-[11px] mt-1 flex items-center gap-1 ${
                  gpsMessage.type === 'success' 
                    ? 'text-emerald-600 dark:text-emerald-400 font-medium' 
                    : gpsMessage.type === 'error'
                    ? 'text-red-500 font-medium'
                    : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {gpsMessage.type === 'success' && <Check className="w-3 h-3 text-emerald-500" />}
                  <span>{gpsMessage.text}</span>
                </p>
              )}
            </div>

            {/* Split Latitude & Longitude inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ละติจูด (Latitude - N/S)
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.latitude !== undefined && formData.latitude !== null ? formData.latitude : ''}
                  onChange={e => {
                    const val = e.target.value === '' ? undefined : Number(e.target.value);
                    setFormData(prev => ({ ...prev, latitude: val }));
                    if (val !== undefined && formData.longitude !== undefined) {
                      setRawGpsInput(`${val}, ${formData.longitude}`);
                    }
                  }}
                  placeholder="เช่น 19.917456"
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.latitude ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
                  } bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400`}
                />
                {errors.latitude && <p className="text-[10px] text-red-500 mt-0.5">{errors.latitude}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ลองจิจูด (Longitude - E/W)
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude !== undefined && formData.longitude !== null ? formData.longitude : ''}
                  onChange={e => {
                    const val = e.target.value === '' ? undefined : Number(e.target.value);
                    setFormData(prev => ({ ...prev, longitude: val }));
                    if (formData.latitude !== undefined && val !== undefined) {
                      setRawGpsInput(`${formData.latitude}, ${val}`);
                    }
                  }}
                  placeholder="เช่น 99.214532"
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.longitude ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
                  } bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400`}
                />
                {errors.longitude && <p className="text-[10px] text-red-500 mt-0.5">{errors.longitude}</p>}
              </div>
            </div>

            {/* Google Maps Navigation Links */}
            {isValidLatLng(formData.latitude, formData.longitude) && (
              <div className="flex items-center gap-2 pt-1 border-t border-blue-200/70 dark:border-blue-900/60">
                <a
                  href={getGoogleMapsNavUrl(formData.latitude!, formData.longitude!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Navigation className="w-3.5 h-3.5 text-blue-200" />
                  <span>เปิดระบบนำทาง (Google Maps Navigation)</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>

                <a
                  href={getGoogleMapsViewUrl(formData.latitude!, formData.longitude!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-1.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1"
                  title="ดูตำแหน่งบนแผนที่"
                >
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  <span>ดูแผนที่</span>
                </a>
              </div>
            )}
          </div>

          {/* Row 6: Diagram Coordinates X & Y */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>พิกัดตำแหน่งบนผังวงจร (Diagram Canvas X, Y)</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">แกน X (พิกัดแนวนอนบนผัง)</label>
                <input
                  type="number"
                  value={formData.x || 0}
                  onChange={e => setFormData({ ...formData, x: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">แกน Y (พิกัดแนวตั้งบนผัง)</label>
                <input
                  type="number"
                  value={formData.y || 0}
                  onChange={e => setFormData({ ...formData, y: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Row 6: Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>หมายเหตุเพิ่มเติม</span>
            </label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="เช่น เสาต้นที่ 4/2, ข้างร้านค้า, หม้อแปลงเฉพาะรายมิเตอร์ 3P 30A"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* Actions Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            {transformer && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`คุณต้องการลบหม้อแปลง ${transformer.peaNo} (${transformer.name}) หรือไม่?`)) {
                    onDelete(transformer.id);
                    onClose();
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>ลบหม้อแปลง</span>
              </button>
            ) : (
              <div></div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกข้อมูล</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
