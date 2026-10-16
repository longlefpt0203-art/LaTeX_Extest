import React, { useState } from 'react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { TikzBlock } from '../types';
import { Download, Copy, Check, RefreshCw, X, Image as ImageIcon, ExternalLink } from 'lucide-react';

interface TikzGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tikzBlocks: TikzBlock[];
  onRetryRender: (blockId: string) => void;
}

export const TikzGalleryModal: React.FC<TikzGalleryModalProps> = ({
  isOpen,
  onClose,
  tikzBlocks,
  onRetryRender,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  if (!isOpen) return null;

  const handleCopyBase64 = async (block: TikzBlock) => {
    if (!block.dataUrl) return;
    await navigator.clipboard.writeText(block.dataUrl);
    setCopiedId(block.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadSingle = (block: TikzBlock, index: number) => {
    if (!block.dataUrl) return;
    const link = document.createElement('a');
    link.href = block.dataUrl;
    link.download = `hinh_ve_tikz_${index + 1}.png`;
    link.click();
  };

  const handleDownloadZip = async () => {
    if (tikzBlocks.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('hinh_ve_tikz');

      for (let i = 0; i < tikzBlocks.length; i++) {
        const block = tikzBlocks[i];
        if (block.dataUrl) {
          const pureBase64 = block.dataUrl.replace(/^data:image\/\w+;base64,/, '');
          folder?.file(`hinh_tikz_${i + 1}_${block.id}.png`, pureBase64, { base64: true });
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'bo_anh_tikz_png.zip');
    } catch (e) {
      console.error('Lỗi khi tạo file zip:', e);
    } finally {
      setIsZipping(false);
    }
  };

  const readyCount = tikzBlocks.filter((b) => b.dataUrl).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-750 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Quản lý hình vẽ TikZ</h2>
              <p className="text-xs text-slate-400">
                Đã render {readyCount}/{tikzBlocks.length} hình sang PNG độ phân giải cao
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {readyCount > 0 && (
              <button
                onClick={handleDownloadZip}
                disabled={isZipping}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {isZipping ? 'Đang nén zip...' : 'Tải toàn bộ (.zip)'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {tikzBlocks.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Chưa phát hiện khối TikZ nào trong văn bản LaTeX đã nhập.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tikzBlocks.map((block, idx) => (
                <div
                  key={block.id}
                  className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-4 flex flex-col justify-between"
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
                        {block.status === 'success' && 'Hoàn tất'}
                        {block.status === 'rendering' && 'Đang render...'}
                        {block.status === 'error' && 'Lỗi'}
                        {block.status === 'idle' && 'Chờ xử lý'}
                      </span>
                    </div>

                    {/* Image Preview Container */}
                    <div className="bg-white rounded-md p-3 flex items-center justify-center min-h-[160px] border border-slate-700/40 mb-3 overflow-hidden">
                      {block.url || block.dataUrl ? (
                        <img
                          src={block.url || block.dataUrl}
                          alt={block.id}
                          className="max-h-36 max-w-full object-contain"
                        />
                      ) : block.status === 'rendering' ? (
                        <div className="flex flex-col items-center gap-2 text-slate-500">
                          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs">Đang tạo ảnh PNG...</span>
                        </div>
                      ) : block.status === 'error' ? (
                        <div className="text-center text-xs text-red-600 p-2">
                          <div className="font-semibold">Lỗi biên dịch LaTeX</div>
                          <div className="text-[10px] mt-1 text-slate-600 line-clamp-2">
                            {block.errorMsg || 'Cú pháp TikZ không hợp lệ'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Chưa biên dịch</span>
                      )}
                    </div>

                    {/* Dimensions & Info */}
                    {block.width && block.height ? (
                      <div className="text-[11px] text-slate-400 font-mono mb-3 flex items-center justify-between">
                        <span>{block.width} × {block.height} px</span>
                        {block.hash && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            Mã: {block.hash.slice(0, 8)}
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-700/50 flex-wrap">
                    {block.url && (
                      <button
                        onClick={async () => {
                          const fullUrl = `${window.location.origin}${block.url}`;
                          await navigator.clipboard.writeText(fullUrl);
                          setCopiedId(`url-${block.id}`);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-200 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                        title="Sao chép đường link URL của ảnh để nhúng vào web / HTML"
                      >
                        {copiedId === `url-${block.id}` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Đã chép URL</span>
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                            Link URL
                          </>
                        )}
                      </button>
                    )}

                    {(block.url || block.dataUrl) && (
                      <button
                        onClick={() => handleDownloadSingle(block, idx)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-200 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Tải PNG
                      </button>
                    )}

                    <button
                      onClick={() => onRetryRender(block.id)}
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
      </div>
    </div>
  );
};
