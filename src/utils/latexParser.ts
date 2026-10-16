import { ParsedQuestion, TikzBlock, ChoiceOption, QuestionType } from '../types';
import { extractTabularBlocks, TabularBlock } from './tabularParser';

/**
 * Extracts balanced braced content from a string starting at `{`
 * Returns { content, endIndex } or null if invalid
 */
export function extractBracedContent(
  text: string,
  startIndex: number
): { content: string; endIndex: number } | null {
  const openPos = text.indexOf('{', startIndex);
  if (openPos === -1) return null;

  let depth = 0;
  let inEscape = false;
  let inComment = false;

  for (let i = openPos; i < text.length; i++) {
    const char = text[i];

    if (inComment) {
      if (char === '\n') {
        inComment = false;
      }
      continue;
    }

    if (inEscape) {
      inEscape = false;
      continue;
    }

    if (char === '\\') {
      inEscape = true;
      continue;
    }

    if (char === '%') {
      inComment = true;
      continue;
    }

    if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) {
        return {
          content: text.slice(openPos + 1, i),
          endIndex: i + 1,
        };
      }
    }
  }

  return null;
}

/**
 * Converts display math $$...$$ and \[...\] to inline $...$,
 * and groups geometric point names (e.g. $A B C$, $A B$, $AB,CD$) with braces { } for MathType compatibility
 */
export function fixMathTypeGeometryAndDelimiters(text: string): string {
  let result = text;

  // 1. Convert all $$...$$ and \[...\] to inline $...$
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => {
    return `$${inner.replace(/\n+/g, ' ').trim()}$`;
  });
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => {
    return `$${inner.replace(/\n+/g, ' ').trim()}$`;
  });

  // 2. Normalize and add {} for geometry points/names inside $...$
  result = result.replace(/\$([^\$\n]+?)\$/g, (match, inner) => {
    const trimmed = inner.trim();

    // If it already is wrapped with {...}, keep it
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return match;
    }

    // Case A: Pure point names with spaces or commas, e.g.:
    // "A B C", "A B", "AB,CD", " AB,CD", "A B C D", "A, B, C", "S.ABC", "A'B'C'"
    const isPointCluster =
      /^[A-Z](?:['’\^]?[\s,.]*[A-Z]['’\^]?)+$/i.test(trimmed) &&
      !/\\|\+|-|=|<|>|\/|\*|\^|_|\(|\)|\[|\]/.test(trimmed);

    if (isPointCluster) {
      return `\${${trimmed}}\$`;
    }

    // Case B: Inside formula, replace point pairs with space or comma between capitals
    let updatedInner = inner;

    // Replace isolated "A B" or "A B C" (spaces between capital letters) with "{A B}"
    updatedInner = updatedInner.replace(/\b([A-Z](?:\s+[A-Z]){1,4})\b/g, (m: string) => {
      return `{${m}}`;
    });

    // Replace capital pairs with commas like "AB,CD" or "AB, CD" with "{AB,CD}"
    updatedInner = updatedInner.replace(/\b([A-Z]{1,4}\s*,\s*[A-Z]{1,4})\b/g, (m: string) => {
      return `{${m}}`;
    });

    return `\$${updatedInner}\$`;
  });

  return result;
}

/**
 * Normalizes Vietnamese math LaTeX commands into standard MathType-friendly TeX
 */
