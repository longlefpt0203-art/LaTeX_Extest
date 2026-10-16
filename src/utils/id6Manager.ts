export interface ID6Structure {
  raw: string; // e.g. "2D1B1-1" or "2D1Y1"
  grade: '0' | '1' | '2' | '9' | string; // 0=Lớp 10, 1=Lớp 11, 2=Lớp 12, 9=Lớp 9
  subject: 'D' | 'H' | 'X' | string; // D=Đại số/Giải tích, H=Hình học, X=Xác suất & Thống kê
  chapter: number; // 1, 2, 3...
  level: 'Y' | 'B' | 'K' | 'G' | string; // Y=Nhận biết, B=Thông hiểu, K=Vận dụng, G=Vận dụng cao
  lesson: number; // 1, 2, 3...
  subType?: number; // 1, 2, 3... (sau dấu gạch ngang)
  description?: string;
}

export interface QuestionID6Item {
  questionNumber: number;
  currentId?: string;
  suggestedId: string;
  parsedSuggested: ID6Structure;
  stemSnippet: string;
  type: string;
  isOverwritten: boolean;
}

/**
 * Parses an ID6 string into its constituent components
 * Example: "2D1B1-1" -> Grade 12, Algebra/Calculus, Chapter 1, Understanding, Lesson 1, Subtype 1
 */
export function parseID6(idStr: string): ID6Structure {
  const clean = idStr.replace(/^%?\s*\[?|\]?\s*$/g, '').trim();

  // Pattern: [Grade: 0|1|2|9][Subject: D|H|X][Chapter: \d][Level: Y|B|K|G|\d][Lesson: \d](?:-[SubType: \d+])?
  const match = clean.match(/^([0129])([DHX])(\d)([YBKGY1234])(\d)(?:-(\d+))?$/i);

  if (match) {
    const grade = match[1];
    const subject = match[2].toUpperCase();
    const chapter = parseInt(match[3], 10) || 1;
    let level = match[4].toUpperCase();
    if (level === '1') level = 'Y';
    if (level === '2') level = 'B';
    if (level === '3') level = 'K';
    if (level === '4') level = 'G';

    const lesson = parseInt(match[5], 10) || 1;
    const subType = match[6] ? parseInt(match[6], 10) : undefined;

    const gradeText = grade === '2' ? 'Lớp 12' : grade === '1' ? 'Lớp 11' : grade === '0' ? 'Lớp 10' : 'Lớp 9';
    const subjText = subject === 'D' ? 'Giải tích/Đại số' : subject === 'H' ? 'Hình học' : 'Xác suất Thống kê';
    const levelText =
      level === 'Y'
        ? 'Nhận biết'
        : level === 'B'
        ? 'Thông hiểu'
        : level === 'K'
        ? 'Vận dụng'
        : 'Vận dụng cao';

    const desc = `${gradeText} · ${subjText} · Chương ${chapter} · ${levelText} · Bài ${lesson}${subType !== undefined ? ` · Dạng ${subType}` : ''}`;

    return {
      raw: clean,
      grade,
      subject,
      chapter,
      level,
      lesson,
      subType,
      description: desc,
    };
  }

  // Fallback for non-standard IDs
  return {
    raw: clean,
    grade: '2',
    subject: 'D',
    chapter: 1,
    level: 'B',
    lesson: 1,
    description: `Mã ID: ${clean}`,
  };
}

/**
 * Builds a standardized ID6 string
 */
export function buildID6String(
  grade: string,
  subject: string,
  chapter: number | string,
  level: string,
  lesson: number | string,
  subType?: number | string
): string {
  const g = grade || '2';
  const s = (subject || 'D').toUpperCase();
  const c = chapter || '1';
  let l = (level || 'B').toUpperCase();
  if (l === '1') l = 'Y';
  if (l === '2') l = 'B';
  if (l === '3') l = 'K';
  if (l === '4') l = 'G';

  const b = lesson || '1';
  const sub = subType !== undefined && subType !== null && subType !== '' ? `-${subType}` : '';

  return `${g}${s}${c}${l}${b}${sub}`;
}

/**
 * Analyzes question content and keywords to automatically suggest a realistic ID6 code
 */
