import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ParsedQuestion,
  ConversionSettings,
  TikzBlock,
} from './types';
import { parseExTestLatex } from './utils/latexParser';
import {
  formatToSmartTestText,
  copySmartTestToClipboard,
} from './utils/smartTestFormatter';
import { exportToDocx } from './utils/docxExporter';
import { SAMPLE_EXAMS } from './utils/sampleData';
import { scanLatexDocument, autoFixLatexDocument } from './utils/latexDiagnostics';
import { QuestionCard } from './components/QuestionCard';
import { TikzGalleryModal } from './components/TikzGalleryModal';
import { TikzStudioModal } from './components/TikzStudioModal';
import { Id6ManagerModal } from './components/Id6ManagerModal';
import { ConversionSettingsModal } from './components/ConversionSettingsModal';
import { MathTypeGuideModal } from './components/MathTypeGuideModal';
import { AiAssistantModal } from './components/AiAssistantModal';
import { ScannerModal } from './components/ScannerModal';
import {
  Download,
  Copy,
  Check,
  Tag,
  FileDown,
  Settings2,
  BookOpen,
  Sparkles,
  Upload,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
  Palette,
  FileText,
  Eye,
  Code2,
  Search,
  ExternalLink,
  Layers,
  ArrowRight,
  FileCheck2,
  Wrench,
} from 'lucide-react';

const DEFAULT_SETTINGS: ConversionSettings = {
  correctMarkStyle: 'star',
  questionTitleFormat: 'Câu {n}:',
  includeIdTag: true,
  includeSolution: true,
  solutionHeader: 'Lời giải:',
  mathMode: 'mathtype_toggle',
  renderTikzToPng: true,
  tikzResolution: '20px',
  cleanLaTeXNoise: true,
  convertVietnameseMacros: true,
  splitTrueFalsePerLine: true,
};

