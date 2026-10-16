import React from 'react';
import { X, BookOpen, CheckCircle, Keyboard, Image, FileText } from 'lucide-react';

interface MathTypeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MathTypeGuideModal: React.FC<MathTypeGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-750 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Hướng dẫn MathType & SmartTest</h2>
              <p className="text-xs text-slate-400">Cách đưa công thức MathType và hình vẽ TikZ vào Word & SmartTest</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0 mt-0.5">
              1
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Sao chép hoặc Tải file Word (.docx)
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Nhấp nút <strong>"Sao chép SmartTest"</strong> (sao chép đồng thời văn bản và ảnh HTML nhúng sẵn) hoặc nhấp <strong>"Xuất Word (.docx)"</strong> để tải file Word chuẩn kích thước A4.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0 mt-0.5">
              2
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Image className="w-4 h-4 text-emerald-400" />
                Hình vẽ TikZ đã được chèn ảnh PNG trực tiếp
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Các khối <code className="text-indigo-300">tikzpicture</code> được tự động biên dịch sang ảnh PNG nền trong suốt/trắng với độ phân giải cao và chèn vào đúng vị trí câu hỏi. Khi dán vào Word, hình ảnh lập tức hiển thị mà không cần cài thêm gói TikZ trên máy tính!
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0 mt-0.5">
              3
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-amber-400" />
                Chuyển đổi công thức thành MathType bằng phím tắt
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Mọi công thức toán học đều được bọc trong thẻ phân cách <code className="text-amber-300">$...$</code> hoặc <code className="text-amber-300">$$...$$</code>.
              </p>
              <div className="mt-2.5 p-3 bg-slate-800/80 border border-slate-700 rounded-lg text-xs space-y-1.5">
                <div className="text-slate-300 font-medium">Thao tác trong Microsoft Word:</div>
                <div className="flex items-center gap-2 text-slate-400">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Cách 1: Nhấn <kbd className="px-1.5 py-0.5 bg-slate-700 text-slate-200 rounded border border-slate-600 font-mono text-[11px]">Alt + \</kbd> (Toggle TeX của MathType) để chuyển đổi toàn bộ công thức sang MathType chỉ với 1 phím bấm.</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Cách 2: Trên thanh menu Word &gt; Chọn tab <strong>MathType</strong> &gt; Nhấp <strong>Convert Equations</strong> &gt; Tích chọn <strong>TeX code</strong> &gt; Bấm <strong>Convert</strong>.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0 mt-0.5">
              4
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">
                Nhập đề vào phần mềm SmartTest / Subre / Azota
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Sau khi lưu file Word hoặc dùng định dạng chữ có dấu hoa thị <code className="text-indigo-300">*A.</code>, bạn chỉ cần mở SmartTest và chọn chức năng <strong>"Nhập đề từ file Word"</strong> hoặc dán trực tiếp. Phần mềm sẽ tự động nhận diện đáp án đúng, mã câu hỏi và hình vẽ!
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex justify-end bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
