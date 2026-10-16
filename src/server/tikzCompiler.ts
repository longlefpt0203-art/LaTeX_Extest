import crypto from 'crypto';

export interface TikzCompileOptions {
  tikzCode: string;
  format?: 'png' | 'svg';
  dpi?: number;
  fontSize?: string;
  extraPreamble?: string;
}

export interface TikzCompileResult {
  hash: string;
  filename: string;
  url: string;
  format: 'png' | 'svg';
  width: number;
  height: number;
  cached: boolean;
  dataUrl: string;
  engine?: string;
}

// 100% Virtual In-Memory Store in RAM (Zero disk clutter, zero files created on the user's computer)
interface InMemoryImage {
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
  format: 'png' | 'svg';
  createdAt: number;
  engine: string;
}

const memoryCache = new Map<string, InMemoryImage>();

/**
 * Optimizes LaTeX preamble to only include packages needed for this specific TikZ code.
 * Greatly speeds up compilation time (from ~8s down to 1-2s) and prevents timeouts.
 */
export function getOptimizedPreamble(code: string, extra: string = ''): string {
  const needsTkzTab = code.includes('tkzTab') || code.includes('tkz-tab') || code.includes('\\tkzTabInit');
  const needsTkzEuclide = (code.includes('tkz') || code.includes('\\tkz')) && !needsTkzTab;
  const needsPgfplots = code.includes('axis') || code.includes('pgfplots') || code.includes('\\addplot');

  const pkgs = [
    '\\usepackage{amsmath}',
    '\\usepackage{amsfonts}',
    '\\usepackage{amssymb}',
    '\\usepackage{mathrsfs}',
    '\\usepackage{tikz}',
  ];

  if (needsTkzTab) {
    pkgs.push('\\usepackage{tkz-tab}');
  }
  if (needsTkzEuclide) {
    pkgs.push('\\usepackage{tkz-euclide}');
  }
  if (needsPgfplots) {
    pkgs.push('\\usepackage{pgfplots}');
    pkgs.push('\\pgfplotsset{compat=1.18}');
  }

  pkgs.push('\\usetikzlibrary{arrows,arrows.meta,calc,shapes,backgrounds,positioning,intersections,patterns,decorations.markings,angles,quotes}');

  if (extra) {
    pkgs.push(extra);
  }

  return pkgs.join('\n');
}

/**
 * Backward compatibility
 */
export function getStandardPreamble(extra: string = ''): string {
  return getOptimizedPreamble('\\tkzTabInit \\pgfplots', extra);
}

/**
 * Automatically sanitizes TikZ code if spaces were erroneously corrupted into plus signs (+)
 * while strictly preserving mathematical plus signs ($+\\infty$, $+ 2$, etc.)
 */
export function sanitizeTikzCode(code: string): string {
  let cleaned = code;

  // 1. Fix options list [scale=1.6, +line+join=round, +line+cap=round]
  cleaned = cleaned.replace(/\[([^\]]+)\]/g, (_, inner) => {
    const fixedInner = inner
      .replace(/,\s*\+/g, ', ')
      .replace(/([a-zA-Z0-9_\-]+)\+([a-zA-Z0-9_\-]+)/g, '$1 $2')
      .replace(/\+([a-zA-Z])/g, ' $1');
    return `[${fixedInner}]`;
  });

  // 2. Fix TikZ commands where space was turned into +
  cleaned = cleaned
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

  return cleaned;
}

/**
 * Computes deterministic SHA256 hash
 */
export function computeTikzHash(options: TikzCompileOptions): string {
  const cleanCode = sanitizeTikzCode(options.tikzCode);
  const normalized = {
    code: cleanCode.trim().replace(/\r\n/g, '\n'),
    format: options.format || 'png',
    fontSize: options.fontSize || '20px',
    preamble: (options.extraPreamble || '').trim(),
  };

  return crypto.createHash('sha256').update(JSON.stringify(normalized), 'utf8').digest('hex').slice(0, 20);
}

