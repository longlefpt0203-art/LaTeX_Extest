import React from 'react';
import { ConversionSettings } from '../types';
import { Settings2, X } from 'lucide-react';

interface ConversionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ConversionSettings;
  onUpdateSettings: (newSettings: ConversionSettings) => void;
}

export const ConversionSettingsModal: React.FC<ConversionSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const handleChange = <K extends keyof ConversionSettings>(key: K, value: ConversionSettings[K]) => {
    onUpdateSettings({
      ...settings,
      [key]: value,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-750 rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Cài đặt định dạng SmartTest</h2>
              <p className="text-xs text-slate-400">Tùy biến cách hiển thị câu hỏi, công thức toán và hình vẽ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Đáp án đúng */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Ký hiệu nhận diện đáp án đúng
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'star', label: '*A. (Dấu hoa thị chuẩn SmartTest)', desc: 'Phổ biến nhất' },
                { id: 'underline', label: '<u>A.</u> (Gạch chân)', desc: 'Chuẩn Word truyền thống' },
                { id: 'bracket', label: '[A] (Dấu ngoặc vuông)', desc: 'Dễ nhận diện OCR' },
                { id: 'bold', label: '**A.** (Chữ in đậm)', desc: 'Dạng Markdown' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleChange('correctMarkStyle', item.id as any)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    settings.correctMarkStyle === item.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-medium text-xs text-slate-200">{item.label}</div>
                  <div className="text-[11px] text-slate-400">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Tiêu đề câu hỏi */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Định dạng tiêu đề câu
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['Câu {n}:', 'Câu {n}.', '[Câu {n}]', 'Bài {n}:'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => handleChange('questionTitleFormat', fmt)}
                  className={`p-2 rounded-lg border text-center text-xs font-medium transition-all ${
                    settings.questionTitleFormat === fmt
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {fmt.replace('{n}', '1')}
                </button>
              ))}
            </div>
          </div>

          {/* Lời giải & Mã ID */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-200 block">Kèm lời giải chi tiết (\loigiai)</span>
                <span className="text-[11px] text-slate-400">Hiển thị nội dung lời giải dưới mỗi câu hỏi</span>
              </div>
              <input
                type="checkbox"
                checked={settings.includeSolution}
                onChange={(e) => handleChange('includeSolution', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-200 block">Giữ lại mã ID câu hỏi</span>
                <span className="text-[11px] text-slate-400">Ví dụ: [2D1Y1-1] của gói ex_test</span>
              </div>
              <input
                type="checkbox"
                checked={settings.includeIdTag}
                onChange={(e) => handleChange('includeIdTag', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-200 block">Chuẩn hóa macro toán Việt Nam</span>
                <span className="text-[11px] text-slate-400">Tự động chuyển \heva, \hoac, \vec, \dfrac sang TeX chuẩn</span>
              </div>
              <input
                type="checkbox"
                checked={settings.convertVietnameseMacros}
                onChange={(e) => handleChange('convertVietnameseMacros', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-200 block">Lọc bỏ lệnh căn lề LaTeX dư thừa</span>
                <span className="text-[11px] text-slate-400">Xóa \noindent, \centering, \vspace, \break...</span>
              </div>
              <input
                type="checkbox"
                checked={settings.cleanLaTeXNoise}
                onChange={(e) => handleChange('cleanLaTeXNoise', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
              />
            </div>
          </div>

          {/* TikZ Resolution */}
          <div className="pt-2 border-t border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Độ phân giải render hình TikZ sang PNG
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '18px', label: '18px (Chuẩn)' },
                { id: '20px', label: '20px (Sắc nét)' },
                { id: '24px', label: '24px (Siêu nét)' },
              ].map((res) => (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => handleChange('tikzResolution', res.id as any)}
                  className={`p-2 rounded-lg border text-center text-xs font-medium transition-all ${
                    settings.tikzResolution === res.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {res.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex justify-end bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            Áp dụng và Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
