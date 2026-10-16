import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache for rendered TikZ images
const tikzCache = new Map<string, { dataUrl: string; width: number; height: number; rawUrl: string }>();

// Clean & prepare TikZ code for standalone compilation
function prepareTikzPreamble(extraLibraries: string = ''): string {
  return [
    '\\usepackage{amsmath}',
    '\\usepackage{amsfonts}',
    '\\usepackage{amssymb}',
    '\\usepackage{mathrsfs}',
    '\\usepackage{tikz}',
    '\\usepackage{tkz-tab}',
    '\\usepackage{tkz-euclide}',
    '\\usepackage{pgfplots}',
    '\\pgfplotsset{compat=1.18}',
    '\\usetikzlibrary{arrows,arrows.meta,calc,shapes,backgrounds,positioning,intersections,patterns,decorations.markings,angles,quotes}',
    extraLibraries,
  ].filter(Boolean).join('\n');
}

import {
  compileTikz,
  getInMemoryImage,
} from './src/server/tikzCompiler';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // 1. Virtual In-Memory TikZ Compile API:
  // Compiles TikZ into virtual memory buffer (RAM), zero disk files created on user computer
  app.post('/api/tikz/compile', async (req, res) => {
    try {
      const { tikzCode, format = 'png', fontSize = '20px', extraPreamble } = req.body;

      if (!tikzCode || typeof tikzCode !== 'string') {
        res.status(400).json({ error: 'Missing or invalid tikzCode' });
        return;
      }

      const result = await compileTikz({
        tikzCode,
        format: format === 'svg' ? 'svg' : 'png',
        fontSize,
        extraPreamble,
      });

      res.json(result);
    } catch (err: any) {
      console.error('TikZ compile API error:', err);
      res.status(422).json({
        error: err.message || 'Lỗi biên dịch TikZ',
      });
    }
  });

  // 2. Virtual Memory Image Streaming: Streams directly from RAM buffer
  // Zero files are saved to your disk
  app.get('/api/tikz/image/:filename', (req, res) => {
    const { filename } = req.params;
    const img = getInMemoryImage(filename);

    if (!img) {
      res.status(404).json({ error: 'Hình ảnh không tồn tại trong bộ nhớ ảo' });
      return;
    }

    res.setHeader('Content-Type', img.contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.end(img.buffer);
  });

  // 3. Backwards-compatible /api/render-tikz for existing callers
  app.post('/api/render-tikz', async (req, res) => {
    try {
      const { tikzCode, fontSize = '20px' } = req.body;
      if (!tikzCode || typeof tikzCode !== 'string') {
        res.status(400).json({ error: 'Missing or invalid tikzCode' });
        return;
      }

      const result = await compileTikz({
        tikzCode,
        fontSize,
        format: 'png',
      });

      res.json({
        hash: result.hash,
        url: result.url,
        dataUrl: result.dataUrl,
        rawUrl: result.url,
        width: result.width,
        height: result.height,
        cached: result.cached,
      });
    } catch (err: any) {
      console.error('TikZ rendering error:', err);
      res.status(422).json({
        error: err.message || 'Lỗi xử lý hình ảnh TikZ trên máy chủ.',
      });
    }
  });

  // AI-assisted LaTeX syntax correction & ex_test standardization
  app.post('/api/ai-fix-latex', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(503).json({ error: 'Chưa cấu hình GEMINI_API_KEY trên hệ thống.' });
        return;
      }

      const { latexContent, task = 'fix' } = req.body;
      if (!latexContent) {
        res.status(400).json({ error: 'Nội dung LaTeX không được để trống' });
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Bạn là chuyên gia về gói ex_test và LaTeX Toán THPT Việt Nam.
Nhiệm vụ: ${task === 'fix' ? 'Chuẩn hóa và sửa lỗi cú pháp LaTeX ex_test' : 'Tối ưu hóa mã hình vẽ TikZ'}.
Hãy giữ nguyên cấu trúc các câu hỏi \\begin{ex}...\\end{ex}, mã ID %[ID], các lựa chọn \\choice hoặc \\choiceTF, \\shortans, và lời giải \\loigiai.
Sửa các lỗi thường gặp:
1. Thiếu dấu đóng mở ngoặc nhọn {} ở \\choice hoặc \\loigiai.
2. Thiếu cặp dấu $ $ cho công thức toán.
3. Sửa các macro gõ sai chính tả (vd: \\heva, \\hoac, \\vecto, \\dfrac).
4. Nếu mã TikZ có lỗi cú pháp, sửa thành mã TikZ chuẩn biên dịch được.
5. Chỉ trả về mã LaTeX sau khi đã sửa, KHÔNG thêm giải thích hay chữ dẫn trước/sau.

Nội dung LaTeX cần xử lý:
${latexContent}`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      let fixedText = aiResponse.text || '';
      // Strip markdown code fences if model wrapped it in ```latex ... ```
      fixedText = fixedText.replace(/^```(?:latex|tex)?\n([\s\S]*?)\n```$/i, '$1').trim();

      res.json({ fixedText });
    } catch (err: any) {
      console.error('AI Fix error:', err);
      res.status(500).json({ error: err.message || 'Lỗi khi gọi AI sửa LaTeX' });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT) || 3000;

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