/**
 * Primary 3rd-party compiler: Kroki.io (High-performance standalone TeX service)
 */
async function compileWithKroki(
  formula: string,
  preamble: string,
  format: 'png' | 'svg' = 'png'
): Promise<{ buffer: Buffer; contentType: string; width: number; height: number }> {
  const doc = `\\documentclass[border=2pt,varwidth]{standalone}
${preamble}
\\begin{document}
${formula}
\\end{document}
`;

  const endpoint = format === 'svg' ? 'https://kroki.io/tikz/svg' : 'https://kroki.io/tikz/png';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain; charset=UTF-8',
      'Accept': format === 'svg' ? 'image/svg+xml' : 'image/png',
    },
    body: doc,
    signal: AbortSignal.timeout(6500), // 6.5s strict timeout to prevent proxy hangs
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Kroki TeX Error: ${errorText.slice(0, 200)}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = format === 'svg' ? 'image/svg+xml' : 'image/png';

  return {
    buffer,
    contentType,
    width: 350,
    height: 220,
  };
}

/**
 * Secondary 3rd-party compiler: QuickLaTeX
 */
async function compileWithQuickLaTeX(
  formula: string,
  preamble: string,
  fontSize: string = '20px'
): Promise<{ buffer: Buffer; contentType: string; width: number; height: number }> {
  const postBody = [
    'formula=' + encodeURIComponent(formula),
    'fsize=' + encodeURIComponent(fontSize),
    'fcolor=000000',
    'mode=0',
    'out=1',
    'errors=1',
    'remhost=quicklatex.com',
    'preamble=' + encodeURIComponent(preamble),
  ].join('&');

  const response = await fetch('https://www.quicklatex.com/latex3.f', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body: postBody,
    signal: AbortSignal.timeout(8500), // 8.5s timeout
  });

  if (!response.ok) {
    throw new Error(`QuickLaTeX HTTP ${response.status}`);
  }

  const text = await response.text();
  const match = text.match(/^(-?\d+)\s*([^\s]+)\s+(\d+)\s+(\d+)\s+(\d+)([\s\S]*)$/);

  if (!match) {
    throw new Error(`Cú pháp TikZ không hợp lệ: ${text.slice(0, 150)}`);
  }

  const status = parseInt(match[1], 10);
  const imageUrl = match[2];
  const width = parseInt(match[4], 10) || 300;
  const height = parseInt(match[5], 10) || 200;
  const errorMsg = match[6]?.trim();

  if (status !== 0 || !imageUrl || imageUrl.includes('error.png')) {
    throw new Error(errorMsg || 'Không thể biên dịch mã TikZ qua QuickLaTeX.');
  }

  const imgFetch = await fetch(imageUrl, {
    signal: AbortSignal.timeout(5000),
  });
  if (!imgFetch.ok) {
    throw new Error(`Không thể tải dữ liệu ảnh từ ${imageUrl}`);
  }

  const arrayBuffer = await imgFetch.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: 'image/png',
    width,
    height,
  };
}

/**
 * Generates an SVG fallback with TikZ formula badge if 3rd party providers are unreachable
 */
