// Gemini is called through the Netlify Function in netlify/functions/gemini.mjs.
// The API key stays on the server; nothing secret is bundled into the browser.
export { extractJsonFromText } from './extractJson.js';

const GEMINI_ENDPOINT = '/.netlify/functions/gemini';
const CLIENT_TIMEOUT_MS = 15000;
const MAX_IMAGE_SIDE = 1024;

// Downscale and re-encode the photo so the upload stays small (function body limit is 6 MB).
const imageToBase64Jpeg = async (file) => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  return { data: dataUrl.split(',')[1], mimeType: 'image/jpeg' };
};

const callGemini = async (payload) => {
  const res = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Gemini function failed (${res.status})`);
  return data.result;
};

export const getNutritionFromGemini = async (dish, quantity = 1, unit = 'bowl') => {
  try {
    return await callGemini({ kind: 'nutrition', dish, quantity, unit });
  } catch (err) {
    console.error('Gemini error:', err);
    return null;
  }
};

export const getDishSuggestionsFromGemini = async (dish, quantity, unit, dishImage) => {
  try {
    const image = dishImage ? await imageToBase64Jpeg(dishImage) : undefined;
    const result = await callGemini({ kind: 'suggestions', dish, quantity, unit, image });
    return Array.isArray(result) ? result : [];
  } catch (err) {
    console.error('Gemini error:', err);
    return [];
  }
};
