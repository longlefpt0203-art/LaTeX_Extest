import React, { useState, useMemo } from 'react';
import {
  ParsedQuestion,
  ConversionSettings,
} from '../types';
import {
  parseID6,
  buildID6String,
  detectID6ForQuestion,
  injectID6IntoLatex,
  downloadFile,
  exportID6MatrixToCsv,
  ID6Structure,
} from '../utils/id6Manager';
import { formatToSmartTestText } from '../utils/smartTestFormatter';
import { exportToDocx } from '../utils/docxExporter';
import {
  X,
  Tag,
  Download,
  FileCode,
  FileText,
  Table as TableIcon,
  CheckCircle2,
  Sparkles,
  Layers,
  Wrench,
  Check,
  RefreshCw,
  Sliders,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-react';

interface Id6ManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: ParsedQuestion[];
  currentLatex: string;
  onApplyUpdatedLatex: (updatedLatex: string) => void;
  settings: ConversionSettings;
}

export const Id6ManagerModal: React.FC<Id6ManagerModalProps> = ({
  isOpen,
  onClose,
  questions,
  currentLatex,
  onApplyUpdatedLatex,
  settings,
}) => {
  const [activeTab, setActiveTab] = useState<'auto' | 'batch' | 'download'>('auto');

  // Auto-assign options
  const [overrideExisting, setOverrideExisting] = useState<boolean>(false);
  const [customMap, setCustomMap] = useState<Record<number, string>>({});
  const [isApplied, setIsApplied] = useState<boolean>(false);
  const [isExportingDocx, setIsExportingDocx] = useState<boolean>(false);

  // Batch config state
  const [batchGrade, setBatchGrade] = useState<'2' | '1' | '0' | '9'>('2');
  const [batchSubject, setBatchSubject] = useState<'D' | 'H' | 'X'>('D');
  const [batchChapter, setBatchChapter] = useState<number>(1);
  const [batchLevel, setBatchLevel] = useState<'Y' | 'B' | 'K' | 'G'>('B');
  const [batchLesson, setBatchLesson] = useState<number>(1);
  const [autoIncrementSubtype, setAutoIncrementSubtype] = useState<boolean>(true);

  // Generate suggested ID6 list for questions
  const questionSuggestions = useMemo(() => {
    return questions.map((q, idx) => {
      const detected = detectID6ForQuestion(q.rawLatex || q.stem, idx);
      const chosenId = customMap[q.questionNumber] || (overrideExisting ? detected.raw : q.tagId || detected.raw);
      const parsed = parseID6(chosenId);

      return {
        questionNumber: q.questionNumber,
        currentTag: q.tagId,
        hasTag: Boolean(q.tagId),
        suggestedTag: chosenId,
        parsed,
        stemSnippet: q.stem.replace(/\\\[[\s\S]*?\\\]/g, ' ').replace(/\$\$[\s\S]*?\$\$/g, ' ').slice(0, 90),
        type: q.type,
      };
    });
  }, [questions, customMap, overrideExisting]);

  // Statistics
  const totalCount = questions.length;
  const taggedCount = questions.filter((q) => q.tagId).length;
  const missingCount = totalCount - taggedCount;

  if (!isOpen) return null;

  // Handle single ID update
  const handleUpdateSingleId = (qNum: number, newId: string) => {
    setCustomMap((prev) => ({
      ...prev,
      [qNum]: newId.trim(),
    }));
  };

  // Change cognitive level quickly for a question
  const handleChangeLevel = (qNum: number, newLevel: 'Y' | 'B' | 'K' | 'G') => {
    const item = questionSuggestions.find((s) => s.questionNumber === qNum);
    if (!item) return;

    const newId = buildID6String(
      item.parsed.grade,
      item.parsed.subject,
      item.parsed.chapter,
      newLevel,
      item.parsed.lesson,
      item.parsed.subType
    );

    handleUpdateSingleId(qNum, newId);
  };

  // Apply Auto-Detected ID6 to current LaTeX
  const handleApplyAutoID6 = () => {
    const { updatedLatex } = injectID6IntoLatex(currentLatex, {
      overrideExisting,
      customIdMap: customMap,
    });

    onApplyUpdatedLatex(updatedLatex);
    setIsApplied(true);
    setTimeout(() => setIsApplied(false), 2500);
  };

  // Apply Batch ID6 to current LaTeX
  const handleApplyBatchID6 = () => {
    const newMap: Record<number, string> = {};

    questions.forEach((q, idx) => {
      const sub = autoIncrementSubtype ? idx + 1 : 1;
      newMap[q.questionNumber] = buildID6String(
        batchGrade,
        batchSubject,
        batchChapter,
        batchLevel,
        batchLesson,
        sub
      );
    });

    const { updatedLatex } = injectID6IntoLatex(currentLatex, {
      overrideExisting: true,
      customIdMap: newMap,
    });

    onApplyUpdatedLatex(updatedLatex);
    setCustomMap(newMap);
    setIsApplied(true);
    setTimeout(() => setIsApplied(false), 2500);
  };

  // 1. Download .tex
  const handleDownloadTex = () => {
    // Generate latest content with ID6
    const { updatedLatex } = injectID6IntoLatex(currentLatex, {
      overrideExisting: true,
      customIdMap: customMap,
    });

    downloadFile(updatedLatex, 'De_Thi_ID6_Chuan.tex', 'text/x-tex;charset=utf-8');
  };

  // 2. Download .txt (SmartTest format)
  const handleDownloadSmartTest = () => {
    const textContent = formatToSmartTestText(questions, settings);
    downloadFile(textContent, 'De_Thi_SmartTest_ID6.txt', 'text/plain;charset=utf-8');
  };

  // 3. Download .docx (Word format)
  const handleDownloadDocx = async () => {
    setIsExportingDocx(true);
    try {
      await exportToDocx(questions, settings, 'De_Thi_SmartTest_ID6.docx');
    } catch (e) {
      console.error('Lỗi xuất docx:', e);
    } finally {
      setIsExportingDocx(false);
    }
  };

  // 4. Download Matrix CSV
  const handleDownloadCsvMatrix = () => {
    const csvContent = exportID6MatrixToCsv(
      questionSuggestions.map((s) => ({
        questionNumber: s.questionNumber,
        tagId: s.suggestedTag,
        type: s.type,
        stem: s.stemSnippet,
      }))
    );

    downloadFile(csvContent, 'Ma_Tran_De_Thi_ID6.csv', 'text/csv;charset=utf-8');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Tự động gắn mã ID6 & Tải xuống đề thi
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {totalCount} câu hỏi · {taggedCount} đã có ID6 · {missingCount} chưa có
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Chuẩn hóa mã phân loại câu hỏi %[2D1B1-1] theo cấu trúc Bộ GD&ĐT (Lớp - Môn - Chương - Mức độ - Bài - Dạng)
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

        {/* Tab Navigation Bar */}
        <div className="px-6 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-6 text-xs font-medium">
            <button
              onClick={() => setActiveTab('auto')}
              className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'auto'
                  ? 'border-indigo-500 text-indigo-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>1. Tự động nhận diện ID6 ({questionSuggestions.length} câu)</span>
            </button>

            <button
              onClick={() => setActiveTab('batch')}
              className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'batch'
                  ? 'border-indigo-500 text-indigo-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>2. Gắn ID6 theo Ma trận hàng loạt</span>
            </button>

            <button
              onClick={() => setActiveTab('download')}
              className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'download'
                  ? 'border-indigo-500 text-indigo-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>3. Tải xuống tệp đề (.tex, .docx, .txt, .csv)</span>
            </button>
          </div>

          {isApplied && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium animate-fade-in">
              <Check className="w-3.5 h-3.5" />
              Đã cập nhật mã ID6 vào đề thi!
            </span>
          )}
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[360px]">
          {/* TAB 1: SMART AUTO-DETECT */}
          {activeTab === 'auto' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="overrideOpt"
                      checked={!overrideExisting}
                      onChange={() => setOverrideExisting(false)}
                      className="text-indigo-600 focus:ring-0"
                    />
                    <span>Chỉ gắn ID cho các câu chưa có mã</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="overrideOpt"
                      checked={overrideExisting}
                      onChange={() => setOverrideExisting(true)}
                      className="text-indigo-600 focus:ring-0"
                    />
                    <span>Chuẩn hóa & Ghi đè toàn bộ ID6</span>
                  </label>
                </div>

                <button
                  onClick={handleApplyAutoID6}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Áp dụng mã ID6 vào đề thi</span>
                </button>
              </div>

              {/* Table of questions and assigned ID6 */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-700/80">
                      <th className="py-2.5 px-3 w-16 text-center">Câu</th>
                      <th className="py-2.5 px-3 w-36">Mã ID6</th>
                      <th className="py-2.5 px-3 w-44">Mức độ nhận thức</th>
                      <th className="py-2.5 px-3">Chi tiết phân loại & Nội dung</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {questionSuggestions.map((item) => (
                      <tr key={item.questionNumber} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-2.5 px-3 text-center font-bold text-white">
                          #{item.questionNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={item.suggestedTag}
                            onChange={(e) => handleUpdateSingleId(item.questionNumber, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-indigo-300 font-semibold focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            {(['Y', 'B', 'K', 'G'] as const).map((lvl) => (
                              <button
                                key={lvl}
                                onClick={() => handleChangeLevel(item.questionNumber, lvl)}
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                                  item.parsed.level === lvl
                                    ? lvl === 'Y'
                                      ? 'bg-blue-600 text-white'
                                      : lvl === 'B'
                                      ? 'bg-emerald-600 text-white'
                                      : lvl === 'K'
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-red-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                                }`}
                                title={
                                  lvl === 'Y'
                                    ? 'Nhận biết (Y)'
                                    : lvl === 'B'
                                    ? 'Thông hiểu (B)'
                                    : lvl === 'K'
                                    ? 'Vận dụng (K)'
                                    : 'Vận dụng cao (G)'
                                }
                              >
                                {lvl}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-[11px] font-medium text-emerald-400 mb-0.5">
                            {item.parsed.description}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-lg">
                            {item.stemSnippet}...
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: BATCH MATRIX GENERATOR */}
          {activeTab === 'batch' && (
            <div className="space-y-6 max-w-2xl mx-auto py-2">
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300">
                <p className="font-semibold text-white mb-1">Thiết lập mẫu ID6 chung cho toàn bộ câu hỏi:</p>
                <p className="text-slate-400">
                  Thích hợp khi bạn vừa soạn một bài kiểm tra theo 1 chủ đề hoặc 1 chương nhất định. Hệ thống sẽ áp dụng đồng loạt và tự động tăng số thứ tự dạng câu.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Grade */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Lớp học:</label>
                  <select
                    value={batchGrade}
                    onChange={(e) => setBatchGrade(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="2">Lớp 12 (Mã: 2)</option>
                    <option value="1">Lớp 11 (Mã: 1)</option>
                    <option value="0">Lớp 10 (Mã: 0)</option>
                    <option value="9">Lớp 9 (Mã: 9)</option>
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phân môn:</label>
                  <select
                    value={batchSubject}
                    onChange={(e) => setBatchSubject(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="D">Giải tích / Đại số (D)</option>
                    <option value="H">Hình học (H)</option>
                    <option value="X">Xác suất & Thống kê (X)</option>
                  </select>
                </div>

                {/* Chapter */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Chương:</label>
                  <select
                    value={batchChapter}
                    onChange={(e) => setBatchChapter(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {[1, 2, 3, 4, 5, 6].map((c) => (
                      <option key={c} value={c}>
                        Chương {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Level */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mức độ nhận thức:</label>
                  <select
                    value={batchLevel}
                    onChange={(e) => setBatchLevel(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Y">Y - Nhận biết (1)</option>
                    <option value="B">B - Thông hiểu (2)</option>
                    <option value="K">K - Vận dụng (3)</option>
                    <option value="G">G - Vận dụng cao (4)</option>
                  </select>
                </div>

                {/* Lesson */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Bài trong chương:</label>
                  <select
                    value={batchLesson}
                    onChange={(e) => setBatchLesson(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {[1, 2, 3, 4, 5].map((l) => (
                      <option key={l} value={l}>
                        Bài {l}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subtype toggle */}
                <div className="flex flex-col justify-center">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-4">
                    <input
                      type="checkbox"
                      checked={autoIncrementSubtype}
                      onChange={(e) => setAutoIncrementSubtype(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-0"
                    />
                    <span>Tăng thứ tự dạng (-1, -2, ...)</span>
                  </label>
                </div>
              </div>

              {/* Sample preview box */}
              <div className="p-4 bg-slate-900 rounded-xl border border-indigo-500/30 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Mẫu mã ID6 sẽ tạo:</div>
                  <div className="font-mono text-base font-bold text-indigo-400 mt-0.5">
                    %[{buildID6String(batchGrade, batchSubject, batchChapter, batchLevel, batchLesson, autoIncrementSubtype ? 1 : undefined)}]
                  </div>
                </div>

                <button
                  onClick={handleApplyBatchID6}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Áp dụng cho tất cả {totalCount} câu hỏi</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: DOWNLOAD HUB */}
          {activeTab === 'download' && (
            <div className="space-y-6 max-w-3xl mx-auto py-2">
              <div className="text-center mb-6">
                <h3 className="text-base font-bold text-white mb-1">
                  Trung tâm Tải xuống Đề thi đã gắn mã ID6
                </h3>
                <p className="text-xs text-slate-400">
                  Chọn định dạng bạn muốn xuất. Tất cả các tệp đều được đồng bộ hóa mã ID6, công thức toán và hình ảnh TikZ.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. LaTeX (.tex) */}
                <div className="bg-slate-950/70 border border-slate-800 hover:border-indigo-500/50 p-5 rounded-2xl flex flex-col justify-between transition-all group">
                  <div>
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <FileCode className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Tệp LaTeX (.tex) chuẩn</h4>
                        <span className="text-[11px] text-slate-400">Mã nguồn ex_test gắn %[ID6]</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Tệp .tex thuần UTF-8 chứa đầy đủ mã `%[ID6]`, cấu trúc \begin{'{'}ex{'}'}, \choice, hình vẽ TikZ và lời giải. Tương thích 100% với TeXStudio, TeXmaker, Overleaf.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadTex}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải tệp .tex (LaTeX)</span>
                  </button>
                </div>

                {/* 2. Word (.docx) */}
                <div className="bg-slate-950/70 border border-slate-800 hover:border-blue-500/50 p-5 rounded-2xl flex flex-col justify-between transition-all group">
                  <div>
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Tệp Word (.docx) MathType</h4>
                        <span className="text-[11px] text-slate-400">Gắn ID6 & Chèn ảnh TikZ PNG</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Tệp Word chứa mã `[ID6]` tại tiêu đề từng câu, công thức định dạng chuẩn $...$ cho MathType (Alt+\), bảng Word và ảnh TikZ chất lượng cao.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadDocx}
                    disabled={isExportingDocx}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isExportingDocx ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang xuất Word...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Tải tệp .docx (Word)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 3. SmartTest (.txt) */}
                <div className="bg-slate-950/70 border border-slate-800 hover:border-emerald-500/50 p-5 rounded-2xl flex flex-col justify-between transition-all group">
                  <div>
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Tệp SmartTest / Azota (.txt)</h4>
                        <span className="text-[11px] text-slate-400">Định dạng nạp ngân hàng đề thi</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Văn bản thuần chuẩn hóa theo mẫu SmartTest / Azota / Subre: `Câu 1: [ID6]`, phương án đúng `*A.` hoặc `<u>A.</u>`, sẵn sàng import vào hệ thống thi online.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadSmartTest}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải tệp .txt (SmartTest)</span>
                  </button>
                </div>

                {/* 4. CSV Matrix */}
                <div className="bg-slate-950/70 border border-slate-800 hover:border-amber-500/50 p-5 rounded-2xl flex flex-col justify-between transition-all group">
                  <div>
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Ma trận đề & ID6 (.csv)</h4>
                        <span className="text-[11px] text-slate-400">Mở ngay trong Excel / Sheets</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Bảng ma trận tổng hợp các câu hỏi theo Lớp, Phân môn, Chương và 4 mức độ nhận thức (Y, B, K, G), hỗ trợ UTF-8 BOM hiển thị tiếng Việt hoàn hảo.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadCsvMatrix}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-colors shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải bảng Ma trận (.csv)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>Định dạng mã:</span>
            <span className="font-mono text-indigo-300 font-semibold">%[2D1B1-1]</span>
            <span aria-hidden="true">·</span>
            <span>Tự động cập nhật vào đề thi và tài liệu xuất ra</span>
          </div>

          <div className="flex items-center gap-2">
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
