import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Copy,
  Check,
  Download,
  Trash2,
  Bookmark,
  Layers,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  FileCode,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
} from 'lucide-react';

export interface TikzCacheItem {
  id: string;
  code: string;
  title: string;
  url: string;
  dataUrl: string;
  width: number;
  height: number;
  format: 'png' | 'svg';
  timestamp: number;
}

interface TikzStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertIntoExam?: (tikzSnippet: string) => void;
  initialCode?: string;
}

const TIKZ_PRESETS = [
  {
    id: 'bbt-fraction',
    name: 'Bảng biến thiên (tkz-tab) phân thức',
    category: 'tkz-tab',
    code: `\\begin{tikzpicture}
\\tkzTabInit[lgt=1.2,espcl=2.5]{$x$/1,$y'$/1,$y$/2}{$-\\infty$,$-1$,$+\\infty$}
\\tkzTabLine{,+,d,+,}
\\tkzTabVar{-/$2$,+D-/$+\\infty$/$-\\infty$,+/$2$}
\\end{tikzpicture}`,
  },
  {
    id: 'bbt-cubic',
    name: 'Bảng xét dấu đạo hàm bậc ba',
    category: 'tkz-tab',
    code: `\\begin{tikzpicture}
\\tkzTabInit[lgt=1.2,espcl=2.5]{$x$/1,$y'$/1}{$-\\infty$,$-2$,$3$,$+\\infty$}
\\tkzTabLine{,-,0,+,0,-,}
\\end{tikzpicture}`,
  },
  {
    id: 'geometry-pyramid-3d',
    name: 'Hình chóp S.ABC đáy vuông (3D)',
    category: 'geometry',
    code: `\\begin{tikzpicture}[scale=1,>=stealth,line join=round,line cap=round]
  \\coordinate (A) at (0,0);
  \\coordinate (B) at (1.5,-1.2);
  \\coordinate (C) at (4.5,0);
  \\coordinate (S) at (0,3.5);
  \\draw[thick] (S) -- (A) -- (B) -- (C) -- (S) -- (B);
  \\draw[dashed,thick] (A) -- (C);
  \\node[left] at (A) {$A$};
  \\node[below] at (B) {$B$};
  \\node[right] at (C) {$C$};
  \\node[above] at (S) {$S$};
  \\draw (0,0.3) -- (0.3,0.3) -- (0.3,0);
\\end{tikzpicture}`,
  },
  {
    id: 'geometry-prism-3d',
    name: 'Hình lăng trụ tam giác ABC.A\'B\'C\'',
    category: 'geometry',
    code: `\\begin{tikzpicture}[scale=0.9,line join=round,line cap=round]
  \\coordinate (A) at (0,0);
  \\coordinate (B) at (1.5,-1.2);
  \\coordinate (C) at (4,0);
  \\coordinate (A1) at (0,3);
  \\coordinate (B1) at (1.5,1.8);
  \\coordinate (C1) at (4,3);
  \\draw[thick] (A) -- (B) -- (C) (A1) -- (B1) -- (C1) -- cycle;
  \\draw[thick] (A) -- (A1) (B) -- (B1) (C) -- (C1);
  \\draw[dashed,thick] (A) -- (C);
  \\node[left] at (A) {$A$}; \\node[below] at (B) {$B$}; \\node[right] at (C) {$C$};
  \\node[left] at (A1) {$A'$}; \\node[below left] at (B1) {$B'$}; \\node[right] at (C1) {$C'$};
\\end{tikzpicture}`,
  },
  {
    id: 'geometry-sphere-3d',
    name: 'Mặt cầu không gian Oxyz',
    category: 'geometry',
    code: `\\begin{tikzpicture}[scale=0.9,line join=round,line cap=round]
  \\draw[thick] (0,0) circle (1.8cm);
  \\draw[dashed] (-1.8,0) arc (180:0:1.8cm and 0.5cm);
  \\draw[thick] (-1.8,0) arc (180:360:1.8cm and 0.5cm);
  \\coordinate (I) at (0,0);
  \\fill[red] (I) circle (2pt) node[above left] {$I(1;2;-1)$};
  \\draw[->,blue,thick] (I) -- (1.27,1.27) node[midway,above left] {$R=3$};
\\end{tikzpicture}`,
  },
  {
    id: 'graph-cubic',
    name: 'Đồ thị hàm bậc ba y = x³ - 3x',
    category: 'graph',
    code: `\\begin{tikzpicture}[x=1cm,y=1cm,>=stealth,scale=0.9]
  \\draw[->] (-3,0) -- (3,0) node[below] {$x$};
  \\draw[->] (0,-2.5) -- (0,3) node[left] {$y$};
  \\draw[fill=black] (0,0) circle (1.5pt) node[below left] {$O$};
  \\draw[thick,blue,domain=-2.1:2.1,samples=100] plot (\\x, {(\\x)^3 - 3*(\\x)});
  \\draw[dashed] (1,0) node[above] {$1$} -- (1,-2) -- (0,-2) node[left] {$-2$};
  \\draw[dashed] (-1,0) node[below] {$-1$} -- (-1,2) -- (0,2) node[right] {$2$};
\\end{tikzpicture}`,
  },
  {
    id: 'trig-circle',
    name: 'Đường tròn lượng giác & Góc',
    category: 'trig',
    code: `\\begin{tikzpicture}[scale=1.5,>=stealth]
  \\draw[->] (-1.4,0) -- (1.4,0) node[below] {$\\cos$};
  \\draw[->] (0,-1.4) -- (0,1.4) node[left] {$\\sin$};
  \\draw[thick] (0,0) circle (1cm);
  \\node[below left] at (0,0) {$O$};
  \\draw[->,red,thick] (0,0) -- (0.707,0.707) node[above right] {$M(\\frac{\\pi}{4})$};
  \\draw[dashed] (0.707,0) node[below] {$\\frac{\\sqrt{2}}{2}$} -- (0.707,0.707) -- (0,0.707) node[left] {$\\frac{\\sqrt{2}}{2}$};
\\end{tikzpicture}`,
  },
];