export function normalizeVietnameseMath(latex: string): string {
  let result = latex;

  // Convert $$...$$ and \[...\] to $...$ and wrap geometry points with {}
  result = fixMathTypeGeometryAndDelimiters(result);

  // Replace \heva{...} -> \begin{cases} ... \end{cases}
  let hevaMatch;
  while ((hevaMatch = result.match(/\\heva\s*\{/))) {
    const idx = hevaMatch.index!;
    const braced = extractBracedContent(result, idx);
    if (!braced) break;
    const inner = braced.content.trim();
    result =
      result.slice(0, idx) +
      `\\begin{cases} ${inner} \\end{cases}` +
      result.slice(braced.endIndex);
  }

  // Replace \hoac{...} -> \left[\begin{array}{l} ... \end{array}\right.
  let hoacMatch;
  while ((hoacMatch = result.match(/\\hoac\s*\{/))) {
    const idx = hoacMatch.index!;
    const braced = extractBracedContent(result, idx);
    if (!braced) break;
    const inner = braced.content.trim();
    result =
      result.slice(0, idx) +
      `\\left[\\begin{array}{l} ${inner} \\end{array}\\right.` +
      result.slice(braced.endIndex);
  }

  // Common macros
  result = result
    .replace(/\\vecto\{([^}]+)\}/g, '\\overrightarrow{$1}')
    .replace(/\\vec\{([^}]+)\}/g, '\\overrightarrow{$1}')
    .replace(/\\dfrac\b/g, '\\frac')
    .replace(/\\degree\b/g, '^\\circ')
    .replace(/\\widehat\{([^}]+)\}/g, '\\hat{$1}')
    .replace(/\\rm\{([^}]+)\}/g, '\\mathrm{$1}');

  return result;
}

/**
 * Cleans formatting noise that is not needed in SmartTest
 */
export function cleanDocumentNoise(text: string): string {
  let cleaned = text;

  // 1. Remove matched \begin{center} ... \end{center} environments, preserving inner content
  cleaned = cleaned.replace(/\\begin\s*\{center\}\s*([\s\S]*?)\s*\\end\s*\{center\}/gi, '$1\n');
  cleaned = cleaned.replace(/\\begin\s*\{flushleft\}\s*([\s\S]*?)\s*\\end\s*\{flushleft\}/gi, '$1\n');
  cleaned = cleaned.replace(/\\begin\s*\{flushright\}\s*([\s\S]*?)\s*\\end\s*\{flushright\}/gi, '$1\n');

  // 2. Remove any stray/unmatched \begin{center} or \end{center} tags
  cleaned = cleaned.replace(/\\begin\s*\{center\}/gi, '');
  cleaned = cleaned.replace(/\\end\s*\{center\}/gi, '');
  cleaned = cleaned.replace(/\\begin\s*\{flushleft\}/gi, '');
  cleaned = cleaned.replace(/\\end\s*\{flushleft\}/gi, '');
  cleaned = cleaned.replace(/\\begin\s*\{flushright\}/gi, '');
  cleaned = cleaned.replace(/\\end\s*\{flushright\}/gi, '');

  // 3. Remove spacing and styling macros
  cleaned = cleaned
    .replace(/\\centering\b/gi, '')
    .replace(/\\raggedleft\b/gi, '')
    .replace(/\\raggedright\b/gi, '')
    .replace(/\\noindent\b/g, '')
    .replace(/\\dotfill\b/g, '')
    .replace(/\\break\b/g, '\n')
    .replace(/\\newpage\b/g, '\n')
    .replace(/\\par\b/g, '\n')
    .replace(/\\vspace\*?\{[^}]*\}/g, '')
    .replace(/\\hspace\*?\{[^}]*\}/g, '')
    .replace(/\\smallskip\b/g, '')
    .replace(/\\medskip\b/g, '')
    .replace(/\\bigskip\b/g, '');

  // 4. Clean stray comment signs that are left on their own
  cleaned = cleaned.replace(/^[ \t]*%.*$/gm, '');

  return cleaned.trim();
}

/**
 * Handles \immini[opts]{Text}{TikZ/Image}
 * Extracts TikZ and puts it alongside text cleanly
 */
