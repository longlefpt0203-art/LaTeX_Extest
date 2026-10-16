export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';

export interface ChoiceOption {
  letter: string; // 'A', 'B', 'C', 'D' or 'a)', 'b)', 'c)', 'd)'
  content: string;
  isCorrect: boolean;
}

export interface TikzBlock {
  id: string; // Unique ID, e.g. "tikz-1"
  token: string; // Placeholder in text, e.g. "[[TIKZ_IMG_1]]"
  code: string; // Raw tikz code: \begin{tikzpicture}...\end{tikzpicture}
  status: 'idle' | 'rendering' | 'success' | 'error';
  hash?: string;
  url?: string; // Public URL: /api/tikz/image/:hash.png
  dataUrl?: string; // base64 data:image/png;base64,... (for word docx embedding)
  rawUrl?: string;
  width?: number;
  height?: number;
  format?: 'png' | 'svg';
  engine?: 'pdflatex_local' | 'tex_engine_remote';
  cached?: boolean;
  errorMsg?: string;
}

import { TabularBlock } from '../utils/tabularParser';

export interface ParsedQuestion {
  id: string;
  index: number;
  questionNumber: number;
  tagId: string; // e.g. "2D1Y1-1" or "Mã: 101"
  type: QuestionType;
  stem: string; // Question body
  options: ChoiceOption[];
  shortAnswer?: string;
  solution?: string; // Detailed solution
  rawLatex: string;
  tikzBlocks: TikzBlock[];
  tabularBlocks?: TabularBlock[];
}

export type CorrectMarkStyle = 'star' | 'underline' | 'bracket' | 'bold';

export type MathMode = 'mathtype_toggle' | 'mathml' | 'plain_tex';

export interface ConversionSettings {
  correctMarkStyle: CorrectMarkStyle; // 'star' -> *A., 'underline' -> <u>A.</u>, 'bracket' -> [A], 'bold' -> **A.**
  questionTitleFormat: 'Câu {n}:' | 'Câu {n}.' | '[Câu {n}]' | 'Bài {n}:';
  includeIdTag: boolean;
  includeSolution: boolean;
  solutionHeader: string;
  mathMode: MathMode;
  renderTikzToPng: boolean;
  tikzResolution: '18px' | '20px' | '24px';
  cleanLaTeXNoise: boolean; // Remove \noindent, \centering, etc.
  convertVietnameseMacros: boolean; // \heva -> cases, \hoac -> bracket, \vec -> overrightarrow
  splitTrueFalsePerLine: boolean;
}

export interface RenderTikzResponse {
  dataUrl: string;
  rawUrl: string;
  width: number;
  height: number;
  error?: string;
}