export function detectID6ForQuestion(
  content: string,
  questionIndex: number = 0,
  fallbackLevel?: string
): ID6Structure {
  const lower = content.toLowerCase();

  let grade = '2';
  let subject = 'D';
  let chapter = 1;
  let level = fallbackLevel || 'B';
  let lesson = 1;

  // 1. Phân môn & Lớp dựa vào các từ khóa toán học đặc trưng
  // Hình học không gian Oxyz -> Lớp 12, Hình học Chương 3 (hoặc 2)
  if (
    lower.includes('oxyz') ||
    lower.includes('mặt phẳng') ||
    lower.includes('mặt cầu') ||
    lower.includes('vectơ') && lower.includes('không gian') ||
    lower.includes('tọa độ') && (lower.includes('z') || lower.includes('k'))
  ) {
    grade = '2';
    subject = 'H';
    chapter = 3;
    lesson = lower.includes('mặt cầu') ? 1 : lower.includes('mặt phẳng') ? 2 : 3;
  }
  // Khối đa diện, hình chóp, lăng trụ, nón, trụ, cầu -> Lớp 12 Hình học Chương 1 / 2
  else if (
    lower.includes('hình chóp') ||
    lower.includes('khối chóp') ||
    lower.includes('lăng trụ') ||
    lower.includes('thể tích khối') ||
    lower.includes('hình nón') ||
    lower.includes('hình trụ')
  ) {
    grade = '2';
    subject = 'H';
    chapter = lower.includes('nón') || lower.includes('trụ') ? 2 : 1;
    lesson = 1;
  }
  // Xác suất & Thống kê
  else if (
    lower.includes('xác suất') ||
    lower.includes('biến ngẫu nhiên') ||
    lower.includes('kỳ vọng') ||
    lower.includes('phân phối xác suất') ||
    lower.includes('ghép nhóm') ||
    lower.includes('khoảng biến thiên') ||
    lower.includes('độ lệch chuẩn') ||
    lower.includes('tứ phân vị')
  ) {
    grade = lower.includes('ghép nhóm') || lower.includes('kỳ vọng') ? '2' : '1';
    subject = 'X';
    chapter = 1;
    lesson = lower.includes('ghép nhóm') ? 1 : 2;
  }
  // Tích phân, nguyên hàm -> Lớp 12 Giải tích Chương 3
  else if (
    lower.includes('\\int') ||
    lower.includes('nguyên hàm') ||
    lower.includes('tích phân') ||
    lower.includes('diện tích hình phẳng')
  ) {
    grade = '2';
    subject = 'D';
    chapter = 3;
    lesson = lower.includes('nguyên hàm') ? 1 : 2;
  }
  // Mũ và Logarit -> Lớp 12 Giải tích Chương 2 (hoặc Lớp 11)
  else if (
    lower.includes('\\log') ||
    lower.includes('\\ln') ||
    lower.includes('mũ') ||
    lower.includes('lũy thừa') ||
    lower.includes('logarit')
  ) {
    grade = '2';
    subject = 'D';
    chapter = 2;
    lesson = lower.includes('log') ? 2 : 1;
  }
  // Khảo sát hàm số, đồ thị, cực trị, bảng biến thiên, đơn điệu -> Lớp 12 Giải tích Chương 1
  else if (
    lower.includes('hàm số') ||
    lower.includes('đồng biến') ||
    lower.includes('nghịch biến') ||
    lower.includes('cực trị') ||
    lower.includes('cực đại') ||
    lower.includes('cực tiểu') ||
    lower.includes('bảng biến thiên') ||
    lower.includes('tiệm cận') ||
    lower.includes('đồ thị')
  ) {
    grade = '2';
    subject = 'D';
    chapter = 1;
    lesson = lower.includes('cực') ? 2 : lower.includes('tiệm cận') ? 4 : 1;
  }
  // Giới hạn, đạo hàm, cấp số -> Lớp 11
  else if (
    lower.includes('\\lim') ||
    lower.includes('giới hạn') ||
    lower.includes('cấp số cộng') ||
    lower.includes('cấp số nhân')
  ) {
    grade = '1';
    subject = 'D';
    chapter = lower.includes('cấp số') ? 2 : 3;
    lesson = 1;
  }
  // Lượng giác -> Lớp 11
  else if (
    lower.includes('\\sin') ||
    lower.includes('\\cos') ||
    lower.includes('\\tan') ||
    lower.includes('lượng giác')
  ) {
    grade = '1';
    subject = 'D';
    chapter = 1;
    lesson = 1;
  }

  // 2. Dự đoán Mức độ nhận thức (Y=Nhận biết, B=Thông hiểu, K=Vận dụng, G=Vận dụng cao)
  if (!fallbackLevel) {
    if (
      lower.includes('có bao nhiêu giá trị nguyên') ||
      lower.includes('tham số $m$') ||
      lower.includes('tham số m') ||
      lower.includes('thực tế') ||
      lower.includes('giá trị lớn nhất của') && lower.includes('f(')
    ) {
      level = 'K';
    } else if (
      lower.includes('hàm hợp') ||
      lower.includes('f(f(x))') ||
      lower.includes('bất phương trình') && lower.includes('m') && lower.includes('\\ge')
    ) {
      level = 'G';
    } else if (
      lower.includes('điểm nào dưới đây') ||
      lower.includes('đạt cực đại tại') ||
      lower.includes('tập xác định của') ||
      lower.includes('tọa độ tâm') ||
      lower.includes('nghiệm của phương trình')
    ) {
      level = 'Y';
    } else {
      level = 'B';
    }
  }

  const subType = (questionIndex % 4) + 1;
  const rawId = buildID6String(grade, subject, chapter, level, lesson, subType);

  return parseID6(rawId);
}