const LOCAL_STORAGE_KEY = 'extest_tikz_memory_cache_v1';

export const TikzStudioModal: React.FC<TikzStudioModalProps> = ({
  isOpen,
  onClose,
  onInsertIntoExam,
  initialCode,
}) => {
  const [tikzCode, setTikzCode] = useState<string>(
    initialCode || TIKZ_PRESETS[0].code
  );
  const [resolution, setResolution] = useState<'18px' | '20px' | '24px' | '30px'>('20px');
  const [format, setFormat] = useState<'png' | 'svg'>('png');
  const [bgMode, setBgMode] = useState<'white' | 'dark' | 'transparent'>('white');
  const [zoom, setZoom] = useState<number>(1);

  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<{
    url: string;
    dataUrl: string;
    width: number;
    height: number;
    hash: string;
  } | null>(null);

  // Temporary memory list (persisted in session / local storage)
  const [cacheItems, setCacheItems] = useState<TikzCacheItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialCode) {
      setTikzCode(initialCode);
    }
  }, [initialCode]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cacheItems));
    } catch (e) {
      console.warn('Failed to save TikZ cache to localStorage:', e);
    }
  }, [cacheItems]);

  if (!isOpen) return null;

  // Handle Compile TikZ
  const handleCompile = async () => {
    if (!tikzCode.trim()) return;

    setIsCompiling(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/tikz/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tikzCode: tikzCode.trim(),
          fontSize: resolution,
          format,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Biên dịch TikZ thất bại');
      }

      const result = {
        url: data.url,
        dataUrl: data.dataUrl,
        width: data.width,
        height: data.height,
        hash: data.hash,
      };

      setCurrentResult(result);

      // Auto-save into temporary memory
      const newItem: TikzCacheItem = {
        id: `cache-${Date.now()}`,
        code: tikzCode.trim(),
        title: deriveTitleFromCode(tikzCode),
        url: data.url,
        dataUrl: data.dataUrl,
        width: data.width,
        height: data.height,
        format,
        timestamp: Date.now(),
      };

      setCacheItems((prev) => {
        // Avoid duplicate by hash/dataUrl
        const filtered = prev.filter((item) => item.dataUrl !== data.dataUrl);
        return [newItem, ...filtered].slice(0, 30); // keep up to 30 recent items
      });
    } catch (err: any) {
      console.error('Lỗi compile TikZ:', err);
      setErrorMsg(err.message || 'Lỗi xử lý cú pháp TikZ.');
    } finally {
      setIsCompiling(false);
    }
  };

  const deriveTitleFromCode = (code: string): string => {
    if (code.includes('\\tkzTabInit')) return 'Bảng biến thiên (tkz-tab)';
    if (code.includes('plot')) return 'Đồ thị hàm số';
    if (code.includes('circle') && code.includes('arc')) return 'Hình học không gian';
    if (code.includes('-- (S)')) return 'Hình chóp';
    if (code.includes('cos') || code.includes('sin')) return 'Đường tròn lượng giác';
    return 'Hình vẽ TikZ';
  };

  // Copy PNG image directly to system clipboard for Ctrl+V in Word/PPT
  const handleCopyImageToClipboard = async (dataUrl: string, actionId: string = 'image') => {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type || 'image/png']: blob,
          }),
        ]);
        setCopiedAction(actionId);
        setTimeout(() => setCopiedAction(null), 2200);
        return;
      }
    } catch (err) {
      console.warn('Clipboard write image blob failed, falling back to dataUrl text:', err);
    }

    // Fallback: Copy Base64 text
    await navigator.clipboard.writeText(dataUrl);
    setCopiedAction(actionId);
    setTimeout(() => setCopiedAction(null), 2200);
  };

  // Copy TikZ snippet
  const handleCopyCode = async (code: string, actionId: string = 'code') => {
    await navigator.clipboard.writeText(code);
    setCopiedAction(actionId);
    setTimeout(() => setCopiedAction(null), 2000);
  };

  // Download Single Image
  const handleDownload = (dataUrl: string, filename: string = 'hinh_ve_tikz.png') => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  };

  // Insert into main LaTeX Exam input
  const handleInsert = (code: string) => {
    const formatted = `\\begin{center}\n${code.trim()}\n\\end{center}`;
    if (onInsertIntoExam) {
      onInsertIntoExam(formatted);
      onClose();
    }
  };

  // Clear cache
  const handleClearCache = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tất cả hình vẽ trong bộ nhớ tạm?')) {
      setCacheItems([]);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Công cụ Biên dịch TikZ & Bộ nhớ tạm
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  {cacheItems.length} hình trong bộ nhớ tạm
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Render mã \begin{'{'}tikzpicture{'}'} thành ảnh PNG độ nét cao, ghi nhớ tự động và sao chép trực tiếp vào Word (Ctrl+V)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - 2 Columns */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          {/* LEFT 7 COLS: Editor & Live Preview */}
          <div className="lg:col-span-8 flex flex-col border-r border-slate-800 min-h-0 bg-slate-950/40">
            {/* Presets Toolbar */}
            <div className="px-4 py-2.5 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs bg-slate-900/60 shrink-0">
              <span className="text-slate-400 text-[11px] whitespace-nowrap font-medium flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Mẫu nhanh:
              </span>
              {TIKZ_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setTikzCode(preset.code);
                    setErrorMsg(null);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white whitespace-nowrap text-[11px] border border-slate-700/60 transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {/* Code Input Area */}
            <div className="p-4 flex-1 flex flex-col min-h-[220px] max-h-[340px] border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                  Mã TikZ / tkz-tab / tkz-euclide:
                </label>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <button
                    onClick={() => setTikzCode('')}
                    className="hover:text-red-400 text-[11px] transition-colors"
                  >
                    Xóa trắng
                  </button>
                </div>
              </div>

              <textarea
                ref={textareaRef}
                value={tikzCode}
                onChange={(e) => setTikzCode(e.target.value)}
                placeholder="Dán mã \begin{tikzpicture} ... \end{tikzpicture} hoặc \tkzTabInit vào đây..."
                className="w-full flex-1 p-3 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-slate-200 resize-none focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 leading-relaxed placeholder:text-slate-600"
              />

              {/* Compilation Settings & Action Buttons */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60 gap-3 flex-wrap">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span>Độ phân giải:</span>
                    <select
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value as any)}
                      className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-0.5 text-xs focus:outline-none"
                    >
                      <option value="18px">Chuẩn (18px)</option>
                      <option value="20px">Cao (20px - Khuyên dùng)</option>
                      <option value="24px">Siêu nét (24px)</option>
                      <option value="30px">In ấn (30px)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCompile}
                    disabled={isCompiling || !tikzCode.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isCompiling ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang biên dịch...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Biên dịch & Lưu bộ nhớ tạm</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Live Preview Display Section */}
            <div className="p-4 flex-1 flex flex-col min-h-[260px] overflow-hidden bg-slate-900/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <span>Kết quả Render trực tiếp:</span>
                  {currentResult && (
                    <span className="font-mono text-[11px] text-slate-400 font-normal">
                      {currentResult.width}×{currentResult.height}px
                    </span>
                  )}
                </div>

                {/* Viewport controls */}
                <div className="flex items-center gap-1.5 text-xs">
                  {/* Background mode */}
                  <div className="flex items-center bg-slate-800/80 p-0.5 rounded border border-slate-700/60 text-[10px]">
                    <button
                      onClick={() => setBgMode('white')}
                      className={`px-2 py-0.5 rounded ${bgMode === 'white' ? 'bg-white text-slate-900 font-bold' : 'text-slate-400'}`}
                    >
                      Nền trắng
                    </button>
                    <button
                      onClick={() => setBgMode('dark')}
                      className={`px-2 py-0.5 rounded ${bgMode === 'dark' ? 'bg-slate-950 text-white font-bold' : 'text-slate-400'}`}
                    >
                      Nền tối
                    </button>
                    <button
                      onClick={() => setBgMode('transparent')}
                      className={`px-2 py-0.5 rounded ${bgMode === 'transparent' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'}`}
                    >
                      Ca-rô
                    </button>
                  </div>

                  {/* Zoom controls */}
                  <button
                    onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                    title="Thu nhỏ"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono w-9 text-center text-slate-400">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                    title="Phóng to"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoom(1)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                    title="Về 100%"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Preview Window Box */}
              <div
                className={`flex-1 rounded-xl border border-slate-800 flex items-center justify-center p-4 overflow-auto min-h-[180px] relative ${
                  bgMode === 'white'
                    ? 'bg-white'
                    : bgMode === 'dark'
                    ? 'bg-slate-950'
                    : 'bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]'
                }`}
              >
                {isCompiling ? (
                  <div className="flex flex-col items-center gap-2 text-indigo-500">
                    <RefreshCw className="w-8 h-8 animate-spin" />
                    <span className="text-xs font-mono text-slate-500">
                      Đang xử lý biên dịch TeX qua máy chủ ảo...
                    </span>
                  </div>
                ) : errorMsg ? (
                  <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-lg max-w-lg text-xs text-red-300">
                    <div className="flex items-center gap-2 font-semibold mb-1">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      Lỗi biên dịch mã TikZ:
                    </div>
                    <div className="font-mono text-[11px] text-red-400/90 whitespace-pre-wrap max-h-36 overflow-y-auto">
                      {errorMsg}
                    </div>
                  </div>
                ) : currentResult ? (
                  <div
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                    className="transition-transform duration-150 flex items-center justify-center"
                  >
                    <img
                      src={currentResult.dataUrl || currentResult.url}
                      alt="Hình vẽ TikZ đã render"
                      className="max-h-[280px] max-w-full object-contain drop-shadow-sm"
                    />
                  </div>
                ) : (
                  <div className="text-center text-slate-400 text-xs">
                    Nhấp nút <strong className="text-emerald-400 font-semibold">"Biên dịch & Lưu bộ nhớ tạm"</strong> để xem kết quả.
                  </div>
                )}
              </div>

              {/* Preview Actions Bar */}
              {currentResult && (
                <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyImageToClipboard(currentResult.dataUrl, 'preview-img')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm"
                      title="Sao chép ảnh nhị phân để dán thẳng vào Word / PowerPoint bằng Ctrl+V"
                    >
                      {copiedAction === 'preview-img' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span className="text-emerald-300">Đã chép ảnh vào Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Chép ảnh (Ctrl+V vào Word)</span>
                        </>
                      )}
                    </button>

                    {onInsertIntoExam && (
                      <button
                        onClick={() => handleInsert(tikzCode)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-800/60 border border-emerald-500/40 rounded-lg transition-colors"
                        title="Chèn khối \begin{center} mã TikZ này vào đề thi đang mở"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Chèn vào đề thi hiện tại</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDownload(currentResult.dataUrl, 'hinh_ve_tikz.png')}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Tải tệp ảnh PNG về máy"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải PNG</span>
                    </button>
                    <button
                      onClick={() => handleCopyCode(tikzCode, 'preview-code')}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Sao chép toàn bộ mã TikZ"
                    >
                      {copiedAction === 'preview-code' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>Chép mã TikZ</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 4 COLS: Bộ nhớ tạm / Lịch sử Render Drawer */}
          <div className="lg:col-span-4 flex flex-col bg-slate-900/90 min-h-0">
            {/* Cache Header */}
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Bookmark className="w-4 h-4 text-emerald-400" />
                <span>Bộ nhớ tạm ({cacheItems.length})</span>
              </div>
              {cacheItems.length > 0 && (
                <button
                  onClick={handleClearCache}
                  className="text-[11px] text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1"
                  title="Xóa toàn bộ lịch sử bộ nhớ tạm"
                >
                  <Trash2 className="w-3 h-3" />
                  Xóa sạch
                </button>
              )}
            </div>

            {/* Cache Item List */}
            <div className="p-3 overflow-y-auto flex-1 space-y-3">
              {cacheItems.length === 0 ? (
                <div className="text-center py-12 px-4 text-slate-500 text-xs flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-600 mb-1">
                    <Clock className="w-5 h-5" />
                  </div>
                  <p>Bộ nhớ tạm chưa có hình vẽ nào.</p>
                  <p className="text-[11px] text-slate-600">
                    Mỗi lần bạn biên dịch mã TikZ, hình vẽ sẽ tự động được ghi nhớ tại đây để sử dụng lại bất cứ lúc nào.
                  </p>
                </div>
              ) : (
                cacheItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl hover:border-slate-700 transition-all flex flex-col gap-2.5 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-200 truncate max-w-[170px]" title={item.title}>
                        #{index + 1}. {item.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.width}×{item.height}
                      </span>
                    </div>

                    {/* Thumbnail preview */}
                    <div
                      onClick={() => {
                        setTikzCode(item.code);
                        setCurrentResult({
                          url: item.url,
                          dataUrl: item.dataUrl,
                          width: item.width,
                          height: item.height,
                          hash: item.id,
                        });
                      }}
                      className="bg-white p-2 rounded-lg flex items-center justify-center min-h-[90px] max-h-[110px] cursor-pointer hover:ring-2 hover:ring-emerald-500/60 transition-all overflow-hidden"
                      title="Nhấp để nạp lại hình này vào trình soạn thảo"
                    >
                      <img
                        src={item.dataUrl || item.url}
                        alt={item.title}
                        className="max-h-[85px] max-w-full object-contain"
                        loading="lazy"
                      />
                    </div>

                    {/* Action buttons on cached card */}
                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/60 text-[11px]">
                      <button
                        onClick={() => handleCopyImageToClipboard(item.dataUrl, `cache-${item.id}`)}
                        className="flex items-center gap-1 text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors font-medium"
                        title="Sao chép ảnh (Ctrl+V vào Word)"
                      >
                        {copiedAction === `cache-${item.id}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Đã chép!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-indigo-400" />
                            <span>Chép ảnh</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1">
                        {onInsertIntoExam && (
                          <button
                            onClick={() => handleInsert(item.code)}
                            className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 rounded transition-colors"
                            title="Chèn mã hình này vào đề thi hiện tại"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(item.dataUrl, `tikz_${index + 1}.png`)}
                          className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                          title="Tải file PNG về máy"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setCacheItems((prev) => prev.filter((i) => i.id !== item.id));
                          }}
                          className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                          title="Xóa khỏi bộ nhớ tạm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