export default function App() {
  // Input LaTeX code
  const [latexInput, setLatexInput] = useState<string>(SAMPLE_EXAMS[0].latex);

  // Settings
  const [settings, setSettings] = useState<ConversionSettings>(DEFAULT_SETTINGS);

  // Parsed Questions state
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);

  // Active view tab in right pane
  const [activeTab, setActiveTab] = useState<'preview' | 'smarttest_text' | 'tikz_gallery'>('preview');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isTikzModalOpen, setIsTikzModalOpen] = useState(false);
  const [isTikzStudioOpen, setIsTikzStudioOpen] = useState(false);
  const [isId6ModalOpen, setIsId6ModalOpen] = useState(false);
  const [studioInitialCode, setStudioInitialCode] = useState<string | undefined>(undefined);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);

  // Insert TikZ code snippet from Studio directly into exam LaTeX
  const handleInsertTikzIntoLatex = (tikzSnippet: string) => {
    setLatexInput((prev) => {
      if (!prev.trim()) return tikzSnippet;
      return `${prev.trim()}\n\n${tikzSnippet}\n`;
    });
  };

  const handleOpenTikzStudio = (code?: string) => {
    setStudioInitialCode(code);
    setIsTikzStudioOpen(true);
  };

  // Real-time scan result of current LaTeX input
  const scanResult = useMemo(() => scanLatexDocument(latexInput), [latexInput]);

  const handleAutoFix = () => {
    const { fixedContent } = autoFixLatexDocument(latexInput);
    setLatexInput(fixedContent);
  };

  // Clipboard copy state
  const [isCopied, setIsCopied] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  // Image zoom preview
  const [previewImageBlock, setPreviewImageBlock] = useState<TikzBlock | null>(null);

  // File upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Parse LaTeX whenever input or basic cleaning settings change
  useEffect(() => {
    try {
      const parsed = parseExTestLatex(latexInput);
      setQuestions(parsed);
    } catch (e) {
      console.error('Lỗi khi phân tích LaTeX ex_test:', e);
    }
  }, [latexInput]);

  // Collect all TikZ blocks across all questions
  const allTikzBlocks = useMemo(() => {
    const blocks: TikzBlock[] = [];
    for (const q of questions) {
      for (const b of q.tikzBlocks) {
        blocks.push(b);
      }
    }
    return blocks;
  }, [questions]);

  // 2. TikZ Renderer Worker: Automatically renders any idle TikZ block into PNG via server
  const renderingRef = useRef<Set<string>>(new Set());

  const renderSingleTikz = async (block: TikzBlock) => {
    if (renderingRef.current.has(block.id)) return;
    renderingRef.current.add(block.id);

    // Update status to rendering
    setQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        tikzBlocks: q.tikzBlocks.map((b) =>
          b.id === block.id ? { ...b, status: 'rendering' } : b
        ),
      }))
    );

    try {
      const res = await fetch('/api/tikz/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tikzCode: block.code,
          fontSize: settings.tikzResolution,
          format: 'png',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Biên dịch TikZ thất bại');
      }

      // Update question block with URL and metadata
      setQuestions((prev) =>
        prev.map((q) => ({
          ...q,
          tikzBlocks: q.tikzBlocks.map((b) =>
            b.id === block.id
              ? {
                  ...b,
                  status: 'success',
                  hash: data.hash,
                  url: data.url,
                  rawUrl: data.url,
                  width: data.width,
                  height: data.height,
                  format: data.format,
                  engine: data.engine,
                  cached: data.cached,
                  errorMsg: undefined,
                }
              : b
          ),
        }))
      );
    } catch (err: any) {
      console.error(`Lỗi render TikZ ${block.id}:`, err);
      setQuestions((prev) =>
        prev.map((q) => ({
          ...q,
          tikzBlocks: q.tikzBlocks.map((b) =>
            b.id === block.id
              ? {
                  ...b,
                  status: 'error',
                  errorMsg: err.message || 'Lỗi kết nối máy chủ',
                }
              : b
          ),
        }))
      );
    } finally {
      renderingRef.current.delete(block.id);
    }
  };

  // Trigger auto-render for any idle TikZ blocks
  useEffect(() => {
    for (const block of allTikzBlocks) {
      if (block.status === 'idle' && !renderingRef.current.has(block.id)) {
        renderSingleTikz(block);
      }
    }
  }, [allTikzBlocks, settings.tikzResolution]);

  // Handler to manually retry a specific TikZ block
  const handleRetryRender = (blockId: string) => {
    const block = allTikzBlocks.find((b) => b.id === blockId);
    if (block) {
      renderingRef.current.delete(block.id);
      renderSingleTikz(block);
    }
  };

  // Re-render all TikZ blocks
  const handleRecompileAllTikz = () => {
    for (const block of allTikzBlocks) {
      renderingRef.current.delete(block.id);
      renderSingleTikz(block);
    }
  };

  // Load sample exam
  const handleLoadSample = (sampleId: string) => {
    const sample = SAMPLE_EXAMS.find((s) => s.id === sampleId);
    if (sample) {
      setLatexInput(sample.latex);
    }
  };

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setLatexInput(text);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Copy SmartTest to clipboard
  const handleCopySmartTest = async () => {
    const ok = await copySmartTestToClipboard(questions, settings);
    if (ok) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    }
  };

  // Export to Microsoft Word .docx
  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      await exportToDocx(questions, settings, 'De_Thi_SmartTest_MathType.docx');
    } catch (e) {
      console.error('Lỗi khi xuất Word .docx:', e);
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Filter questions by search query
  const filteredQuestions = useMemo(() => {
    if (!searchQuery.trim()) return questions;
    const q = searchQuery.toLowerCase();
    return questions.filter(
      (item) =>
        item.stem.toLowerCase().includes(q) ||
        item.tagId.toLowerCase().includes(q) ||
        item.options.some((opt) => opt.content.toLowerCase().includes(q)) ||
        (item.solution && item.solution.toLowerCase().includes(q))
    );
  }, [questions, searchQuery]);

  // Formatted SmartTest text for Tab 2
  const smartTestFormattedText = useMemo(() => {
    return formatToSmartTestText(questions, settings);
  }, [questions, settings]);

  const readyTikzCount = allTikzBlocks.filter((b) => b.status === 'success').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".tex,.txt,.latex"
        className="hidden"
      />

      {/* TOP BAR CONTRACT: Zone 1 (Wordmark) - Zone 2 (Nav links) - Zone 3 (Primary Action) */}
      <header className="h-16 px-6 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between gap-8 shrink-0 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-md shadow-indigo-600/30">
            ∑
          </div>
          <span className="text-base font-bold tracking-tight text-white">
            ExTest <span className="text-indigo-400 font-normal">→</span> SmartTest
          </span>
        </div>

        {/* Zone 2: Concise single-line text navigation links */}
        <nav className="hidden lg:flex items-center gap-5 text-xs font-medium text-slate-400">
          <button
            onClick={() => handleLoadSample('thpt-chuan-2025')}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Đề mẫu THPT 2025
          </button>
          <button
            onClick={() => handleLoadSample('bang-bien-thien-tkztab')}
            className="hover:text-emerald-400 text-emerald-400/90 transition-colors whitespace-nowrap shrink-0 font-medium"
          >
            Bảng biến thiên (tkz-tab)
          </button>
          <button
            onClick={() => handleLoadSample('bang-thong-ke-tabular')}
            className="hover:text-cyan-400 text-cyan-400/90 transition-colors whitespace-nowrap shrink-0 font-medium"
          >
            Bảng số liệu (tabular)
          </button>
          <button
            onClick={() => handleLoadSample('hinh-hoc-oxyz')}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Hình học Oxyz
          </button>
          <button
            onClick={() => handleOpenTikzStudio()}
            className="hover:text-emerald-300 text-emerald-400 font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/40"
            title="Công cụ vẽ và biên dịch mã TikZ độc lập, tự động lưu vào bộ nhớ tạm"
          >
            <Palette className="w-3.5 h-3.5 text-emerald-400" />
            Vẽ TikZ & Bộ nhớ tạm
          </button>
          <button
            onClick={() => setIsId6ModalOpen(true)}
            className="hover:text-indigo-300 text-indigo-400 font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-950/50 border border-indigo-500/40 hover:bg-indigo-900/50"
            title="Tự động gắn mã ID6 %[2D1B1-1] và tải xuống tệp đề (.tex, .docx, .txt, .csv)"
          >
            <Tag className="w-3.5 h-3.5 text-indigo-400" />
            Gắn ID6 & Tải về
          </button>
          <button
            onClick={() => setIsTikzModalOpen(true)}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
            Hình đề thi ({readyTikzCount}/{allTikzBlocks.length})
          </button>
          <button
            onClick={() => setIsGuideModalOpen(true)}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            Hướng dẫn MathType (Alt+\)
          </button>
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Settings2 className="w-3.5 h-3.5 text-slate-400" />
            Cài đặt
          </button>
        </nav>

        {/* Zone 3: Primary CTA action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsId6ModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-500/40 rounded-lg transition-all shadow-sm whitespace-nowrap shrink-0"
            title="Tự động gắn mã ID6 và mở trung tâm tải xuống (.tex, .docx, .txt, .csv)"
          >
            <FileDown className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tải đề & ID6</span>
          </button>

          <button
            onClick={handleCopySmartTest}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg transition-all shadow-sm ${
              isCopied
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            } whitespace-nowrap shrink-0`}
            title="Sao chép đồng thời văn bản và ảnh nhúng Base64 để dán trực tiếp vào Word hoặc SmartTest"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Đã sao chép!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                Sao chép SmartTest
              </>
            )}
          </button>

          <button
            onClick={handleExportDocx}
            disabled={isExportingDocx || questions.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            {isExportingDocx ? 'Đang tạo Word...' : 'Xuất Word (.docx)'}
          </button>
        </div>
      </header>

      {/* SUB-HEADER / METRIC SUMMARY (Clean unboxed metadata, anti-pill discipline) */}
      <div className="px-6 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 overflow-x-auto">
        <div className="flex items-center gap-3 whitespace-nowrap">
          <span className="text-slate-300 font-medium">{questions.length} câu hỏi nhận diện</span>
          <span aria-hidden="true">·</span>
          <span>{allTikzBlocks.length} hình vẽ TikZ phát hiện</span>
          <span aria-hidden="true">·</span>
          <span className="text-emerald-400 font-mono tabular-nums">
            {readyTikzCount} hình đã render PNG
          </span>
          <span aria-hidden="true">·</span>
          <span>Công thức: MathType TeX Toggle ($...$)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsScannerModalOpen(true)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-colors ${
              scanResult.totalIssues > 0
                ? scanResult.errorCount > 0
                  ? 'bg-red-950/60 text-red-300 border border-red-500/40 hover:bg-red-900/60'
                  : 'bg-amber-950/60 text-amber-300 border border-amber-500/40 hover:bg-amber-900/60'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800'
            }`}
            title="Quét và phát hiện lỗi \\immini, \\begin{center}, thiếu ngoặc, bảng biến thiên tkz-tab"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Quét lỗi đề thi {scanResult.totalIssues > 0 ? `(${scanResult.totalIssues})` : '(Chuẩn)'}</span>
          </button>

          <button
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Trợ lý AI
          </button>
        </div>
      </div>

      {/* MAIN WORKSPACE: SPLIT PANE */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* LEFT PANE (5 cols): LaTeX Input Editor */}
        <section className="lg:col-span-5 flex flex-col border-r border-slate-800 bg-slate-900/40">
          {/* Editor Header Toolbar */}
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2 bg-slate-900/80">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-200">
                Mã nguồn LaTeX (ex_test)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsScannerModalOpen(true)}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-colors ${
                  scanResult.totalIssues > 0
                    ? scanResult.errorCount > 0
                      ? 'bg-red-900/50 text-red-200 border border-red-500/40 hover:bg-red-900/70'
                      : 'bg-amber-900/50 text-amber-200 border border-amber-500/40 hover:bg-amber-900/70'
                    : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/40'
                }`}
                title="Quét và kiểm tra lỗi \\immini, \\begin{center}, ngoặc nhọn, tkz-tab trước khi biên dịch"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                Quét lỗi {scanResult.totalIssues > 0 && `(${scanResult.totalIssues})`}
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                title="Tải file .tex hoặc .txt từ máy tính"
              >
                <Upload className="w-3.5 h-3.5" />
                Mở file .tex
              </button>

              <button
                onClick={() => setIsId6ModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/70 border border-indigo-500/40 rounded transition-colors"
                title="Tự động nhận diện và gắn mã ID6 %[2D1B1-1]"
              >
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                Gắn ID6
              </button>

              <button
                onClick={() => handleOpenTikzStudio()}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/40 rounded transition-colors"
                title="Mở công cụ vẽ TikZ riêng biệt và quản lý bộ nhớ tạm"
              >
                <Palette className="w-3.5 h-3.5 text-emerald-400" />
                Vẽ TikZ & Bộ nhớ tạm
              </button>

              <button
                onClick={handleRecompileAllTikz}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-indigo-300 hover:text-white bg-indigo-900/30 hover:bg-indigo-800/50 rounded transition-colors"
                title="Biên dịch lại toàn bộ các khối hình vẽ TikZ trong đề thi sang PNG"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Render TikZ
              </button>

              <button
                onClick={() => setLatexInput('')}
                className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                title="Xóa trắng mã nguồn"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick preset selector */}
          <div className="px-4 py-2 border-b border-slate-800/60 bg-slate-950/40 flex items-center gap-2 overflow-x-auto text-[11px]">
            <span className="text-slate-400 shrink-0">Chọn mẫu:</span>
            {SAMPLE_EXAMS.map((s) => (
              <button
                key={s.id}
                onClick={() => handleLoadSample(s.id)}
                className={`px-2 py-0.5 rounded text-xs transition-colors shrink-0 ${
                  latexInput === s.latex
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800'
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>

          {/* Textarea Editor */}
          <div className="flex-1 relative p-2 flex flex-col">
            <textarea
              value={latexInput}
              onChange={(e) => setLatexInput(e.target.value)}
              placeholder="Dán mã đề thi LaTeX gói ex_test vào đây... (\begin{ex} ... \choice{...}{...}{...}{...} ... \loigiai{...} \end{ex})"
              className="w-full flex-1 p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 overflow-y-auto"
              spellCheck={false}
            />
          </div>

          {/* Editor Status Bar */}
          <div className="px-4 py-2 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>
              {latexInput.length} ký tự · {latexInput.split('\n').length} dòng
            </span>
            <span>Hỗ trợ: \choice, \choiceTF, \shortans, TikZ, \immini</span>
          </div>
        </section>

        {/* RIGHT PANE (7 cols): SmartTest Output & Visual Preview */}
        <section className="lg:col-span-7 flex flex-col bg-slate-950 overflow-hidden">
          {/* Tabs bar */}
          <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-900/80 shrink-0">
            {/* Segmented Tab Controls (Permitted interactive control) */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'preview'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Xem trước trực quan ({questions.length})
              </button>
              <button
                onClick={() => setActiveTab('smarttest_text')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'smarttest_text'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Văn bản SmartTest / Word
              </button>
              <button
                onClick={() => setActiveTab('tikz_gallery')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'tikz_gallery'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Thư viện TikZ ({allTikzBlocks.length})
              </button>
            </div>

            {/* Live Search Filter */}
            {activeTab === 'preview' && (
              <div className="relative max-w-xs w-full hidden sm:block">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm câu hỏi, mã ID, từ khóa..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          {/* TAB 1: VISUAL PREVIEW */}
          {activeTab === 'preview' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-20 text-slate-500 text-sm">
                  {questions.length === 0
                    ? 'Chưa có câu hỏi nào được phân tích. Hãy nhập mã LaTeX ex_test ở bảng bên trái hoặc chọn đề mẫu.'
                    : 'Không tìm thấy câu hỏi nào phù hợp với bộ lọc tìm kiếm.'}
                </div>
              ) : (
                filteredQuestions.map((q) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    settings={settings}
                    onPreviewImage={(block) => setPreviewImageBlock(block)}
                  />
                ))
              )}
            </div>
          )}

          {/* TAB 2: SMARTTEST TEXT / WORD FORMAT */}
          {activeTab === 'smarttest_text' && (
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
              <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Định dạng chữ chuẩn SmartTest với dấu hoa thị{' '}
                  <code className="text-indigo-400 font-bold">*A.</code> cho đáp án đúng và công thức TeX Toggle cho MathType:
                </span>
                <button
                  onClick={handleCopySmartTest}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs text-indigo-300 hover:text-white bg-indigo-900/40 hover:bg-indigo-800/60 rounded border border-indigo-700/50 transition-colors"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopied ? 'Đã sao chép' : 'Sao chép văn bản'}
                </button>
              </div>

              <textarea
                readOnly
                value={smartTestFormattedText}
                className="w-full flex-1 p-4 bg-slate-900/80 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs leading-relaxed resize-none focus:outline-none select-all overflow-y-auto"
              />

              <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-800/60 text-xs text-slate-400 flex items-center justify-between">
                <span>
                  Mẹo: Nhấn nút <strong>"Sao chép SmartTest"</strong> ở góc trên để dán trực tiếp vào Word (bao gồm cả ảnh hình vẽ TikZ)!
                </span>
                <button
                  onClick={() => setIsGuideModalOpen(true)}
                  className="text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
                >
                  Xem hướng dẫn Alt+\
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: TIKZ GALLERY */}
          {activeTab === 'tikz_gallery' && (
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Các hình vẽ TikZ trong đề thi ({allTikzBlocks.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Toàn bộ mã TikZ đã được chuyển thành ảnh PNG nền trong suốt/trắng, sẵn sàng chèn trực tiếp.
                  </p>
                </div>

                {readyTikzCount > 0 && (
                  <button
                    onClick={() => setIsTikzModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Tải file nén .ZIP
                  </button>
                )}
              </div>

              {allTikzBlocks.length === 0 ? (
                <div className="text-center py-20 text-slate-500 text-sm">
                  Chưa phát hiện khối <code className="text-indigo-400">\begin{'{'}tikzpicture{'}'}</code> nào trong đề thi.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allTikzBlocks.map((block, idx) => (
                    <div
                      key={block.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-200">
                            Hình {idx + 1} ({block.id})
                          </span>
                          <span
                            className={`text-[11px] font-mono ${
                              block.status === 'success'
                                ? 'text-emerald-400'
                                : block.status === 'rendering'
                                ? 'text-amber-400'
                                : block.status === 'error'
                                ? 'text-red-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {block.status === 'success' && 'Đã render PNG'}
                            {block.status === 'rendering' && 'Đang render...'}
                            {block.status === 'error' && 'Lỗi'}
                            {block.status === 'idle' && 'Chờ xử lý'}
                          </span>
                        </div>

                        {/* Image Preview Container */}
                        <div
                          className="bg-white rounded-lg p-3 flex items-center justify-center min-h-[160px] border border-slate-800 cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all overflow-hidden mb-3"
                          onClick={() => (block.url || block.dataUrl) && setPreviewImageBlock(block)}
                        >
                          {block.url || block.dataUrl ? (
                            <img
                              src={block.url || block.dataUrl}
                              alt={block.id}
                              className="max-h-36 max-w-full object-contain"
                              loading="lazy"
                            />
                          ) : block.status === 'rendering' ? (
                            <div className="flex flex-col items-center gap-2 text-slate-500">
                              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                              <span className="text-xs font-mono">Đang render PNG...</span>
                            </div>
                          ) : block.status === 'error' ? (
                            <div className="text-center text-xs text-red-600 p-2">
                              <div className="font-semibold">Lỗi biên dịch TikZ</div>
                              <div className="text-[10px] mt-1 text-slate-600 line-clamp-2">
                                {block.errorMsg}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-mono">Chưa biên dịch</span>
                          )}
                        </div>

                        {block.width && block.height ? (
                          <div className="text-[11px] text-slate-400 font-mono mb-2 flex items-center justify-between">
                            <span>{block.width} × {block.height} px</span>
                            {block.hash && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                Mã: {block.hash.slice(0, 8)}
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800 flex-wrap">
                        {block.url && (
                          <button
                            onClick={async () => {
                              const fullUrl = `${window.location.origin}${block.url}`;
                              await navigator.clipboard.writeText(fullUrl);
                              alert(`Đã sao chép link ảnh URL:\n${fullUrl}`);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                            title="Sao chép đường link URL của ảnh"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                            Link URL
                          </button>
                        )}

                        {(block.url || block.dataUrl) && (
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = block.url || block.dataUrl!;
                              link.download = `hinh_ve_tikz_${idx + 1}.png`;
                              link.click();
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Tải PNG
                          </button>
                        )}

                        <button
                          onClick={() => handleRetryRender(block.id)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs text-indigo-300 hover:text-white bg-indigo-900/40 hover:bg-indigo-800/60 rounded ml-auto transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Render lại
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* IMAGE ENLARGED MODAL */}
      {previewImageBlock && previewImageBlock.dataUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setPreviewImageBlock(null)}
        >
          <div
            className="bg-slate-900 border border-slate-750 rounded-xl max-w-2xl w-full p-6 shadow-2xl overflow-hidden flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <span className="text-sm font-semibold text-white">
                Hình vẽ TikZ: {previewImageBlock.id} ({previewImageBlock.width} × {previewImageBlock.height} px)
              </span>
              <button
                onClick={() => setPreviewImageBlock(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-slate-800"
              >
                Đóng (Esc)
              </button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-inner max-w-full overflow-auto mb-4">
              <img
                src={previewImageBlock.dataUrl}
                alt={previewImageBlock.id}
                className="max-h-[60vh] max-w-full object-contain mx-auto"
              />
            </div>

            <div className="w-full flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = previewImageBlock.dataUrl!;
                  link.download = `${previewImageBlock.id}.png`;
                  link.click();
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Tải ảnh PNG này
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALL MODALS */}
      <TikzGalleryModal
        isOpen={isTikzModalOpen}
        onClose={() => setIsTikzModalOpen(false)}
        tikzBlocks={allTikzBlocks}
        onRetryRender={handleRetryRender}
      />

      <ConversionSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={(newSettings) => setSettings(newSettings)}
      />

      <MathTypeGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />

      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        currentLatex={latexInput}
        onApplyFixedLatex={(fixed) => setLatexInput(fixed)}
      />

      <ScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        scanResult={scanResult}
        onAutoFix={handleAutoFix}
        onOpenAiAssistant={() => {
          setIsScannerModalOpen(false);
          setIsAiModalOpen(true);
        }}
      />

      <TikzStudioModal
        isOpen={isTikzStudioOpen}
        onClose={() => setIsTikzStudioOpen(false)}
        onInsertIntoExam={handleInsertTikzIntoLatex}
        initialCode={studioInitialCode}
      />

      <Id6ManagerModal
        isOpen={isId6ModalOpen}
        onClose={() => setIsId6ModalOpen(false)}
        questions={questions}
        currentLatex={latexInput}
        onApplyUpdatedLatex={(newLatex) => setLatexInput(newLatex)}
        settings={settings}
      />
    </div>
  );
}