export function unpackImmini(text: string): string {
  let result = text;
  // Match \immini with zero, one, or multiple [option] bracket groups like \immini[12][d]
  const imminiRegex = /\\immini(?:\s*\[[^\]]*\])*\s*\{/;

  let match;
  while ((match = result.match(imminiRegex))) {
    const idx = match.index!;
    // 1st braced group: Text
    const textBrace = extractBracedContent(result, idx);
    if (!textBrace) break;

    // 2nd braced group: Figure/TikZ
    const figBrace = extractBracedContent(result, textBrace.endIndex);
    if (!figBrace) break;

    let mainText = textBrace.content.trim();
    let figure = figBrace.content.trim();

    // Clean any \begin{center}...\end{center} wrapping inside the figure
    figure = figure.replace(/\\begin\s*\{center\}\s*([\s\S]*?)\s*\\end\s*\{center\}/gi, '$1').trim();

    // If mainText contains \choice or \choiceTF, place the figure BEFORE \choice!
    const choiceMatch = mainText.match(/\\(?:choice|choiceTF)\b/);
    if (choiceMatch && choiceMatch.index !== undefined) {
      const stemPart = mainText.slice(0, choiceMatch.index).trim();
      const choicePart = mainText.slice(choiceMatch.index).trim();
      result =
        result.slice(0, idx) +
        `${stemPart}\n\n${figure}\n\n${choicePart}\n` +
        result.slice(figBrace.endIndex);
    } else {
      result =
        result.slice(0, idx) +
        `${mainText}\n\n${figure}\n` +
        result.slice(figBrace.endIndex);
    }
  }

  return result;
}

/**
 * Extracts all TikZ environments and replaces them with [[TIKZ_IMG_n]]
 */
export function extractTikzBlocks(
  text: string,
  startCounter: number = 1
): { textWithoutTikz: string; tikzBlocks: TikzBlock[] } {
  const tikzBlocks: TikzBlock[] = [];
  let counter = startCounter;
  let result = text;

  // 1. Auto-wrap standalone \tkzTabInit into \begin{tikzpicture}...\end{tikzpicture} if not already wrapped
  if (result.includes('\\tkzTabInit') && !result.includes('\\begin{tikzpicture}')) {
    result = result.replace(
      /(?:\\begin\s*\{center\}\s*)?(\\tkzTabInit[\s\S]*?(?:\\tkzTab(?:Var|Val|Line|Ima)\{[^}]*\})+)(?:\s*\\end\s*\{center\})?/gi,
      '\\begin{tikzpicture}\n$1\n\\end{tikzpicture}'
    );
  }

  // 2. Match standard tikzpicture and pgfpicture environments, unwrapping optional \begin{center}...\end{center}
  const tikzPattern = /(?:\\begin\s*\{center\}\s*)?\\begin\s*\{(?:tikzpicture|pgfpicture)\}[\s\S]*?\\end\s*\{(?:tikzpicture|pgfpicture)\}(?:\s*\\end\s*\{center\})?/gi;

  result = result.replace(tikzPattern, (fullMatch) => {
    // Extract strictly the \begin{tikzpicture}...\end{tikzpicture} part
    const innerMatch = fullMatch.match(/\\begin\s*\{(?:tikzpicture|pgfpicture)\}[\s\S]*?\\end\s*\{(?:tikzpicture|pgfpicture)\}/i);
    let code = innerMatch ? innerMatch[0] : fullMatch;

    // Sanitize any corrupted plus signs in TikZ options & coordinate commands
    code = code
      .replace(/\[([^\]]+)\]/g, (_, inner) => {
        return `[${inner.replace(/,\s*\+/g, ', ').replace(/([a-zA-Z0-9_\-]+)\+([a-zA-Z0-9_\-]+)/g, '$1 $2').replace(/\+([a-zA-Z])/g, ' $1')}]`;
      })
      .replace(/\\coordinate\s*\+/g, '\\coordinate ')
      .replace(/\+\(([A-Za-z0-9_]+)\)/g, ' ($1)')
      .replace(/\(([A-Za-z0-9_]+)\)\s*\+at\s*\+/g, '($1) at ')
      .replace(/\(([A-Za-z0-9_]+)\)\s*\+at\s*/g, '($1) at ')
      .replace(/\s*\+--\s*\+/g, ' -- ')
      .replace(/\s*\+--\s*/g, ' -- ')
      .replace(/\s*\+cycle\b/g, ' cycle')
      .replace(/\s*\+node\b/g, ' node')
      .replace(/\s*\+draw\b/g, ' draw')
      .replace(/\\draw\s*\+/g, '\\draw ')
      .replace(/\\fill\s*\+/g, '\\fill ')
      .replace(/\\node\s*\+/g, '\\node ')
      .replace(/\s*\+circle\b/g, ' circle')
      .replace(/\s*\+rectangle\b/g, ' rectangle')
      .replace(/\s*\+arc\b/g, ' arc')
      .replace(/\\path\s*\+/g, '\\path ');

    const id = `tikz-${counter}`;
    const token = `[[TIKZ_IMG_${counter}]]`;
    tikzBlocks.push({
      id,
      token,
      code: code.trim(),
      status: 'idle',
    });
    counter++;
    return `\n${token}\n`;
  });

  return { textWithoutTikz: result, tikzBlocks };
}

