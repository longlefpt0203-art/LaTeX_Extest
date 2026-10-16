import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';
import saveAs from 'file-saver';
import { ParsedQuestion, ConversionSettings, TikzBlock } from '../types';
import { TabularBlock } from './tabularParser';
import { formatOptionPrefix, formatQuestionTitle } from './smartTestFormatter';

function base64ToUint8Array(base64: string): Uint8Array {
  const pureBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
  const binaryString = atob(pureBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Creates a native Microsoft Word Table from a parsed TabularBlock
 */
function createDocxTableFromBlock(block: TabularBlock, fontSizePt: number = 12): Table {
  const tableRows: TableRow[] = block.rows.map((row, rIdx) => {
    const isFirstRow = rIdx === 0;

    const cells: TableCell[] = row.map((cell) => {
      const align =
        cell.align === 'left'
          ? AlignmentType.LEFT
          : cell.align === 'right'
          ? AlignmentType.RIGHT
          : AlignmentType.CENTER;

      // Clean formula signs $ for Word table text
      const cleanContent = cell.content
        .replace(/\$/g, '')
        .replace(/\\textbf\{([^}]+)\}/g, '$1')
        .replace(/\\textit\{([^}]+)\}/g, '$1')
        .replace(/\\text\{([^}]+)\}/g, '$1')
        .trim();

      const borders = block.hasBorder
        ? {
            top: { style: BorderStyle.SINGLE, size: 4, color: '64748B' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: '64748B' },
            left: { style: BorderStyle.SINGLE, size: 4, color: '64748B' },
            right: { style: BorderStyle.SINGLE, size: 4, color: '64748B' },
          }
        : {
            top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
            left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
            right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
          };

      return new TableCell({
        children: [
          new Paragraph({
            alignment: align,
            spacing: { before: 80, after: 80 },
            children: [
              new TextRun({
                text: cleanContent,
                bold: isFirstRow || cell.isHeader,
                font: 'Times New Roman',
                size: fontSizePt * 2,
              }),
            ],
          }),
        ],
        columnSpan: cell.colSpan && cell.colSpan > 1 ? cell.colSpan : undefined,
        borders,
        shading: isFirstRow
          ? {
              fill: 'F1F5F9',
            }
          : undefined,
      });
    });

    return new TableRow({
      children: cells,
      tableHeader: isFirstRow,
    });
  });

  return new Table({
    alignment: AlignmentType.CENTER,
    width: {
      size: 90,
      type: WidthType.PERCENTAGE,
    },
    rows: tableRows,
  });
}

/**
 * Parses a string with tokens like [[TIKZ_IMG_1]] and returns docx Paragraph children (TextRun / ImageRun)
 */
function createRunsFromTextWithTikz(
  text: string,
  tikzMap: Map<string, TikzBlock>,
  fontSizePt: number = 13,
  isBold: boolean = false
): (TextRun | ImageRun)[] {
  const runs: (TextRun | ImageRun)[] = [];
  const tokenRegex = /\[\[TIKZ_IMG_\d+\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    const preText = text.slice(lastIndex, match.index);
    if (preText) {
      runs.push(
        new TextRun({
          text: preText,
          size: fontSizePt * 2, // docx uses half-points
          font: 'Times New Roman',
          bold: isBold,
        })
      );
    }

    const token = match[0];
    const block = tikzMap.get(token);

    if (block && block.dataUrl) {
      try {
        const imageBytes = base64ToUint8Array(block.dataUrl);
        // Calculate display dimensions keeping aspect ratio (max width 450px)
        const origW = block.width || 300;
        const origH = block.height || 200;
        const targetW = Math.min(origW, 450);
        const targetH = Math.round((targetW / origW) * origH);

        runs.push(
          new ImageRun({
            data: imageBytes,
            transformation: {
              width: targetW,
              height: targetH,
            },
            type: 'png',
          })
        );
      } catch (e) {
        runs.push(
          new TextRun({
            text: ` [Hình vẽ TikZ ${block.id}] `,
            size: fontSizePt * 2,
            font: 'Times New Roman',
            italics: true,
            color: '666666',
          })
        );
      }
    } else {
      runs.push(
        new TextRun({
          text: ` [Hình vẽ TikZ ${token}] `,
          size: fontSizePt * 2,
          font: 'Times New Roman',
          italics: true,
          color: '666666',
        })
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  const postText = text.slice(lastIndex);
  if (postText) {
    runs.push(
      new TextRun({
        text: postText,
        size: fontSizePt * 2,
        font: 'Times New Roman',
        bold: isBold,
      })
    );
  }

  return runs;
}

/**
 * Splits text by [[TABULAR_n]], interleaving Paragraphs (with TikZ runs) and native Word Tables
 */
function createElementsFromTextWithTablesAndTikz(
  text: string,
  titlePrefix: string | null,
  tikzMap: Map<string, TikzBlock>,
  tabularMap: Map<string, TabularBlock>,
  fontSizePt: number = 13,
  indentLeft?: number,
  spacingConfig?: { before?: number; after?: number; line?: number }
): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [];
  const parts = text.split(/(\[\[TABULAR_\d+\]\])/g);

  let isFirstPart = true;

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith('[[TABULAR_') && part.endsWith(']]')) {
      const tableBlock = tabularMap.get(part);
      if (tableBlock) {
        result.push(createDocxTableFromBlock(tableBlock, fontSizePt - 1));
      } else {
        result.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 80 },
            children: [
              new TextRun({
                text: `[Bảng ${part}]`,
                italics: true,
                font: 'Times New Roman',
                size: fontSizePt * 2,
                color: '666666',
              }),
            ],
          })
        );
      }
      continue;
    }

    const runs = createRunsFromTextWithTikz(part, tikzMap, fontSizePt, false);
    const paraChildren: (TextRun | ImageRun)[] = [];

    if (isFirstPart && titlePrefix) {
      paraChildren.push(
        new TextRun({
          text: titlePrefix,
          bold: true,
          size: fontSizePt * 2,
          font: 'Times New Roman',
        })
      );
    }

    paraChildren.push(...runs);

    result.push(
      new Paragraph({
        indent: indentLeft ? { left: indentLeft } : undefined,
        spacing: spacingConfig || { before: 80, after: 80, line: 300 },
        children: paraChildren,
      })
    );

    isFirstPart = false;
  }

  return result;
}

