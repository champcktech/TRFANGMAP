import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleDismiss = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen flex items-center justify-center bg-slate-900 text-slate-100 p-4 font-sans select-none">
          <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-6 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <AlertTriangle className="w-7 h-7" />
            </div>
            
            <div>
              <h2 className="text-base font-bold text-white">เกิดข้อผิดพลาดในการแสดงผล</h2>
              <p className="text-xs text-slate-400 mt-1">
                ระบบได้ป้องกันไม่ให้หน้าจอขาว ข้อมูลผังและหม้อแปลงของคุณยังถูกบันทึกไว้อย่างปลอดภัย
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-900/80 rounded-xl text-left border border-slate-700/60 overflow-hidden">
                <div className="text-[11px] font-mono text-rose-400 break-words line-clamp-3">
                  {this.state.error.message || 'Unknown error'}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleDismiss}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors cursor-pointer"
              >
                กลับสู่หน้าผัง
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-blue-500/20"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>รีโหลดหน้าเว็บ</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