/**
 * Parses \choice or \choiceTF arguments (4 items)
 */
function parseChoiceOptions(
  text: string,
  isTrueFalse: boolean = false
): { options: ChoiceOption[]; remainingText: string } | null {
  const choiceKeyword = isTrueFalse ? '\\choiceTF' : '\\choice';
  const choicePos = text.indexOf(choiceKeyword);
  if (choicePos === -1) return null;

  const beforeChoice = text.slice(0, choicePos);
  let searchPos = choicePos + choiceKeyword.length;

  const items: ChoiceOption[] = [];
  const defaultLetters = isTrueFalse ? ['a)', 'b)', 'c)', 'd)'] : ['A', 'B', 'C', 'D'];

  for (let i = 0; i < 4; i++) {
    const braced = extractBracedContent(text, searchPos);
    if (!braced) {
      // If fewer than 4 arguments found, stop
      break;
    }

    let rawOption = braced.content.trim();
    const isCorrect = /\\(?:True|true)\b/.test(rawOption);

    // Strip \True / \true
    rawOption = rawOption.replace(/\\(?:True|true)\b\s*/g, '').trim();

    // If option has existing letter prefix like "a)" or "A.", strip it so we can re-format cleanly
    let cleanContent = rawOption;
    if (isTrueFalse) {
      cleanContent = cleanContent.replace(/^[a-dA-D][\.\)]\s*/, '').trim();
    } else {
      cleanContent = cleanContent.replace(/^[A-Da-d][\.\)]\s*/, '').trim();
    }

    items.push({
      letter: defaultLetters[i] || `${i + 1}`,
      content: cleanContent,
      isCorrect,
    });

    searchPos = braced.endIndex;
  }

  if (items.length === 0) return null;

  const afterChoice = text.slice(searchPos);
  return {
    options: items,
    remainingText: beforeChoice + '\n' + afterChoice,
  };
}

/**
 * Parse a single question block (e.g. from \begin{ex} to \end{ex})
 */
