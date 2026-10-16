import { ParsedQuestion, ConversionSettings, ChoiceOption, TikzBlock } from '../types';
import { TabularBlock, tabularBlockToHtml, tabularBlockToAscii } from './tabularParser';

/**
 * Formats choice prefix based on settings (e.g. *B. or <u>B.</u> or [B])
 */
export function formatOptionPrefix(
  letter: string,
  isCorrect: boolean,
  style: ConversionSettings['correctMarkStyle'],
  isTrueFalse: boolean = false
): string {
  // Normalize letter: 'A' -> 'A.' or 'a)'
  const baseLetter = isTrueFalse
    ? letter.includes(')') ? letter : `${letter})`
    : letter.includes('.') ? letter : `${letter}.`;

  if (!isCorrect) {
    return `${baseLetter} `;
  }

  switch (style) {
    case 'star':
      return `*${baseLetter} `;
    case 'underline':
      return `<u>${baseLetter}</u> `;
    case 'bracket':
      return `[${letter.replace(/[\.\)]/g, '')}] `;
    case 'bold':
      return `**${baseLetter}** `;
    default:
      return `*${baseLetter} `;
  }
}

/**
 * Formats question title (e.g. "Câu 1: [2D1Y1-1]" or "Câu 1.")
 */
export function formatQuestionTitle(
  questionNumber: number,
  tagId: string,
  settings: ConversionSettings
): string {
  let title = settings.questionTitleFormat.replace('{n}', questionNumber.toString());

  if (settings.includeIdTag && tagId) {
    title = `${title} [${tagId}]`;
  }

  return title;
}

/**
 * Replaces TikZ and Tabular placeholder tokens with either image HTML/table or text representation
 */
export function substituteTokens(
  text: string,
  tikzBlocks: TikzBlock[],
  tabularBlocks: TabularBlock[],
  mode: 'text' | 'html'
): string {
  let output = text;

  // 1. Substitute TikZ blocks
  for (const block of tikzBlocks) {
    if (mode === 'html') {
      const imgSrc = block.url || block.dataUrl;
      if (imgSrc) {
        const imgTag = `<div class="tikz-img-container" style="text-align: center; margin: 12px 0;"><img src="${imgSrc}" alt="Hình vẽ ${block.id}" style="max-width: 100%; height: auto; display: inline-block; border-radius: 4px;" /></div>`;
        output = output.replace(block.token, imgTag);
      } else if (block.status === 'rendering') {
        output = output.replace(
          block.token,
          `<div class="tikz-placeholder" style="padding: 10px; border: 1px dashed #cbd5e1; text-align: center; color: #64748b; font-size: 13px;">[Đang chuyển đổi hình vẽ TikZ...]</div>`
        );
      } else if (block.status === 'error') {
        output = output.replace(
          block.token,
          `<div class="tikz-error" style="padding: 8px; border: 1px solid #fecaca; background: #fef2f2; color: #b91c1c; font-size: 12px;">[Lỗi vẽ TikZ: ${block.errorMsg || 'Không biên dịch được'}]</div>`
        );
      } else {
        output = output.replace(
          block.token,
          `<div class="tikz-placeholder" style="padding: 8px; border: 1px dashed #cbd5e1; text-align: center; color: #64748b; font-size: 12px;">[Hình vẽ TikZ ${block.id}]</div>`
        );
      }
    } else {
      // Plain text mode
      if (block.url || block.dataUrl) {
        const imgRef = block.url ? block.url : `${block.id} (Đã chèn PNG)`;
        output = output.replace(block.token, `\n[Hình vẽ: ${imgRef}]\n`);
      } else {
        output = output.replace(block.token, `\n[Hình vẽ TikZ ${block.id}]\n`);
      }
    }
  }

  // 2. Substitute Tabular blocks
  for (const table of tabularBlocks || []) {
    if (mode === 'html') {
      output = output.replace(table.token, tabularBlockToHtml(table));
    } else {
      output = output.replace(table.token, `\n${tabularBlockToAscii(table)}\n`);
    }
  }

  return output;
}

/**
 * Replaces TikZ placeholder tokens (retained for backward compatibility)
 */
export function substituteTikzTokens(
  text: string,
  tikzBlocks: TikzBlock[],
  mode: 'text' | 'html'
): string {
  return substituteTokens(text, tikzBlocks, [], mode);
}

/**
 * Generates Plain Text representation for SmartTest / Azota / Subre
 */
