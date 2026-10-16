export interface TabularCell {
  content: string; // May contain math $...$ or text
  colSpan?: number;
  rowSpan?: number;
  align?: 'left' | 'center' | 'right';
  isHeader?: boolean;
}

export interface TabularBlock {
  id: string;
  token: string;
  raw: string;
  columns: ('left' | 'center' | 'right')[];
  hasBorder: boolean;
  rows: TabularCell[][];
}

/**
 * Parses LaTeX \begin{tabular}{...} ... \end{tabular} into a structured table
 */
export function parseTabularEnvironment(rawTabular: string, id: string, token: string): TabularBlock {
  // Extract column spec: \begin{tabular}[pos]{|l|c|r|}
  const headerMatch = rawTabular.match(/\\begin\s*\{tabular\}\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/i);
  const spec = headerMatch ? headerMatch[1].trim() : 'c';

  // Determine alignments and borders
  const columns: ('left' | 'center' | 'right')[] = [];
  const hasBorder = spec.includes('|') || /\\(?:hline|cline|toprule|midrule|bottomrule)/i.test(rawTabular);

  for (let i = 0; i < spec.length; i++) {
    const char = spec[i].toLowerCase();
    if (char === 'l') {
      columns.push('left');
    } else if (char === 'r') {
      columns.push('right');
    } else if (char === 'c') {
      columns.push('center');
    } else if (char === 'p' || char === 'm' || char === 'b') {
      columns.push('left');
      // Skip {width} e.g. p{3cm}
      if (spec[i + 1] === '{') {
        const closeIdx = spec.indexOf('}', i + 1);
        if (closeIdx !== -1) i = closeIdx;
      }
    }
  }

  if (columns.length === 0) {
    columns.push('center');
  }

  // Extract body between \begin{tabular}{...} and \end{tabular}
  const bodyStart = headerMatch ? headerMatch[0].length : 0;
  const bodyEnd = rawTabular.lastIndexOf('\\end{tabular}');
  const body = bodyEnd !== -1 ? rawTabular.slice(bodyStart, bodyEnd) : rawTabular.slice(bodyStart);

  // Split rows by \\ (accounting for potential \\ inside math or comments or brackets)
  const rawRows: string[] = [];
  let currentPos = 0;
  let inMath = false;

  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (char === '$') inMath = !inMath;

    if (!inMath && char === '\\' && body[i + 1] === '\\') {
      const rowSlice = body.slice(currentPos, i).trim();
      if (rowSlice) rawRows.push(rowSlice);
      i++; // skip second \

      // If next characters specify vertical spacing like \\[4pt] or \\[1ex], skip them
      let nextIdx = i + 1;
      while (nextIdx < body.length && (body[nextIdx] === ' ' || body[nextIdx] === '\t')) {
        nextIdx++;
      }
      if (body[nextIdx] === '[') {
        const closeBracket = body.indexOf(']', nextIdx);
        if (closeBracket !== -1) {
          i = closeBracket;
        }
      }

      currentPos = i + 1;
    }
  }

  const remainder = body.slice(currentPos).trim();
  if (remainder) rawRows.push(remainder);

  // Process each row
  const parsedRows: TabularCell[][] = [];

  for (let rIdx = 0; rIdx < rawRows.length; rIdx++) {
    const rawRow = rawRows[rIdx];

    // Strip rule macros: \hline, \cline{...}, \toprule, \midrule, \bottomrule
    const cleanRow = rawRow
      .replace(/\\(?:hline|toprule|midrule|bottomrule)\b/gi, '')
      .replace(/\\cline\{[^}]*\}/gi, '')
      .trim();

    if (!cleanRow) continue;

    // Split cells by & respecting math $...$ and braces {...}
    const cellStrings: string[] = [];
    let cellStart = 0;
    let mathDepth = false;
    let braceDepth = 0;

    for (let j = 0; j < cleanRow.length; j++) {
      const c = cleanRow[j];
      if (c === '$') mathDepth = !mathDepth;
      if (c === '{') braceDepth++;
      if (c === '}') braceDepth = Math.max(0, braceDepth - 1);

      if (!mathDepth && braceDepth === 0 && c === '&') {
        cellStrings.push(cleanRow.slice(cellStart, j).trim());
        cellStart = j + 1;
      }
    }
    cellStrings.push(cleanRow.slice(cellStart).trim());

    // Map into TabularCell
    let colCursor = 0;
    const rowCells: TabularCell[] = [];

    for (const cellStr of cellStrings) {
      // Check \multicolumn{cols}{align}{content}
      const multiMatch = cellStr.match(/^\\multicolumn\s*\{(\d+)\}\s*\{([^}]+)\}\s*\{([\s\S]*)\}$/);
      if (multiMatch) {
        const colSpan = parseInt(multiMatch[1], 10) || 1;
        const alignChar = multiMatch[2].toLowerCase();
        const align: 'left' | 'center' | 'right' = alignChar.includes('l')
          ? 'left'
          : alignChar.includes('r')
          ? 'right'
          : 'center';

        rowCells.push({
          content: multiMatch[3].trim(),
          colSpan,
          align,
          isHeader: rIdx === 0,
        });
        colCursor += colSpan;
        continue;
      }

      const defaultAlign = columns[colCursor] || 'center';
      rowCells.push({
        content: cellStr,
        align: defaultAlign,
        isHeader: rIdx === 0,
      });
      colCursor++;
    }

    if (rowCells.length > 0) {
      parsedRows.push(rowCells);
    }
  }

  return {
    id,
    token,
    raw: rawTabular,
    columns,
    hasBorder,
    rows: parsedRows,
  };
}