export function parseSingleQuestion(
  rawBlock: string,
  questionNumber: number,
  globalTikzCounter: { count: number },
  globalTabularCounter: { count: number } = { count: 1 }
): ParsedQuestion {
  let content = rawBlock;

  // Extract ID tag: %[2D1Y1-1] or [2D1Y1-1] at start
  let tagId = '';
  const tagMatch = content.match(/^%?\s*\[([^\]]+)\]/);
  if (tagMatch) {
    tagId = tagMatch[1].trim();
    content = content.replace(tagMatch[0], '');
  }

  // Unpack \immini
  content = unpackImmini(content);

  // Extract TikZ blocks
  const { textWithoutTikz, tikzBlocks } = extractTikzBlocks(content, globalTikzCounter.count);
  globalTikzCounter.count += tikzBlocks.length;
  content = textWithoutTikz;

  // Extract \begin{tabular} tables
  const { textWithoutTabular, tabularBlocks } = extractTabularBlocks(content, globalTabularCounter.count);
  globalTabularCounter.count += tabularBlocks.length;
  content = textWithoutTabular;

  // Extract \loigiai{...}
  let solution = '';
  const loigiaiPos = content.indexOf('\\loigiai');
  if (loigiaiPos !== -1) {
    const braced = extractBracedContent(content, loigiaiPos);
    if (braced) {
      solution = cleanDocumentNoise(normalizeVietnameseMath(braced.content.trim()));
      content = content.slice(0, loigiaiPos) + content.slice(braced.endIndex);
    }
  }

  let type: QuestionType = 'essay';
  let options: ChoiceOption[] = [];
  let shortAnswer = '';

  // Check for \choiceTF (True/False 4 statements)
  if (content.includes('\\choiceTF')) {
    const parsedTF = parseChoiceOptions(content, true);
    if (parsedTF) {
      type = 'true_false';
      options = parsedTF.options.map((opt) => ({
        ...opt,
        content: normalizeVietnameseMath(cleanDocumentNoise(opt.content)),
      }));
      content = parsedTF.remainingText;
    }
  } else if (content.includes('\\choice')) {
    // Check for standard \choice (4 options)
    const parsedChoice = parseChoiceOptions(content, false);
    if (parsedChoice) {
      type = 'multiple_choice';
      options = parsedChoice.options.map((opt) => ({
        ...opt,
        content: normalizeVietnameseMath(cleanDocumentNoise(opt.content)),
      }));
      content = parsedChoice.remainingText;
    }
  } else if (content.includes('\\shortans')) {
    // Check for \shortans{...}
    const shortPos = content.indexOf('\\shortans');
    const braced = extractBracedContent(content, shortPos);
    if (braced) {
      type = 'short_answer';
      shortAnswer = normalizeVietnameseMath(cleanDocumentNoise(braced.content.trim()));
      content = content.slice(0, shortPos) + content.slice(braced.endIndex);
    }
  }

  // Final stem cleaning
  let stem = normalizeVietnameseMath(cleanDocumentNoise(content.trim()));

  return {
    id: `q-${questionNumber}`,
    index: questionNumber - 1,
    questionNumber,
    tagId,
    type,
    stem,
    options,
    shortAnswer: shortAnswer || undefined,
    solution: solution || undefined,
    rawLatex: rawBlock.trim(),
    tikzBlocks,
    tabularBlocks,
  };
}

/**
 * Splits LaTeX text by \begin{ex} ... \end{ex} or \begin{bt} ... \end{bt}
 * or handles multiple questions separated by \begin{...}
 */
export function parseExTestLatex(latexContent: string): ParsedQuestion[] {
  if (!latexContent || !latexContent.trim()) {
    return [];
  }

  const globalTikzCounter = { count: 1 };
  const globalTabularCounter = { count: 1 };
  const questions: ParsedQuestion[] = [];

  // Match standard ex_test environments: ex, bt, vd, cau
  const envRegex = /\\begin\{(?:ex|bt|vd|cau)\}([\s\S]*?)\\end\{(?:ex|bt|vd|cau)\}/g;
  let match;
  let qNum = 1;

  while ((match = envRegex.exec(latexContent)) !== null) {
    const rawBlock = match[1];
    const parsed = parseSingleQuestion(rawBlock, qNum, globalTikzCounter, globalTabularCounter);
    questions.push(parsed);
    qNum++;
  }

  // Fallback: If no \begin{ex} was found, check if questions start with \begin{ex} without end, or "Câu 1"
  if (questions.length === 0) {
    // Try splitting by \begin{ex}
    const exSplits = latexContent.split(/\\begin\{(?:ex|bt|vd|cau)\}/);
    if (exSplits.length > 1) {
      for (let i = 1; i < exSplits.length; i++) {
        let block = exSplits[i];
        // Remove trailing \end if present
        block = block.replace(/\\end\{(?:ex|bt|vd|cau)\}[\s\S]*$/, '');
        const parsed = parseSingleQuestion(block, qNum, globalTikzCounter, globalTabularCounter);
        questions.push(parsed);
        qNum++;
      }
    } else {
      // Treat the entire input as a single question/example
      const parsed = parseSingleQuestion(latexContent, 1, globalTikzCounter, globalTabularCounter);
      questions.push(parsed);
    }
  }

  return questions;
}
