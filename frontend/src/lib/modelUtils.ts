/**
 * Shared model name formatting and ID normalization utilities.
 */

export function cleanModelId(rawId?: string | null): string {
  if (!rawId) return 'openrouter/auto';
  let cleaned = rawId.trim();
  while (cleaned.includes('openrouter/openrouter/')) {
    cleaned = cleaned.replace('openrouter/openrouter/', 'openrouter/');
  }
  return cleaned;
}

export function formatModelName(rawId?: string | null): string {
  if (!rawId) return 'Auto Router';
  const clean = cleanModelId(rawId);

  // Well-known friendly mappings
  const friendlyNames: Record<string, string> = {
    'openrouter/auto': 'OpenRouter Auto',
    'openrouter/openrouter/auto': 'OpenRouter Auto',
    'gemini/gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini/gemini-2.5-pro': 'Gemini 2.5 Pro',
    'gemini/gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite',
    'gemini/gemini-3-flash-preview': 'Gemini 3 Flash Preview',
    'gemini/gemini-3.1-pro-preview': 'Gemini 3.1 Pro Preview',
    'gemini/gemini-flash-latest': 'Gemini Flash Latest',
    'gemini/gemini-pro-latest': 'Gemini Pro Latest',
  };

  if (friendlyNames[clean]) {
    return friendlyNames[clean];
  }

  // Strip known provider prefix
  const stripped = clean.replace(
    /^(?:gemini|openrouter|nvidia_nim|nvidia|openai|groq|anthropic|deepseek|ollama|custom)\//i,
    ''
  );

  // Title-case words and format dashes
  return stripped
    .split(/[-_/]/)
    .filter(Boolean)
    .map((word) => {
      // Special acronyms
      if (/^(ai|llm|api|pro|r1|v3|gpt|it|tps)$/i.test(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function getModelProvider(rawId?: string | null): string {
  if (!rawId) return 'Auto';
  const clean = cleanModelId(rawId).toLowerCase();
  if (clean.startsWith('gemini/')) return 'Gemini';
  if (clean.startsWith('openrouter/')) return 'OpenRouter';
  if (clean.startsWith('groq/')) return 'Groq';
  if (clean.startsWith('nvidia/') || clean.startsWith('nvidia_nim/')) return 'Nvidia NIM';
  if (clean.startsWith('anthropic/')) return 'Anthropic';
  if (clean.startsWith('deepseek/')) return 'DeepSeek';
  if (clean.startsWith('openai/')) return 'OpenAI';
  if (clean.startsWith('ollama/')) return 'Ollama';
  return 'Provider';
}