/**
 * Extracts all \begin{tabular} environments and replaces them with [[TABULAR_n]] tokens
 */
export function extractTabularBlocks(
  text: string,
  startCounter: number = 1
): { textWithoutTabular: string; tabularBlocks: TabularBlock[] } {
  const tabularBlocks: TabularBlock[] = [];
  let counter = startCounter;
  let result = text;

  // Match optional \begin{center} or \begin{table} wrapping \begin{tabular}...\end{tabular}
  const tabularPattern = /(?:\\begin\s*\{(?:center|table)\}\s*)?\\begin\s*\{tabular\}[\s\S]*?\\end\s*\{tabular\}(?:\s*\\end\s*\{(?:center|table)\})?/gi;

  result = result.replace(tabularPattern, (fullMatch) => {
    // Extract strictly the \begin{tabular}...\end{tabular} part
    const innerMatch = fullMatch.match(/\\begin\s*\{tabular\}[\s\S]*?\\end\s*\{tabular\}/i);
    const raw = innerMatch ? innerMatch[0] : fullMatch;

    const id = `table-${counter}`;
    const token = `[[TABULAR_${counter}]]`;

    const parsed = parseTabularEnvironment(raw, id, token);
    tabularBlocks.push(parsed);

    counter++;
    return `\n${token}\n`;
  });

  return { textWithoutTabular: result, tabularBlocks };
}

/**
 * Converts a TabularBlock to tab-separated values (TSV) for direct Excel / Word pasting
 */
export function tabularBlockToTsv(block: TabularBlock): string {
  return block.rows
    .map((row) =>
      row
        .map((c) =>
          c.content
            .replace(/\$/g, '')
            .replace(/\\textbf\{([^}]+)\}/g, '$1')
            .replace(/\\textit\{([^}]+)\}/g, '$1')
            .replace(/\\text\{([^}]+)\}/g, '$1')
            .trim()
        )
        .join('\t')
    )
    .join('\n');
}

/**
 * Converts a TabularBlock to clean text/ASCII table for plain-text SmartTest
 */
export function tabularBlockToAscii(block: TabularBlock): string {
  if (block.rows.length === 0) return '';

  const cleanRows = block.rows.map((row) =>
    row.map((cell) =>
      cell.content
        .replace(/\$/g, '')
        .replace(/\\textbf\{([^}]+)\}/g, '$1')
        .replace(/\\textit\{([^}]+)\}/g, '$1')
        .replace(/\\text\{([^}]+)\}/g, '$1')
        .replace(/\s+/g, ' ')
        .trim()
    )
  );

  const colWidths: number[] = [];
  cleanRows.forEach((row) => {
    row.forEach((cell, idx) => {
      colWidths[idx] = Math.max(colWidths[idx] || 0, cell.length, 3);
    });
  });

  const divider = '+' + colWidths.map((w) => '-'.repeat(w + 2)).join('+') + '+';

  const lines: string[] = [divider];
  cleanRows.forEach((row, rIdx) => {
    const rowStr =
      '| ' +
      row
        .map((cell, cIdx) => {
          const w = colWidths[cIdx] || 3;
          return cell.padEnd(w);
        })
        .join(' | ') +
      ' |';
    lines.push(rowStr);
    if (rIdx === 0 || rIdx === cleanRows.length - 1) {
      lines.push(divider);
    }
  });

  return lines.join('\n');
}

/**
 * Converts a TabularBlock to responsive HTML table with inline styling for Word/SmartTest
 */
export function tabularBlockToHtml(block: TabularBlock): string {
  const borderStyle = block.hasBorder
    ? 'border: 1px solid #475569; border-collapse: collapse;'
    : 'border-collapse: collapse;';
  const cellBorder = block.hasBorder ? 'border: 1px solid #64748b;' : 'border-bottom: 1px solid #e2e8f0;';

  let html = `<div class="tabular-table-container" style="margin: 14px auto; overflow-x: auto; text-align: center;">\n`;
  html += `  <table style="${borderStyle} margin: 0 auto; font-family: 'Times New Roman', serif; font-size: 13pt; background-color: #ffffff; color: #0f172a; border-radius: 4px; border-collapse: collapse;">\n`;
  html += `    <tbody>\n`;

  block.rows.forEach((row, rowIdx) => {
    const isFirstRow = rowIdx === 0;
    const rowBg = isFirstRow ? 'background-color: #f1f5f9; font-weight: bold;' : '';
    html += `      <tr style="${rowBg}">\n`;

    row.forEach((cell) => {
      const alignStyle = `text-align: ${cell.align || 'center'};`;
      const padStyle = 'padding: 8px 14px;';
      const colSpanAttr = cell.colSpan && cell.colSpan > 1 ? ` colspan="${cell.colSpan}"` : '';
      const fontWeight = cell.isHeader || isFirstRow ? 'font-weight: bold;' : '';

      html += `        <td${colSpanAttr} style="${cellBorder} ${alignStyle} ${padStyle} ${fontWeight}">\n`;
      html += `          ${cell.content}\n`;
      html += `        </td>\n`;
    });

    html += `      </tr>\n`;
  });

  html += `    </tbody>\n`;
  html += `  </table>\n`;
  html += `</div>\n`;

  return html;
}
