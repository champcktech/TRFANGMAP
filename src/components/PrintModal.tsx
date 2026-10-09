import React, { useRef, useState } from 'react';
import { Transformer, SwitchNode, FeederPath, AnnotationLabel } from '../types';
import { transformDataToLandscape } from '../utils/orientation';
import { X, Printer, FileCode, Download, Eye, FileText, Check } from 'lucide-react';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  transformers: Transformer[];
  switches: SwitchNode[];
  feederPaths: FeederPath[];
  annotations: AnnotationLabel[];
  transformerCount: number;
  totalKva: number;
  sheetTitle?: string;
  sheetNo?: string;
  feederCode?: string;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  transformers = [],
  switches = [],
  feederPaths = [],
  annotations = [],
  transformerCount,
  totalKva,
  sheetTitle = 'ไลน์สวนดอก',
  sheetNo = '(1)',
  feederCode = 'FAA-06'
}) => {
  const [paperSize, setPaperSize] = useState<'a4_landscape' | 'a3_landscape'>('a4_landscape');
  const [printTheme, setPrintTheme] = useState<'light' | 'blueprint'>('light');
  const [isExportingPng, setIsExportingPng] = useState(false);

  if (!isOpen) return null;

  // แปลงข้อมูลเป็นแนวนอน (Landscape) ให้ตรงกับการแสดงผลจริงบนหน้าจอ
  const landscapeData = transformDataToLandscape(transformers, switches, feederPaths, annotations);

  // คำนวณ Bounding Box ของผังแนวนอนทั้งหมดให้กระชับพอดีกับชิ้นงานจริง
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  landscapeData.transformers.forEach(t => {
    minX = Math.min(minX, t.x - 70);
    maxX = Math.max(maxX, t.x + 180);
    minY = Math.min(minY, t.y - 60);
    maxY = Math.max(maxY, t.y + 90);
  });

  landscapeData.switches.forEach(s => {
    minX = Math.min(minX, s.x - 50);
    maxX = Math.max(maxX, s.x + 50);
    minY = Math.min(minY, s.y - 50);
    maxY = Math.max(maxY, s.y + 50);
  });

  landscapeData.annotations.forEach(a => {
    minX = Math.min(minX, a.x - 40);
    maxX = Math.max(maxX, a.x + 220);
    minY = Math.min(minY, a.y - 40);
    maxY = Math.max(maxY, a.y + 60);
  });

  landscapeData.feederPaths.forEach(p => {
    p.points.forEach(pt => {
      minX = Math.min(minX, pt.x - 40);
      maxX = Math.max(maxX, pt.x + 40);
      minY = Math.min(minY, pt.y - 40);
      maxY = Math.max(maxY, pt.y + 40);
    });
  });

  // ขนาดแผ่นผังมาตรฐาน A4 แนวนอน (2079 × 1470 px = 297 × 210 mm ที่อัตราส่วน 1:√2 มาตรฐาน ISO 216)
  const viewBoxX = 0;
  const viewBoxY = 0;
  const viewBoxWidth = 2079;
  const viewBoxHeight = 1470;

  // ฟังก์ชันเตรียม SVG Clone สำหรับพิมพ์และส่งออก (ล้าง Pan/Zoom Transform ออก)
  const prepareCleanSvgClone = (isDark: boolean): SVGElement | null => {
    const svgElem = document.getElementById('diagram-bg');
    if (!svgElem) return null;

    const svgClone = svgElem.cloneNode(true) as SVGElement;
    
    // สำคัญมาก: ปลด transform pan & zoom ในกลุ่ม viewport เพื่อให้พิกัดกลับเป็นมาตรฐาน 1:1
    const viewportGroup = svgClone.querySelector('#diagram-viewport');
    if (viewportGroup) {
      viewportGroup.removeAttribute('transform');
    }

    // ลบส่วนควบคุมที่โต้ตอบได้ เช่น ปุ่มลาก จุดปรับเส้น
    svgClone.querySelectorAll('.pointer-events-auto').forEach(el => el.remove());
    svgClone.querySelectorAll('.cursor-pointer').forEach(el => el.classList.remove('cursor-pointer'));

    // กำหนด viewBox ให้ครอบคลุมเฉพาะเนื้อหาผังวงจร
    svgClone.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
    svgClone.setAttribute('width', '100%');
    svgClone.setAttribute('height', '100%');
    svgClone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svgClone.removeAttribute('style');

    // ปรับสีพื้นหลังกระดาษตามธีมการพิมพ์
    const sheetBg = svgClone.querySelector('#sheet-canvas-surface');
    if (sheetBg) {
      sheetBg.setAttribute('fill', isDark ? '#0d2238' : '#ffffff');
      sheetBg.setAttribute('x', `${viewBoxX}`);
      sheetBg.setAttribute('y', `${viewBoxY}`);
      sheetBg.setAttribute('width', `${viewBoxWidth}`);
      sheetBg.setAttribute('height', `${viewBoxHeight}`);
    }

    return svgClone;
  };

  // สั่งพิมพ์เฉพาะผังวงจร (Direct Isolated Print) ให้เต็มหน้ากระดาษ
  const handlePrint = () => {
    const isDark = printTheme === 'blueprint';
    const svgClone = prepareCleanSvgClone(isDark);
    if (!svgClone) {
      window.print();
      return;
    }

    const serializer = new XMLSerializer();
    const svgHtml = serializer.serializeToString(svgClone);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const isA3 = paperSize === 'a3_landscape';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${sheetNo} ผังหม้อแปลง ${sheetTitle} - การไฟฟ้าส่วนภูมิภาค</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: ${isA3 ? 'A3' : 'A4'} landscape;
              margin: 5mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body {
              width: 100%;
              height: 100%;
              background-color: ${isDark ? '#09182d' : '#ffffff'};
              font-family: 'Sarabun', 'Segoe UI', Tahoma, sans-serif;
              display: flex;
              flex-direction: column;
              overflow: hidden;
            }
            .page-wrapper {
              display: flex;
              flex-direction: column;
              width: 100%;
              height: 100%;
              padding: 2mm 3mm;
            }
            .header-bar {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding-bottom: 2mm;
              border-bottom: 2px solid ${isDark ? '#38bdf8' : '#0f172a'};
              color: ${isDark ? '#f8fafc' : '#0f172a'};
              flex-shrink: 0;
            }
            .header-title {
              font-size: 15pt;
              font-weight: bold;
              line-height: 1.2;
            }
            .header-meta {
              font-size: 9.5pt;
              color: ${isDark ? '#93c5fd' : '#475569'};
              margin-top: 1px;
            }
            .diagram-container {
              flex: 1 1 auto;
              width: 100%;
              min-height: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 1.5px solid ${isDark ? '#1e3a8a' : '#cbd5e1'};
              margin: 2mm 0;
              background: ${isDark ? '#0d2238' : '#ffffff'};
              border-radius: 4px;
              overflow: hidden;
            }
            .diagram-container svg {
              width: 100%;
              height: 100%;
              display: block;
            }
            .footer-bar {
              display: flex;
              justify-content: space-between;
              font-size: 8pt;
              color: ${isDark ? '#94a3b8' : '#64748b'};
              padding-top: 1.5mm;
              flex-shrink: 0;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="page-wrapper">
            <div class="header-bar">
              <div>
                <div class="header-title">${sheetNo} ผังวงจรจำหน่ายระบบไฟฟ้า (SLD) - ${sheetTitle}</div>
                <div class="header-meta">สายป้อน: ${feederCode} | การไฟฟ้าส่วนภูมิภาค (PEA)</div>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: bold; font-size: 10.5pt;">หม้อแปลงรวม ${transformerCount} ลูก (${totalKva.toLocaleString()} kVA)</div>
                <div class="header-meta">พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}</div>
              </div>
            </div>

            <div class="diagram-container">
              ${svgHtml}
            </div>

            <div class="footer-bar">
              <span>เอกสารระบบผังวงจรไฟฟ้าดิจิทัล • แผนกปฏิบัติการและบำรุงรักษา</span>
              <span>ขนาดหน้ากระดาษ: ${isA3 ? 'A3 แนวนอน' : 'A4 แนวนอน'} • หน้า 1/1</span>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ส่งออกเป็น SVG Vector คุณภาพสูง
  const handleExportSvg = () => {
    const isDark = printTheme === 'blueprint';
    const svgClone = prepareCleanSvgClone(isDark);
    if (!svgClone) return;

    const serializer = new XMLSerializer();
    svgClone.setAttribute('width', `${viewBoxWidth}`);
    svgClone.setAttribute('height', `${viewBoxHeight}`);

    let source = serializer.serializeToString(svgClone);
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const safeTitle = `${sheetNo}_ผังหม้อแปลง_${sheetTitle}`.replace(/[\/\s:]/g, '_');
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeTitle}_${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ส่งออกเป็นรูปภาพความละเอียดสูง PNG เต็มผัง
  const handleExportPng = () => {
    const isDark = printTheme === 'blueprint';
    const svgClone = prepareCleanSvgClone(isDark);
    if (!svgClone) return;

    setIsExportingPng(true);
    const scaleFactor = 2; // เพิ่มความคมชัด 2 เท่า
    const targetWidth = viewBoxWidth * scaleFactor;
    const targetHeight = viewBoxHeight * scaleFactor;

    svgClone.setAttribute('width', `${targetWidth}`);
    svgClone.setAttribute('height', `${targetHeight}`);

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClone);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const blobURL = URL.createObjectURL(svgBlob);

    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fill background
      ctx.fillStyle = isDark ? '#0d2238' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);

      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      const safeTitle = `${sheetNo}_ผังหม้อแปลง_${sheetTitle}`.replace(/[\/\s:]/g, '_');
      downloadLink.download = `${safeTitle}_${Date.now()}.png`;
      downloadLink.href = pngUrl;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(blobURL);
      setIsExportingPng(false);
    };
    image.src = blobURL;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                พิมพ์และส่งออกผังวงจร (Single-Line Diagram)
              </h3>
              <p className="text-xs text-slate-500">
                {sheetNo} {sheetTitle} • {transformerCount} หม้อแปลง ({totalKva.toLocaleString()} kVA)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Print Settings Options */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                ขนาดกระดาษที่พิมพ์:
              </label>
              <select
                value={paperSize}
                onChange={e => setPaperSize(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium"
              >
                <option value="a4_landscape">A4 แนวนอน (มาตรฐาน)</option>
                <option value="a3_landscape">A3 แนวนอน (ผังใหญ่พิเศษ)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                สไตล์สีผังที่พิมพ์:
              </label>
              <select
                value={printTheme}
                onChange={e => setPrintTheme(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium"
              >
                <option value="light">พื้นขาว (ประหยัดหมึกพิมพ์)</option>
                <option value="blueprint">สีพิมพ์เขียว (Blueprint)</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            {/* Primary Print Button */}
            <button
              onClick={handlePrint}
              className="w-full p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-3 group cursor-pointer"
            >
              <div className="p-2.5 bg-blue-700 rounded-xl group-hover:scale-105 transition-transform">
                <Printer className="w-5 h-5" />
              </div>
              <div className="text-left flex-1">
                <div className="text-sm font-bold flex items-center justify-between">
                  <span>สั่งพิมพ์เฉพาะผังวงจร (Print / Save as PDF)</span>
                  <span className="text-[10px] bg-blue-500/80 px-2 py-0.5 rounded-full font-mono">แนะนำ</span>
                </div>
                <div className="text-[11px] text-blue-100 font-normal">
                  พิมพ์เฉพาะแผ่นผังพร้อมหัวข้อและสรุปข้อมูล ไม่ติดแถบเมนูหรือหน้าจอโปรแกรม
                </div>
              </div>
            </button>

            {/* Export High-Res PNG Image */}
            <button
              onClick={handleExportPng}
              disabled={isExportingPng}
              className="w-full p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-3 group cursor-pointer disabled:opacity-50"
            >
              <div className="p-2 bg-emerald-700 rounded-lg group-hover:scale-105 transition-transform">
                <Download className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold">
                  {isExportingPng ? 'กำลังสร้างรูปภาพ...' : 'บันทึกเป็นรูปภาพความละเอียดสูง (PNG)'}
                </div>
                <div className="text-[11px] text-emerald-100 font-normal">
                  ดาวน์โหลดไฟล์รูปภาพสำหรับแนบรายงานหรือส่งในไลน์
                </div>
              </div>
            </button>

            {/* Export Vector SVG */}
            <button
              onClick={handleExportSvg}
              className="w-full p-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-3 group border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg group-hover:scale-105 transition-transform">
                <FileCode className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold">บันทึกเป็นไฟล์ Vector (SVG)</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                  สำหรับเปิดใน AutoCAD, Adobe Illustrator หรือ Visio
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
