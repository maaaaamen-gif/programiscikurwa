import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = process.env.PORT || 3001;
const directory = path.dirname(fileURLToPath(import.meta.url));
const buildDirectory = path.resolve(directory, '../dist');
const generationWindows = new Map();
const rateWindowMs = 10 * 60 * 1000;

app.set('trust proxy', 1);

app.use(express.json({ limit: '32kb' }));

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, generatorConfigured: Boolean(process.env.GEMINI_API_KEY) });
});

app.post('/api/generate', (request, response, next) => {
  const now = Date.now();
  const current = generationWindows.get(request.ip);
  const window = !current || now >= current.expiresAt ? { count: 0, expiresAt: now + rateWindowMs } : current;
  if (window.count >= 12) return response.status(429).json({ error: 'Za dużo próśb. Spróbuj ponownie za kilka minut.' });
  window.count += 1;
  generationWindows.set(request.ip, window);
  for (const [ip, value] of generationWindows) {
    if (now >= value.expiresAt) generationWindows.delete(ip);
  }
  return next();
}, async (request, response) => {
  const prompt = typeof request.body?.prompt === 'string' ? request.body.prompt.trim() : '';

  if (!prompt || prompt.length > 10000) {
    return response.status(400).json({ error: 'Polecenie musi mieć od 1 do 10 000 znaków.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return response.status(503).json({ error: 'Generator nie jest skonfigurowany. Dodaj klucz Gemini na serwerze.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Napisz kod zgodnie z poleceniem. Zwróć kod i krótki opis, bez niebezpiecznych działań.\n\nPolecenie:\n${prompt}`,
    });

    return response.json({ code: result.text || 'Model nie zwrócił treści.' });
  } catch (error) {
    console.error('Code generation failed:', error.message);
    return response.status(502).json({ error: 'Nie udało się wygenerować kodu. Spróbuj ponownie za chwilę.' });
  }
});

if (existsSync(buildDirectory)) {
  app.use(express.static(buildDirectory));
  app.get('*', (_request, response) => response.sendFile(path.join(buildDirectory, 'index.html')));
}

app.listen(port, () => console.log(`Pracownia działa na porcie ${port}`));