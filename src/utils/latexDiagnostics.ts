import { fixMathTypeGeometryAndDelimiters } from './latexParser';

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface DiagnosticIssue {
  id: string;
  severity: IssueSeverity;
  title: string;
  description: string;
  line?: number;
  snippet?: string;
  canAutoFix: boolean;
}

export interface ScanResult {
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  issues: DiagnosticIssue[];
  stats: {
    questionCount: number;
    tikzCount: number;
    tkzTabCount: number;
    tabularCount: number;
    imminiCount: number;
    choiceCount: number;
    trueFalseCount: number;
  };
}

/**
 * Scans LaTeX ex_test text for syntax errors, formatting inconsistencies, and TikZ/immini issues
 */
export function scanLatexDocument(content: string): ScanResult {
  const issues: DiagnosticIssue[] = [];
  const lines = content.split('\n');

  // Helper to find approximate line number
  const findLineNumber = (pattern: RegExp | string): number | undefined => {
    for (let i = 0; i < lines.length; i++) {
      if (typeof pattern === 'string' ? lines[i].includes(pattern) : pattern.test(lines[i])) {
        return i + 1;
      }
    }
    return undefined;
  };

  // 1. Check unmatched curly braces { } taking comments and escapes into account
  let openBraces = 0;
  let closeBraces = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let inEscape = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (inEscape) {
        inEscape = false;
        continue;
      }
      if (char === '\\') {
        inEscape = true;
        continue;
      }
      if (char === '%') {
        // Comment rest of line
        break;
      }
      if (char === '{') openBraces++;
      if (char === '}') closeBraces++;
    }
  }

  if (openBraces !== closeBraces) {
    issues.push({
      id: 'unmatched-braces',
      severity: 'error',
      title: 'Lệch dấu ngoặc nhọn { }',
      description: `Tổng số ngoặc mở { là ${openBraces}, nhưng ngoặc đóng } là ${closeBraces} (chênh lệch ${Math.abs(openBraces - closeBraces)}). Điều này có thể khiến \\choice hoặc \\loigiai bị đứt đoạn.`,
      canAutoFix: false,
    });
  }

  // 2. Check unclosed environments: tikzpicture, center, ex, tabular, etc.
  const envsToCheck = ['tikzpicture', 'pgfpicture', 'center', 'ex', 'bt', 'vd', 'tabular'];
  for (const env of envsToCheck) {
    const beginRegex = new RegExp(`\\\\begin\\s*\\{${env}\\}`, 'gi');
    const endRegex = new RegExp(`\\\\end\\s*\\{${env}\\}`, 'gi');
    const beginCount = (content.match(beginRegex) || []).length;
    const endCount = (content.match(endRegex) || []).length;

    if (beginCount !== endCount) {
      issues.push({
        id: `unclosed-env-${env}`,
        severity: env === 'center' ? 'warning' : 'error',
        title: `Môi trường \\begin{${env}} chưa đóng đủ`,
        description: `Có ${beginCount} lệnh \\begin{${env}} nhưng chỉ có ${endCount} lệnh \\end{${env}}.`,
        line: findLineNumber(new RegExp(`\\\\begin\\s*\\{${env}\\}`)),
        canAutoFix: env === 'center',
      });
    }
  }

  // 3. Check \immini issues
  const imminiMatches = content.match(/\\immini/g) || [];
  const imminiCount = imminiMatches.length;

  if (imminiCount > 0) {
    // Check if \immini has [option] groups
    const complexImmini = content.match(/\\immini\s*\[[^\]]+\]\s*\[[^\]]+\]/);
    if (complexImmini) {
      issues.push({
        id: 'immini-multi-opt',
        severity: 'info',
        title: 'Phát hiện \\immini có 2 tham số tùy chọn [width][pos]',
        description: 'Đã nhận diện tham số căn lề và tỷ lệ của \\immini, hệ thống sẽ tự động giải nén và bố trí hình vẽ TikZ tương ứng.',
        line: findLineNumber('\\immini'),
        snippet: complexImmini[0],
        canAutoFix: true,
      });
    }

    // Check if \choice is trapped inside \immini
    const imminiWithChoice = /\\immini(?:\s*\[[^\]]*\])*\s*\{[^}]*\\choice\b/;
    if (imminiWithChoice.test(content)) {
      issues.push({
        id: 'immini-contains-choice',
        severity: 'warning',
        title: 'Lệnh \\choice nằm bên trong \\immini',
        description: 'Thầy cô đã đặt các phương án lựa chọn \\choice vào đối số thứ nhất của \\immini. Bộ chuẩn hóa sẽ tự động tách phương án ra sau hình vẽ.',
        line: findLineNumber('\\immini'),
        canAutoFix: true,
      });
    }

    // Check if \begin{center} is inside \immini
    if (/\\immini(?:\s*\[[^\]]*\])*\s*\{[\s\S]*?\\begin\s*\{center\}/.test(content)) {
      issues.push({
        id: 'immini-contains-center',
        severity: 'warning',
        title: 'Có \\begin{center} lồng trong \\immini',
        description: 'Hình vẽ trong \\immini bị bọc bởi \\begin{center}. Có thể tự động làm sạch để tránh khoảng trống thừa.',
        canAutoFix: true,
      });
    }
  }

  // 4. Check standalone \tkzTabInit without \begin{tikzpicture}
  const tkzTabInitMatches = content.match(/\\tkzTabInit/g) || [];
  const tkzTabCount = tkzTabInitMatches.length;

  if (tkzTabCount > 0) {
    // Check if any \tkzTabInit is not preceded by \begin{tikzpicture}
    const standaloneTab = /(?<!\\begin\s*\{(?:tikzpicture|pgfpicture)\}[\s\S]{0,100})\\tkzTabInit/.test(content);
    if (standaloneTab) {
      issues.push({
        id: 'standalone-tkz-tab',
        severity: 'warning',
        title: 'Bảng biến thiên \\tkzTabInit chưa bọc \\begin{tikzpicture}',
        description: 'Phát hiện lệnh \\tkzTabInit đứng độc lập. Cần được bọc trong \\begin{tikzpicture}...\\end{tikzpicture} để biên dịch thành ảnh PNG.',
        line: findLineNumber('\\tkzTabInit'),
        canAutoFix: true,
      });
    }
  }

  // 5. Check Vietnamese math macros
  const macroMatches: string[] = [];
  if (/\\heva\s*\{/.test(content)) macroMatches.push('\\heva');
  if (/\\hoac\s*\{/.test(content)) macroMatches.push('\\hoac');
  if (/\\vecto\s*\{/.test(content)) macroMatches.push('\\vecto');
  if (/\\dfrac\b/.test(content)) macroMatches.push('\\dfrac');
  if (/\\parallel\b/.test(content)) macroMatches.push('\\parallel');

  if (macroMatches.length > 0) {
    issues.push({
      id: 'vietnamese-macros',
      severity: 'info',
      title: `Phát hiện macro toán đặc thù Việt Nam (${macroMatches.join(', ')})`,
      description: 'Các macro này sẽ được chuyển đổi tự động sang cú pháp MathType chuẩn (như cases, array, overrightarrow, frac).',
      canAutoFix: true,
    });
  }

  // 6. Check choice options & \True tag
  const choiceBlocks = content.match(/\\choice\b/g) || [];
  const choiceTfBlocks = content.match(/\\choiceTF\b/g) || [];
  const totalChoices = choiceBlocks.length;
  const totalChoiceTFs = choiceTfBlocks.length;

  // Check if any question has \choice without \True
  const exBlocks = content.split(/\\begin\{(?:ex|bt|vd|cau)\}/);
  for (let i = 1; i < exBlocks.length; i++) {
    const block = exBlocks[i];
    if (block.includes('\\choice') && !block.includes('\\choiceTF')) {
      if (!/\\(?:True|true)\b/.test(block)) {
        issues.push({
          id: `no-true-choice-${i}`,
          severity: 'warning',
          title: `Câu ${i}: Chưa có đáp án đúng (thiếu \\True)`,
          description: `Câu hỏi số ${i} có lệnh \\choice nhưng chưa đánh dấu phương án đúng bằng \\True.`,
          canAutoFix: false,
        });
      }
    }
  }

  // 7. Check display math ($$...$$ and \[...\])
  const displayMathMatches = (content.match(/\$\$[\s\S]*?\$\$/g) || []).length + (content.match(/\\\[[\s\S]*?\\\]/g) || []).length;
  if (displayMathMatches > 0) {
    issues.push({
      id: 'display-math-detected',
      severity: 'info',
      title: `Phát hiện ${displayMathMatches} công thức dạng $$...$$ hoặc \\[...\\]`,
      description: 'Nên chuyển tất cả về dạng inline $...$ để các công thức toán không bị tách dòng đột ngột trong Word và tương thích hoàn toàn với MathType.',
      canAutoFix: true,
    });
  }

  // 8. Check unbraced geometry points (e.g. $A B C$, $A B$, $AB,CD$)
  const pointMatches = content.match(/\$\s*([A-Z](?:['’\^]?[\s,.]*[A-Z]['’\^]?)+)\s*\$/g) || [];
  const unbracedPoints = pointMatches.filter((m) => !m.includes('{'));
  if (unbracedPoints.length > 0) {
    issues.push({
      id: 'unbraced-geometry-points',
      severity: 'warning',
      title: `Phát hiện ${unbracedPoints.length} tên điểm/đoạn hình học chưa bọc ngoặc { }`,
      description: `Các biểu thức như ${unbracedPoints.slice(0, 3).join(', ')} có khoảng trắng hoặc dấu phẩy. Khi chuyển sang MathType (Alt+\\), cần bổ sung { } như \${A B C}\$, \${A B}\$, \${AB,CD}\$ để không bị lỗi cú pháp.`,
      canAutoFix: true,
    });
  }

  // 9. Check stray \begin{center} and % comments
  if (/\\begin\s*\{center\}\s*%/i.test(content)) {
    issues.push({
      id: 'center-with-comment',
      severity: 'warning',
      title: 'Có dấu comment % ngay sau \\begin{center}',
      description: 'Dấu % có thể vô tình che mất mã TikZ ở dòng kế tiếp. Sẽ được tự động dọn dẹp.',
      canAutoFix: true,
    });
  }

  // Calculate stats
  const totalQuestions = (content.match(/\\begin\{(?:ex|bt|vd|cau)\}/g) || []).length;
  const tikzCount = (content.match(/\\begin\{(?:tikzpicture|pgfpicture)\}/g) || []).length;

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  return {
    totalIssues: issues.length,
    errorCount,
    warningCount,
    infoCount,
    issues,
    stats: {
      questionCount: totalQuestions || (content.trim() ? 1 : 0),
      tikzCount,
      tkzTabCount,
      tabularCount: (content.match(/\\begin\s*\{tabular\}/gi) || []).length,
      imminiCount,
      choiceCount: totalChoices,
      trueFalseCount: totalChoiceTFs,
    },
  };
}

/**
 * Automatically fixes common LaTeX ex_test issues
 */
export function autoFixLatexDocument(content: string): { fixedContent: string; fixedCount: number } {
  let text = content;
  let fixedCount = 0;

  // 1. Auto-wrap standalone \tkzTabInit into \begin{tikzpicture}...\end{tikzpicture}
  if (text.includes('\\tkzTabInit') && !text.includes('\\begin{tikzpicture}')) {
    text = text.replace(
      /(?:\\begin\s*\{center\}\s*)?(\\tkzTabInit[\s\S]*?(?:\\tkzTab(?:Var|Val|Line|Ima)\{[^}]*\})+)(?:\s*\\end\s*\{center\})?/gi,
      () => {
        fixedCount++;
        return '\\begin{tikzpicture}\n$1\n\\end{tikzpicture}';
      }
    );
  }

  // 2. Remove stray trailing comments after \begin{center} or \end{center}
  if (/\\begin\s*\{center\}\s*%/i.test(text)) {
    text = text.replace(/\\begin\s*\{center\}\s*%[^\n]*/gi, '\\begin{center}');
    fixedCount++;
  }

  // 3. Remove unmatched \begin{center} or \end{center}
  const beginCenters = (text.match(/\\begin\s*\{center\}/gi) || []).length;
  const endCenters = (text.match(/\\end\s*\{center\}/gi) || []).length;
  if (beginCenters !== endCenters) {
    // Safely remove all \begin{center} and \end{center} that wrap tikzpicture
    text = text.replace(/\\begin\s*\{center\}\s*(\\begin\s*\{tikzpicture\}[\s\S]*?\\end\s*\{tikzpicture\})\s*\\end\s*\{center\}/gi, '$1');
    text = text.replace(/\\begin\s*\{center\}/gi, '');
    text = text.replace(/\\end\s*\{center\}/gi, '');
    fixedCount++;
  }

  // 4. Standardize Vietnamese math macros
  if (/\\vecto\s*\{/.test(text)) {
    text = text.replace(/\\vecto\{([^}]+)\}/g, '\\overrightarrow{$1}');
    fixedCount++;
  }

  if (/\\dfrac\b/.test(text)) {
    text = text.replace(/\\dfrac\b/g, '\\frac');
    fixedCount++;
  }

  // 5. Clean standalone empty comment lines
  if (/^[ \t]*%.*$/gm.test(text)) {
    text = text.replace(/^[ \t]*%.*$\n?/gm, '');
    fixedCount++;
  }

  // 6. Convert display math $$...$$ / \[...\] to inline $...$, and add {} for geometry points ($A B C$, $A B$, $AB,CD$)
  const beforeMathFix = text;
  text = fixMathTypeGeometryAndDelimiters(text);
  if (text !== beforeMathFix) {
    fixedCount++;
  }

  return { fixedContent: text.trim(), fixedCount };
}