/**
 * Exports parsed questions to Microsoft Word (.docx) format
 */
export async function exportToDocx(
  questions: ParsedQuestion[],
  settings: ConversionSettings,
  fileName: string = 'De_Thi_SmartTest.docx'
): Promise<void> {
  // Build lookup map for TikZ blocks and Tabular blocks
  const tikzMap = new Map<string, TikzBlock>();
  const tabularMap = new Map<string, TabularBlock>();

  for (const q of questions) {
    for (const b of q.tikzBlocks) {
      if (!b.dataUrl && b.url) {
        try {
          const res = await fetch(b.url);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            b.dataUrl = `data:image/png;base64,${btoa(binary)}`;
          }
        } catch (e) {
          console.warn(`Could not prefetch image ${b.url} for docx:`, e);
        }
      }
      tikzMap.set(b.token, b);
    }

    for (const t of q.tabularBlocks || []) {
      tabularMap.set(t.token, t);
    }
  }

  const docChildren: (Paragraph | Table)[] = [];

  // Document Title Header
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120, before: 60 },
      children: [
        new TextRun({
          text: 'ĐỀ THI ĐÃ CHUYỂN ĐỔI SANG SMARTTEST',
          bold: true,
          size: 16 * 2,
          font: 'Times New Roman',
        }),
      ],
    })
  );

  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: '(Mã nguồn từ LaTeX ex_test - Công thức MathType - Hình vẽ TikZ PNG & Bảng biểu Word)',
          italics: true,
          size: 11 * 2,
          font: 'Times New Roman',
          color: '555555',
        }),
      ],
    })
  );

  // Questions
  for (const q of questions) {
    // 1. Question Title & Stem (with native Word Table support)
    const titleText = `${formatQuestionTitle(q.questionNumber, q.tagId, settings)} `;
    const stemElements = createElementsFromTextWithTablesAndTikz(
      q.stem,
      titleText,
      tikzMap,
      tabularMap,
      13,
      undefined,
      { before: 180, after: 80, line: 320 }
    );
    docChildren.push(...stemElements);

    // 2. Options
    if (q.type === 'multiple_choice' || q.type === 'true_false') {
      const isTF = q.type === 'true_false';
      for (const opt of q.options) {
        const prefix = formatOptionPrefix(opt.letter, opt.isCorrect, settings.correctMarkStyle, isTF);
        const optElements = createElementsFromTextWithTablesAndTikz(
          opt.content,
          prefix,
          tikzMap,
          tabularMap,
          13,
          400,
          { before: 40, after: 60, line: 300 }
        );
        docChildren.push(...optElements);
      }
    } else if (q.type === 'short_answer' && q.shortAnswer) {
      const ansElements = createElementsFromTextWithTablesAndTikz(
        q.shortAnswer,
        'Đáp án: ',
        tikzMap,
        tabularMap,
        13,
        400,
        { before: 40, after: 80, line: 300 }
      );
      docChildren.push(...ansElements);
    }

    // 3. Solution (if enabled)
    if (settings.includeSolution && q.solution) {
      const solPrefix = `${settings.solutionHeader} `;
      const solElements = createElementsFromTextWithTablesAndTikz(
        q.solution,
        solPrefix,
        tikzMap,
        tabularMap,
        12,
        300,
        { before: 80, after: 140, line: 300 }
      );
      docChildren.push(...solElements);
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch = 1440 twips
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, fileName);
}
