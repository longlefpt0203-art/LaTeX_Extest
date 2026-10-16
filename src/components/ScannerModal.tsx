import React from 'react';
import { ScanResult, DiagnosticIssue } from '../utils/latexDiagnostics';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Wrench,
  Sparkles,
  Layers,
  FileCheck2,
} from 'lucide-react';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanResult: ScanResult;
  onAutoFix: () => void;
  onOpenAiAssistant: () => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  scanResult,
  onAutoFix,
  onOpenAiAssistant,
}) => {
  if (!isOpen) return null;

  const { issues, errorCount, warningCount, infoCount, stats } = scanResult;

  const getSeverityIcon = (severity: DiagnosticIssue['severity']) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />;
      case 'info':
        return <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />;
    }
  };

  const hasFixableIssues = issues.some((i) => i.canAutoFix);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-750 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Quét & Chuẩn đoán mã LaTeX ex_test</h2>
              <p className="text-xs text-slate-400">
                Kiểm tra cú pháp, môi trường \\begin\{'{'}...{'}'}, lệnh \\immini và Bảng biến thiên trước khi biên dịch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats & Metric Strip (anti-pill, unboxed metadata) */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-slate-200 font-semibold">{stats.questionCount} câu hỏi</span>
            <span aria-hidden="true">·</span>
            <span>{stats.tikzCount} hình TikZ</span>
            <span aria-hidden="true">·</span>
            <span>{stats.tkzTabCount} bảng biến thiên (tkz-tab)</span>
            {stats.tabularCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-cyan-300 font-medium">{stats.tabularCount} bảng tabular</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>{stats.imminiCount} lệnh \\immini</span>
          </div>

          <div className="flex items-center gap-3 font-mono tabular-nums">
            {errorCount > 0 && <span className="text-red-400 font-medium">{errorCount} lỗi</span>}
            {warningCount > 0 && <span className="text-amber-400">{warningCount} cảnh báo</span>}
            {infoCount > 0 && <span className="text-sky-400">{infoCount} lưu ý</span>}
            {issues.length === 0 && (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Không phát hiện lỗi
              </span>
            )}
          </div>
        </div>

        {/* Issue List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {issues.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">Cú pháp LaTeX chuẩn xác!</h3>
              <p className="text-xs text-slate-400 max-w-md">
                Không phát hiện lỗi cấu trúc ngoặc nhọn, môi trường \\begin\{'{'}center{'}'} hay \\immini. Đề thi đã sẵn sàng chuyển sang SmartTest và xuất Word (.docx).
              </p>
            </div>
          ) : (
            issues.map((issue) => (
              <div
                key={issue.id}
                className={`p-3.5 rounded-lg border text-xs transition-colors flex items-start gap-3 ${
                  issue.severity === 'error'
                    ? 'border-red-500/30 bg-red-950/20 text-slate-200'
                    : issue.severity === 'warning'
                    ? 'border-amber-500/30 bg-amber-950/20 text-slate-200'
                    : 'border-sky-500/30 bg-sky-950/20 text-slate-200'
                }`}
              >
                {getSeverityIcon(issue.severity)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-100 flex items-center gap-2">
                      {issue.title}
                      {issue.line && (
                        <span className="text-[11px] font-mono text-slate-400">
                          (Dòng {issue.line})
                        </span>
                      )}
                    </span>
                    {issue.canAutoFix && (
                      <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        Có thể tự động sửa
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    {issue.description}
                  </p>
                  {issue.snippet && (
                    <div className="mt-2 p-1.5 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                      {issue.snippet}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAiAssistant}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-900/40 hover:bg-indigo-800/60 rounded-lg border border-indigo-700/50 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Sửa sâu bằng AI (Gemini)
            </button>
          </div>

          <div className="flex items-center gap-2">
            {hasFixableIssues && (
              <button
                onClick={onAutoFix}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm"
              >
                <Wrench className="w-3.5 h-3.5" />
                Tự động sửa nhanh
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
