import React, { useMemo, useState } from 'react';
import katex from 'katex';
import { TikzBlock } from '../types';
import { TabularBlock, tabularBlockToTsv } from '../utils/tabularParser';
import { Table as TableIcon, Copy, Check } from 'lucide-react';

interface MathRendererProps {
  content: string;
  tikzBlocks?: TikzBlock[];
  tabularBlocks?: TabularBlock[];
  className?: string;
  onPreviewImage?: (block: TikzBlock) => void;
}

const TabularRenderer: React.FC<{
  table: TabularBlock;
  tikzBlocks: TikzBlock[];
  tabularBlocks: TabularBlock[];
  onPreviewImage?: (block: TikzBlock) => void;
}> = ({ table, tikzBlocks, tabularBlocks, onPreviewImage }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyTsv = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const tsv = tabularBlockToTsv(table);
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy TSV failed:', err);
    }
  };

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-slate-700 bg-slate-900/90 shadow-sm max-w-full">
      {/* Table Subheader Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/80 border-b border-slate-700/70 text-[11px] text-slate-300">
        <div className="flex items-center gap-1.5 font-medium">
          <TableIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span>Bảng dữ liệu</span>
          <span className="font-mono text-slate-400 text-[10px]">({table.id})</span>
        </div>
        <button
          onClick={handleCopyTsv}
          className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          title="Sao chép bảng dạng TSV (dán ngay vào Excel hoặc Word)"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Đã chép</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Chép bảng (Excel)</span>
            </>
          )}
        </button>
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto p-3 flex justify-center">
        <table
          className={`text-xs border-collapse ${
            table.hasBorder ? 'border border-slate-700' : ''
          } bg-slate-950/40 rounded overflow-hidden`}
        >
          <tbody>
            {table.rows.map((row, rIdx) => {
              const isFirstRow = rIdx === 0;
              return (
                <tr
                  key={rIdx}
                  className={
                    isFirstRow
                      ? 'bg-slate-800/90 font-semibold text-slate-100'
                      : 'border-t border-slate-800 hover:bg-slate-800/30 text-slate-200'
                  }
                >
                  {row.map((cell, cIdx) => {
                    const alignClass =
                      cell.align === 'left'
                        ? 'text-left'
                        : cell.align === 'right'
                        ? 'text-right'
                        : 'text-center';

                    return (
                      <td
                        key={cIdx}
                        colSpan={cell.colSpan}
                        style={{ textAlign: cell.align || 'center' }}
                        className={`px-3.5 py-2 ${alignClass} ${
                          table.hasBorder ? 'border border-slate-700/80' : ''
                        }`}
                      >
                        <MathRenderer
                          content={cell.content}
                          tikzBlocks={tikzBlocks}
                          tabularBlocks={tabularBlocks}
                          onPreviewImage={onPreviewImage}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TikzImageCard: React.FC<{
  block: TikzBlock;
  onPreviewImage?: (block: TikzBlock) => void;
}> = ({ block, onPreviewImage }) => {
  const [copied, setCopied] = useState(false);
  const imgSrc = block.url || block.dataUrl;

  const handleCopyImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!imgSrc) return;
    try {
      const res = await fetch(imgSrc);
      const blob = await res.blob();
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type || 'image/png']: blob,
          }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch (err) {
      console.warn('Copy image blob failed:', err);
    }

    if (block.dataUrl) {
      await navigator.clipboard.writeText(block.dataUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="my-3 flex flex-col items-center">
      <div
        className="group relative cursor-pointer bg-white p-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-indigo-500 transition-all max-w-full"
        onClick={() => onPreviewImage && onPreviewImage(block)}
        title="Nhấp để phóng to / tải ảnh"
      >
        <img
          src={imgSrc}
          alt={`Hình vẽ TikZ ${block.id}`}
          className="max-h-72 w-auto object-contain mx-auto"
          loading="lazy"
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
          <button
            onClick={handleCopyImage}
            className="bg-slate-900/90 hover:bg-emerald-600 text-white text-[11px] px-2 py-0.5 rounded shadow flex items-center gap-1 transition-colors"
            title="Sao chép ảnh vào Clipboard để Ctrl+V trực tiếp vào Word"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Đã chép' : 'Chép ảnh (Word)'}</span>
          </button>
          <span className="bg-slate-900/90 text-white text-[11px] px-2 py-0.5 rounded shadow">
            Phóng to
          </span>
        </div>
      </div>
      <span className="text-[11px] text-slate-400 mt-1 font-mono">
        {block.id} · {block.width}×{block.height}px ({block.format?.toUpperCase() || 'PNG'})
        {block.cached && ' · Đã lưu cache ảo'}
      </span>
    </div>
  );
};

export const MathRenderer: React.FC<MathRendererProps> = ({
  content,
  tikzBlocks = [],
  tabularBlocks = [],
  className = '',
  onPreviewImage,
}) => {
  // Map tokens to blocks
  const tikzMap = useMemo(() => {
    const map = new Map<string, TikzBlock>();
    for (const b of tikzBlocks) {
      map.set(b.token, b);
    }
    return map;
  }, [tikzBlocks]);

  const tabularMap = useMemo(() => {
    const map = new Map<string, TabularBlock>();
    for (const t of tabularBlocks) {
      map.set(t.token, t);
    }
    return map;
  }, [tabularBlocks]);

  // Tokenize string into math, tikz tokens, tabular tokens, and plain text
  const renderedElements = useMemo(() => {
    if (!content) return null;

    // Pattern to catch:
    // 1. Display math: $$...$$ or \[...\]
    // 2. Inline math: $...$ or \(...\)
    // 3. Tikz tokens: [[TIKZ_IMG_\d+]]
    // 4. Tabular tokens: [[TABULAR_\d+]]
    const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$\n]+?\$|\\\([\s\S]*?\\\)|\[\[TIKZ_IMG_\d+\]\]|\[\[TABULAR_\d+\]\])/g;

    const parts = content.split(regex);

    return parts.map((part, index) => {
      if (!part) return null;

      // Check if it's a Tabular token
      if (part.startsWith('[[TABULAR_') && part.endsWith(']]')) {
        const table = tabularMap.get(part);
        if (!table) {
          return (
            <div
              key={index}
              className="my-2 p-2 border border-dashed border-slate-700 rounded text-xs text-slate-400 text-center font-mono"
            >
              [Bảng {part}]
            </div>
          );
        }

        return (
          <TabularRenderer
            key={index}
            table={table}
            tikzBlocks={tikzBlocks}
            tabularBlocks={tabularBlocks}
            onPreviewImage={onPreviewImage}
          />
        );
      }

      // Check if it's a TikZ token
      if (part.startsWith('[[TIKZ_IMG_') && part.endsWith(']]')) {
        const block = tikzMap.get(part);
        if (!block) {
          return (
            <div
              key={index}
              className="my-2 p-2 border border-dashed border-slate-700 rounded text-xs text-slate-400 text-center"
            >
              Hình vẽ {part}
            </div>
          );
        }

        if (block.status === 'rendering') {
          return (
            <div
              key={index}
              className="my-3 p-4 bg-slate-800/80 border border-indigo-500/30 rounded-lg flex flex-col items-center justify-center gap-2 text-indigo-300"
            >
              <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono">Đang render mã TikZ thành PNG qua máy chủ...</span>
            </div>
          );
        }

        if (block.status === 'error') {
          return (
            <div
              key={index}
              className="my-3 p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-300"
            >
              <div className="font-semibold mb-1">Lỗi biên dịch TikZ ({block.id}):</div>
              <div className="font-mono text-[11px] text-red-400/80 break-words">
                {block.errorMsg || 'Không thể render'}
              </div>
            </div>
          );
        }

        const imgSrc = block.url || block.dataUrl;
        if (imgSrc) {
          return (
            <TikzImageCard
              key={index}
              block={block}
              onPreviewImage={onPreviewImage}
            />
          );
        }

        return (
          <div
            key={index}
            className="my-2 p-2 border border-dashed border-slate-600 rounded text-xs text-slate-400 text-center"
          >
            {block.id} (Chờ xử lý)
          </div>
        );
      }

      // Check Display Math: $$...$$ or \[...\]
      if (
        (part.startsWith('$$') && part.endsWith('$$')) ||
        (part.startsWith('\\[') && part.endsWith('\\]'))
      ) {
        const rawMath = part.startsWith('$$') ? part.slice(2, -2) : part.slice(2, -2);

        try {
          const html = katex.renderToString(rawMath, {
            displayMode: true,
            throwOnError: false,
          });
          return (
            <span
              key={index}
              className="block my-2 overflow-x-auto text-center"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch (e) {
          return (
            <span key={index} className="font-mono text-xs text-amber-400 block my-1">
              {part}
            </span>
          );
        }
      }

      // Check Inline Math: $...$ or \(...\)
      if (
        (part.startsWith('$') && part.endsWith('$') && part.length > 2) ||
        (part.startsWith('\\(') && part.endsWith('\\)'))
      ) {
        const rawMath = part.startsWith('$') ? part.slice(1, -1) : part.slice(2, -2);

        try {
          const html = katex.renderToString(rawMath, {
            displayMode: false,
            throwOnError: false,
          });
          return (
            <span
              key={index}
              className="inline-block px-0.5"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch (e) {
          return (
            <span key={index} className="font-mono text-xs text-amber-400">
              {part}
            </span>
          );
        }
      }

      // Regular text (convert line breaks)
      return (
        <span key={index} className="whitespace-pre-wrap">
          {part}
        </span>
      );
    });
  }, [content, tikzMap, tabularMap, onPreviewImage, tikzBlocks, tabularBlocks]);

  return <div className={`math-renderer leading-relaxed ${className}`}>{renderedElements}</div>;
};