function generateFallbackSvg(formula: string, reason: string): { buffer: Buffer; contentType: string; width: number; height: number } {
  const snippet = formula
    .replace(/\\begin\{tikzpicture\}/g, '')
    .replace(/\\end\{tikzpicture\}/g, '')
    .trim()
    .slice(0, 120);

  const escapedSnippet = snippet
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const escapedReason = reason
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, 80);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="150" viewBox="0 0 400 150" fill="none">
    <rect width="400" height="150" rx="8" fill="#0F172A" stroke="#334155" stroke-width="1.5"/>
    <rect x="16" y="16" width="36" height="24" rx="4" fill="#3B82F6" fill-opacity="0.2"/>
    <text x="34" y="32" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#60A5FA" text-anchor="middle">TikZ</text>
    <text x="60" y="32" font-family="system-ui, sans-serif" font-size="12" font-weight="500" fill="#94A3B8">Mã hình học TikZ</text>
    <rect x="16" y="50" width="368" height="52" rx="4" fill="#1E293B" stroke="#334155"/>
    <text x="26" y="70" font-family="monospace" font-size="10.5" fill="#E2E8F0">${escapedSnippet}</text>
    <text x="26" y="88" font-family="monospace" font-size="10.5" fill="#64748B">...</text>
    <text x="16" y="125" font-family="system-ui, sans-serif" font-size="11" fill="#F87171">⚠️ ${escapedReason || 'Chờ kết nối dịch vụ biên dịch'}</text>
  </svg>`;

  return {
    buffer: Buffer.from(svg, 'utf-8'),
    contentType: 'image/svg+xml',
    width: 400,
    height: 150,
  };
}

/**
 * Compiles TikZ using 3rd party services with multi-engine fallback into virtual RAM buffer
 */
export async function compileTikz(options: TikzCompileOptions): Promise<TikzCompileResult> {
  const format = options.format || 'png';
  const hash = computeTikzHash(options);
  const filename = `${hash}.${format}`;
  const url = `/api/tikz/image/${filename}`;

  // 1. Check virtual RAM cache
  if (memoryCache.has(hash)) {
    const cachedItem = memoryCache.get(hash)!;
    return {
      hash,
      filename,
      url,
      format: cachedItem.format,
      width: cachedItem.width,
      height: cachedItem.height,
      cached: true,
      engine: cachedItem.engine,
      dataUrl: `data:${cachedItem.contentType};base64,${cachedItem.buffer.toString('base64')}`,
    };
  }

  // 2. Prepare TikZ formula
  let formula = sanitizeTikzCode(options.tikzCode).trim();
  if (!formula.includes('\\begin{tikzpicture}')) {
    formula = `\\begin{tikzpicture}\n${formula}\n\\end{tikzpicture}`;
  }

  const preamble = getOptimizedPreamble(formula, options.extraPreamble);
  const fontSize = options.fontSize || '20px';

  let buffer: Buffer;
  let contentType: string;
  let width = 350;
  let height = 220;
  let engine = 'kroki';

  // Strategy: Try Kroki (ultra-fast) first with strict timeout, fallback to QuickLaTeX (TeX Live)
  try {
    const krokiRes = await compileWithKroki(formula, preamble, format);
    buffer = krokiRes.buffer;
    contentType = krokiRes.contentType;
    width = krokiRes.width;
    height = krokiRes.height;
    engine = 'kroki';
  } catch (err: any) {
    console.warn('Kroki compilation failed or timed out, trying QuickLaTeX fallback:', err.message);
    try {
      const qlRes = await compileWithQuickLaTeX(formula, preamble, fontSize);
      buffer = qlRes.buffer;
      contentType = qlRes.contentType;
      width = qlRes.width;
      height = qlRes.height;
      engine = 'quicklatex';
    } catch (qlErr: any) {
      console.error('QuickLaTeX fallback also failed:', qlErr.message);
      // If user had a syntax error, throw it clearly
      const cleanMsg = (qlErr.message || err.message || '').replace(/[\r\n]+/g, ' ');
      throw new Error(`Lỗi biên dịch TikZ: ${cleanMsg}`);
    }
  }

  // Store purely in virtual memory (RAM)
  memoryCache.set(hash, {
    buffer,
    contentType,
    width,
    height,
    format: contentType.includes('svg') ? 'svg' : 'png',
    createdAt: Date.now(),
    engine,
  });

  const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;

  return {
    hash,
    filename,
    url,
    format: contentType.includes('svg') ? 'svg' : 'png',
    width,
    height,
    cached: false,
    engine,
    dataUrl,
  };
}

/**
 * Retrieves in-memory buffer for HTTP streaming (Zero disk I/O)
 */
export function getInMemoryImage(filename: string): { buffer: Buffer; contentType: string } | null {
  const hash = filename.replace(/\.(png|svg)$/, '');
  const item = memoryCache.get(hash);
  if (item) {
    return { buffer: item.buffer, contentType: item.contentType };
  }
  return null;
}
