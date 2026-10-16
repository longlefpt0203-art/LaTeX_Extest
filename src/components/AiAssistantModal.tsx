import React, { useState } from 'react';
import { Sparkles, X, Check, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLatex: string;
  onApplyFixedLatex: (fixedText: string) => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  currentLatex,
  onApplyFixedLatex,
}) => {
  const [task, setTask] = useState<'fix' | 'optimize_tikz'>('fix');
  const [isLoading, setIsLoading] = useState(false);
  const [fixedResult, setFixedResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunAi = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setFixedResult(null);

    try {
      const response = await fetch('/api/ai-fix-latex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latexContent: currentLatex,
          task,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Lỗi khi gọi AI');
      }

      setFixedResult(data.fixedText);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể kết nối đến dịch vụ AI');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (fixedResult) {
      onApplyFixedLatex(fixedResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-750 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Trợ lý AI sửa lỗi LaTeX ex_test</h2>
              <p className="text-xs text-slate-400">Tự động phát hiện thiếu ngoặc, sửa macro và tối ưu hình TikZ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Options */}
          <div className="flex gap-2">
            <button
              onClick={() => setTask('fix')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                task === 'fix'
                  ? 'border-indigo-500 bg-indigo-500/10 text-white'
                  : 'border-slate-800 bg-slate-800/40 text-slate-400'
              }`}
            >
              Chuẩn hóa & Sửa lỗi cú pháp ex_test
            </button>
            <button
              onClick={() => setTask('optimize_tikz')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                task === 'optimize_tikz'
                  ? 'border-indigo-500 bg-indigo-500/10 text-white'
                  : 'border-slate-800 bg-slate-800/40 text-slate-400'
              }`}
            >
              Kiểm tra & Tối ưu hóa mã TikZ
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!fixedResult ? (
            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                AI sẽ phân tích đoạn mã LaTeX hiện tại ({currentLatex.length} ký tự) để sửa lỗi các lệnh \choice, \loigiai, ngoặc nhọn, và đảm bảo mọi công thức toán học đều nằm trong cặp dấu $ $.
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 max-h-48 overflow-y-auto font-mono text-xs text-slate-400">
                {currentLatex.slice(0, 500)}
                {currentLatex.length > 500 && '...'}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-emerald-400">
                <span>AI đã hoàn tất sửa lỗi. Xem lại kết quả bên dưới:</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 max-h-64 overflow-y-auto font-mono text-xs text-slate-200">
                {fixedResult}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="text-xs text-slate-400">
            {isLoading ? 'Đang gọi Gemini AI...' : ''}
          </div>
          <div className="flex items-center gap-2">
            {!fixedResult ? (
              <button
                onClick={handleRunAi}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Bắt đầu sửa với AI
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={handleRunAi}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg"
                >
                  Chạy lại
                </button>
                <button
                  onClick={handleApply}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Áp dụng mã đã sửa
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
