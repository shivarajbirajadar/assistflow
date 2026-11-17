import { GoogleGenAI } from '@google/genai';
import { env } from './index.js';

const ai = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null;

export const llmAvailable = () => Boolean(ai);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = (promise, ms) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error('LLM request timed out');
      err.code = 'LLM_TIMEOUT';
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

const isRetryable = (err) => {
  const status = Number(err?.status || err?.code);
  const message = String(err?.message || '');
  return (
    [429, 500, 502, 503, 504].includes(status) ||
    /overloaded|unavailable|temporarily|timed out/i.test(message)
  );
};

let lastCallAt = 0;

/**
 * Generate plain text from the LLM.
 * options: { system, json, temperature, retries, timeoutMs, throttleMs }
 */
export async function generateText(prompt, options = {}) {
  const {
    system,
    json = false,
    temperature = 0.2,
    retries = 2,
    timeoutMs = 30000,
    throttleMs = 0,
  } = options;

  if (!ai) {
    const err = new Error('LLM is not configured (GEMINI_API_KEY missing)');
    err.code = 'LLM_NOT_CONFIGURED';
    throw err;
  }

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (throttleMs) {
        const wait = lastCallAt + throttleMs - Date.now();
        if (wait > 0) await sleep(wait);
        lastCallAt = Date.now();
      }

      const response = await withTimeout(
        ai.models.generateContent({
          model: env.GEMINI_MODEL,
          contents: prompt,
          config: {
            ...(system ? { systemInstruction: system } : {}),
            temperature,
            ...(json ? { responseMimeType: 'application/json' } : {}),
          },
        }),
        timeoutMs
      );

      const text = response.text;
      if (!text) throw new Error('LLM returned an empty response');
      return text.trim();
    } catch (err) {
      lastError = err;
      if (attempt < retries && isRetryable(err)) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      break;
    }
  }

  lastError.code = lastError.code || 'LLM_FAILED';
  throw lastError;
}

/** Generate and parse a JSON object from the LLM. */
export async function generateJSON(prompt, options = {}) {
  const text = await generateText(prompt, { ...options, json: true });
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('LLM returned invalid JSON');
  }
}