// Pure helper (no browser/Firebase imports) so the Netlify Function can share it.

// Return the first balanced {...} or [...] in text, respecting quoted strings.
const firstBalancedJson = (text) => {
  const start = text.search(/[[{]/);
  if (start === -1) return null;
  const stack = [];
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{' || ch === '[') stack.push(ch === '{' ? '}' : ']');
    else if (ch === '}' || ch === ']') {
      if (stack.pop() !== ch) return null;
      if (stack.length === 0) return text.slice(start, i + 1);
    }
  }
  return null;
};

export const extractJsonFromText = (text) => {
  try {
    const raw = String(text ?? '').trim();
    let jsonString = null;

    // 1. ```json ... ``` block
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1].trim();
    } else {
      // 2. Whole response (JSON mode) or first balanced {...}/[...] in the text
      jsonString = firstBalancedJson(raw);
    }

    if (!jsonString) throw new Error('No valid JSON block found');

    const parsed = JSON.parse(jsonString);

    // Always return flat nutrition object if nested
    if (parsed?.nutrition && typeof parsed.nutrition === 'object' && !Array.isArray(parsed)) {
      return parsed.nutrition;
    }
    return parsed;
  } catch (err) {
    console.error('JSON parsing failed:', err);
    return null;
  }
};
