import React, { useState } from 'react';
import { ParsedQuestion, ConversionSettings, TikzBlock } from '../types';
import { MathRenderer } from './MathRenderer';
import { formatOptionPrefix, formatQuestionTitle } from '../utils/smartTestFormatter';
import { Check, ChevronDown, ChevronUp, Copy, Code, CheckCircle2 } from 'lucide-react';

interface QuestionCardProps {
  question: ParsedQuestion;
  settings: ConversionSettings;
  onPreviewImage: (block: TikzBlock) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  settings,
  onPreviewImage,
}) => {
  const [showSolution, setShowSolution] = useState(true);
  const [showRawLatex, setShowRawLatex] = useState(false);
  const [copied, setCopied] = useState(false);

  const title = formatQuestionTitle(question.questionNumber, question.tagId, settings);

  const handleCopySingle = async () => {
    // Generate text for this single question
    const lines: string[] = [];
    lines.push(`${title} ${question.stem}`);

    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      const isTF = question.type === 'true_false';
      for (const opt of question.options) {
        const prefix = formatOptionPrefix(opt.letter, opt.isCorrect, settings.correctMarkStyle, isTF);
        lines.push(`${prefix}${opt.content}`);
      }
    } else if (question.type === 'short_answer' && question.shortAnswer) {
      lines.push(`Đáp án: ${question.shortAnswer}`);
    }

    if (settings.includeSolution && question.solution) {
      lines.push(settings.solutionHeader);
      lines.push(question.solution);
    }

    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTypeLabel = () => {
    switch (question.type) {
      case 'multiple_choice':
        return '4 Lựa chọn';
      case 'true_false':
        return 'Đúng/Sai (Bộ GD 2025)';
      case 'short_answer':
        return 'Trả lời ngắn';
      default:
        return 'Tự luận / Bài tập';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700/80 transition-all">
      {/* Question Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-white tracking-tight">
            {settings.questionTitleFormat.replace('{n}', question.questionNumber.toString())}
          </span>

          {question.tagId && settings.includeIdTag && (
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              [{question.tagId}]
            </span>
          )}

          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            {getTypeLabel()}
          </span>

          {question.tikzBlocks.length > 0 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              {question.tikzBlocks.length} hình vẽ TikZ
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowRawLatex(!showRawLatex)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Xem mã LaTeX gốc"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            onClick={handleCopySingle}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Sao chép câu này"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Raw LaTeX Toggle View */}
      {showRawLatex && (
        <div className="mb-4 p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
          <div className="text-[10px] text-slate-400 mb-1 font-semibold uppercase">Mã LaTeX gốc:</div>
          <pre className="whitespace-pre-wrap">{question.rawLatex}</pre>
        </div>
      )}

      {/* Question Stem (renders math + tikz image + tabular tables) */}
      <div className="text-sm text-slate-200 mb-4 leading-relaxed">
        <MathRenderer
          content={question.stem}
          tikzBlocks={question.tikzBlocks}
          tabularBlocks={question.tabularBlocks}
          onPreviewImage={onPreviewImage}
        />
      </div>

      {/* Options for Multiple Choice & True/False */}
      {(question.type === 'multiple_choice' || question.type === 'true_false') && (
        <div className="space-y-2 mb-4">
          {question.options.map((opt, idx) => {
            const isTF = question.type === 'true_false';
            const prefix = formatOptionPrefix(opt.letter, opt.isCorrect, settings.correctMarkStyle, isTF);

            return (
              <div
                key={idx}
                className={`p-2.5 rounded-lg border text-sm transition-colors flex items-start gap-2.5 ${
                  opt.isCorrect
                    ? 'border-indigo-500/40 bg-indigo-500/5 text-slate-100'
                    : 'border-slate-800/80 bg-slate-800/30 text-slate-300'
                }`}
              >
                <span
                  className={`font-semibold shrink-0 ${
                    opt.isCorrect ? 'text-indigo-400' : 'text-slate-400'
                  }`}
                >
                  {prefix}
                </span>

                <div className="flex-1">
                  <MathRenderer
                    content={opt.content}
                    tikzBlocks={question.tikzBlocks}
                    tabularBlocks={question.tabularBlocks}
                    onPreviewImage={onPreviewImage}
                  />
                </div>

                {opt.isCorrect && (
                  <span className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    Đáp án đúng
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Short answer */}
      {question.type === 'short_answer' && question.shortAnswer && (
        <div className="p-3 rounded-lg border border-indigo-500/30 bg-indigo-500/5 mb-4 text-sm flex items-center gap-2">
          <span className="font-semibold text-indigo-300">Đáp án:</span>
          <MathRenderer
            content={question.shortAnswer}
            tikzBlocks={question.tikzBlocks}
            tabularBlocks={question.tabularBlocks}
            onPreviewImage={onPreviewImage}
          />
        </div>
      )}

      {/* Solution Section */}
      {question.solution && settings.includeSolution && (
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <button
            onClick={() => setShowSolution(!showSolution)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors mb-2"
          >
            <span className="flex items-center gap-1.5 text-indigo-400">
              {settings.solutionHeader}
            </span>
            {showSolution ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showSolution && (
            <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800/60 text-xs text-slate-300 leading-relaxed">
              <MathRenderer
                content={question.solution}
                tikzBlocks={question.tikzBlocks}
                tabularBlocks={question.tabularBlocks}
                onPreviewImage={onPreviewImage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