/**
 * Injects or updates ID6 tags in LaTeX ex_test text.
 * Replaces or inserts %[ID6] immediately after \begin{ex}, \begin{bt}, etc.
 */
export function injectID6IntoLatex(
  latexContent: string,
  options: {
    overrideExisting?: boolean;
    defaultGrade?: string;
    defaultSubject?: string;
    defaultChapter?: number;
    defaultLevel?: string;
    customIdMap?: Record<number, string>; // 1-indexed questionNumber -> ID6
  } = {}
): { updatedLatex: string; taggedCount: number; idList: { qNum: number; id: string }[] } {
  if (!latexContent || !latexContent.trim()) {
    return { updatedLatex: latexContent, taggedCount: 0, idList: [] };
  }

  const {
    overrideExisting = false,
    defaultGrade,
    defaultSubject,
    defaultChapter,
    defaultLevel,
    customIdMap = {},
  } = options;

  let qNum = 1;
  let taggedCount = 0;
  const idList: { qNum: number; id: string }[] = [];

  // Match: \begin{ex}%[existing] or \begin{ex}[existing] or \begin{ex}
  const envRegex = /(\\begin\{(?:ex|bt|vd|cau)\})(\s*%?\s*\[([^\]]+)\])?/g;

  const updatedLatex = latexContent.replace(envRegex, (fullMatch, beginTag, existingTagGroup, existingId) => {
    let chosenId = '';

    // If custom ID was specified in map
    if (customIdMap[qNum]) {
      chosenId = customIdMap[qNum];
    } else if (existingId && !overrideExisting) {
      chosenId = existingId.trim();
    } else {
      // Auto-generate ID6
      if (defaultGrade && defaultSubject && defaultChapter) {
        chosenId = buildID6String(
          defaultGrade,
          defaultSubject,
          defaultChapter,
          defaultLevel || 'B',
          1,
          qNum
        );
      } else {
        // Find next chunk of text for this question to detect context
        const detected = detectID6ForQuestion(latexContent.slice(latexContent.indexOf(fullMatch)), qNum - 1, defaultLevel);
        chosenId = detected.raw;
      }
    }

    idList.push({ qNum, id: chosenId });
    taggedCount++;
    qNum++;

    return `${beginTag}%[${chosenId}]`;
  });

  return { updatedLatex, taggedCount, idList };
}

/**
 * Downloads plain string as file in the browser (UTF-8 with BOM for Vietnamese Excel compatibility)
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports question matrix & ID6 breakdown to CSV for Excel / Google Sheets
 */
export function exportID6MatrixToCsv(
  questions: { questionNumber: number; tagId: string; type: string; stem: string }[]
): string {
  const headers = ['STT', 'Mã ID6', 'Lớp', 'Phân môn', 'Chương', 'Mức độ', 'Dạng câu hỏi', 'Nội dung tóm tắt'];
  const rows = [headers.join(',')];

  for (const q of questions) {
    const parsed = parseID6(q.tagId || '2D1B1-1');
    const cleanStem = q.stem.replace(/"/g, '""').replace(/\s+/g, ' ').slice(0, 120);

    const row = [
      q.questionNumber,
      `"${q.tagId || ''}"`,
      `"${parsed.grade === '2' ? 'Lớp 12' : parsed.grade === '1' ? 'Lớp 11' : 'Lớp 10'}"`,
      `"${parsed.subject === 'D' ? 'Giải tích / Đại số' : parsed.subject === 'H' ? 'Hình học' : 'Xác suất Thống kê'}"`,
      `"Chương ${parsed.chapter}"`,
      `"${parsed.level === 'Y' ? 'Nhận biết' : parsed.level === 'B' ? 'Thông hiểu' : parsed.level === 'K' ? 'Vận dụng' : 'Vận dụng cao'}"`,
      `"${q.type}"`,
      `"${cleanStem}..."`,
    ];
    rows.push(row.join(','));
  }

  // Prepend UTF-8 BOM so Microsoft Excel opens Vietnamese characters correctly
  return '\uFEFF' + rows.join('\n');
}