export function formatToSmartTestText(
  questions: ParsedQuestion[],
  settings: ConversionSettings
): string {
  const chunks: string[] = [];

  for (const q of questions) {
    const lines: string[] = [];
    const tabulars = q.tabularBlocks || [];

    // Title & Stem
    const title = formatQuestionTitle(q.questionNumber, q.tagId, settings);
    let stemText = substituteTokens(q.stem, q.tikzBlocks, tabulars, 'text');
    lines.push(`${title} ${stemText}`);

    // Options
    if (q.type === 'multiple_choice' || q.type === 'true_false') {
      const isTF = q.type === 'true_false';
      for (const opt of q.options) {
        const prefix = formatOptionPrefix(opt.letter, opt.isCorrect, settings.correctMarkStyle, isTF);
        const optText = substituteTokens(opt.content, q.tikzBlocks, tabulars, 'text');
        lines.push(`${prefix}${optText}`);
      }
    } else if (q.type === 'short_answer' && q.shortAnswer) {
      lines.push(`Đáp án: ${substituteTokens(q.shortAnswer, q.tikzBlocks, tabulars, 'text')}`);
    }

    // Solution
    if (settings.includeSolution && q.solution) {
      const solText = substituteTokens(q.solution, q.tikzBlocks, tabulars, 'text');
      lines.push(`${settings.solutionHeader}`);
      lines.push(solText);
    }

    chunks.push(lines.join('\n'));
  }

  return chunks.join('\n\n');
}

/**
 * Generates Rich HTML representation for copying directly to Word with embedded PNGs and tables!
 */
export function formatToSmartTestHtml(
  questions: ParsedQuestion[],
  settings: ConversionSettings
): string {
  const parts: string[] = [];

  for (const q of questions) {
    const qParts: string[] = [];
    const tabulars = q.tabularBlocks || [];

    const title = formatQuestionTitle(q.questionNumber, q.tagId, settings);
    const stemHtml = substituteTokens(q.stem, q.tikzBlocks, tabulars, 'html');

    qParts.push(`<p style="margin-bottom: 8px;"><strong>${title}</strong> ${stemHtml}</p>`);

    if (q.type === 'multiple_choice' || q.type === 'true_false') {
      const isTF = q.type === 'true_false';
      const optHtmls = q.options.map((opt) => {
        const prefix = formatOptionPrefix(opt.letter, opt.isCorrect, settings.correctMarkStyle, isTF);
        const content = substituteTokens(opt.content, q.tikzBlocks, tabulars, 'html');
        return `<p style="margin: 4px 0 4px 20px;"><strong>${prefix}</strong>${content}</p>`;
      });
      qParts.push(optHtmls.join(''));
    } else if (q.type === 'short_answer' && q.shortAnswer) {
      const ans = substituteTokens(q.shortAnswer, q.tikzBlocks, tabulars, 'html');
      qParts.push(`<p style="margin: 4px 0 4px 20px;"><strong>Đáp án:</strong> ${ans}</p>`);
    }

    if (settings.includeSolution && q.solution) {
      const sol = substituteTokens(q.solution, q.tikzBlocks, tabulars, 'html');
      qParts.push(
        `<div style="margin-top: 10px; padding: 8px 12px; background-color: #f8fafc; border-left: 3px solid #64748b;">` +
          `<p style="margin: 0 0 4px 0; font-weight: bold; color: #334155;">${settings.solutionHeader}</p>` +
          `<p style="margin: 0;">${sol}</p>` +
          `</div>`
      );
    }

    parts.push(`<div class="smarttest-question" style="margin-bottom: 24px;">${qParts.join('')}</div>`);
  }

  return parts.join('\n');
}

/**
 * Copies rich HTML and Plain text simultaneously to the user's clipboard!
 * When pasted into Microsoft Word, Word receives the HTML version with all images and tables!
 */
export async function copySmartTestToClipboard(
  questions: ParsedQuestion[],
  settings: ConversionSettings
): Promise<boolean> {
  const plainText = formatToSmartTestText(questions, settings);
  const htmlContent = formatToSmartTestHtml(questions, settings);

  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      const htmlBlob = new Blob(
        [
          `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: 'Times New Roman', serif; font-size: 14pt;">${htmlContent}</body></html>`,
        ],
        { type: 'text/html' }
      );

      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': textBlob,
          'text/html': htmlBlob,
        }),
      ]);
      return true;
    } else {
      // Fallback to text copy
      await navigator.clipboard.writeText(plainText);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard write failed, falling back to writeText:', err);
    try {
      await navigator.clipboard.writeText(plainText);
      return true;
    } catch (e) {
      console.error('Copy failed:', e);
      return false;
    }
  }
}
