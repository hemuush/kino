export interface GeminiOptions {
  model?: string;
  enableSearch?: boolean;
  responseMimeType?: string;
}

/**
 * Helper to call the Google AI Studio Gemini API with fallback support.
 */
async function attemptCall(
  model: string,
  apiKey: string,
  prompt: string,
  enableSearch: boolean,
  responseMimeType?: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body: any = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {},
  };

  if (enableSearch) {
    body.tools = [
      {
        google_search: {},
      },
    ];
  }

  // responseMimeType is incompatible with search grounding tool
  if (responseMimeType && !enableSearch) {
    body.generationConfig.responseMimeType = responseMimeType;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    let errMsg = errText;
    try {
      const parsed = JSON.parse(errText);
      errMsg = parsed?.error?.message || errText;
    } catch {}
    throw new Error(`Gemini API returned ${res.status}: ${errMsg}`);
  }

  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error('Gemini returned an empty response (possibly blocked by safety filters).');
  }

  return content;
}

export async function callGemini(
  prompt: string,
  options: GeminiOptions = {}
): Promise<{ content: string; model: string }> {
  const apiKey =
    process.env.googleaistudio_kino_apikey ||
    process.env.GOOGLEAISTUDIO_KINO_APIKEY ||
    process.env.GEMINI_API_KEY ||
    process.env.gemini_api_key ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Gemini API key is not configured. Please add googleaistudio_kino_apikey to your .env.local file.'
    );
  }

  const defaultModel = options.model || 'gemini-3.1-flash-lite';
  const modelPriority = [
    defaultModel,
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash',
    'gemini-3-flash-preview',
    'gemma-4-31b-it',
    'gemma-4-26b-a4b-it',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite'
  ];
  const uniqueModels = Array.from(new Set(modelPriority));
  
  // Only attempt search grounding on models known to support search grounding
  // and have search grounding quota (Gemini 2.5 / 2.0). Gemini 3 has 0/0 search grounding quota.
  const searchSupportedModels = new Set([
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash-001',
    'gemini-2.0-flash-lite-001'
  ]);

  let lastError: Error | null = null;

  // Tier 1: Try with search grounding (if requested and supported)
  if (options.enableSearch) {
    for (const model of uniqueModels) {
      if (!searchSupportedModels.has(model)) {
        // Skip search grounding for models that do not support it or have 0/0 search quota
        continue;
      }
      try {
        console.log(`[Gemini Engine] Attempting call with model "${model}" (Search grounding: ENABLED)`);
        const content = await attemptCall(model, apiKey, prompt, true, options.responseMimeType);
        console.log(`[Gemini Engine] Success with model "${model}" (Search grounding: ENABLED)`);
        return { content, model };
      } catch (err) {
        console.warn(`[Gemini Engine] Model "${model}" failed (Search grounding: ENABLED):`, err instanceof Error ? err.message : err);
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }
    console.warn('[Gemini Engine] All search grounding attempts failed or were skipped. Falling back to non-grounded attempts...');
  }

  // Tier 2: Try without search grounding (or if search was not requested)
  for (const model of uniqueModels) {
    try {
      console.log(`[Gemini Engine] Attempting call with model "${model}" (Search grounding: DISABLED)`);
      const content = await attemptCall(model, apiKey, prompt, false, options.responseMimeType);
      console.log(`[Gemini Engine] Success with model "${model}" (Search grounding: DISABLED)`);
      return { content, model };
    } catch (err) {
      console.warn(`[Gemini Engine] Model "${model}" failed (Search grounding: DISABLED):`, err instanceof Error ? err.message : err);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error('Failed to query Gemini API using all available models');
}
