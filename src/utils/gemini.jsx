import { GoogleGenerativeAI } from '@google/generative-ai'
import { nutrientMap } from '../utils/nutritionTracker';
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

const jsonTemplate = nutrientMap.reduce((acc, { key }) => {
  acc[key] = 0;
  return acc;
}, {});

export const getNutritionFromGemini = async (dish, quantity = 1, unit = 'bowl') => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const fullQuery = `${quantity} ${unit} of ${dish}`;

  const prompt = `
    Give a nutrition breakdown for the following serving: "${fullQuery}".
    Return strictly this JSON format:

    ${JSON.stringify(jsonTemplate, null, 2)}

    All values must be integers. Use grams (g) for everything and kcal for calories. Do not include any units in the values.
    Strictly return only this JSON object — no explanations, no extra text, no nested structures.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return extractJsonFromText(text);
  } catch (err) {
    console.error('Gemini SDK error:', err);
    return null;
  }
};

export const getDishSuggestionsFromGemini = async (dish) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `
  Suggest 3 possible variations for the dish: "${dish}".
  For each variation, include:
  - name (string)
  - image (royalty-free image URL, preferably from unsplash.com or wikipedia.org)
  - nutrition (object in this format):
    ${JSON.stringify(jsonTemplate, null, 2)}

  Return strictly a JSON array in this format:
  [
    {
      "name": "...",
      "image": "...",
      "nutrition": { ... }
    },
    ...
  ]

  Rules:
  - All nutrition values must be integers.
  - Use kcal for calories, grams (g) for all other values.
  - Strictly return JSON only — no extra text.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return extractJsonFromText(text); // This now should return an array
  } catch (err) {
    console.error('Gemini SDK error:', err);
    return [];
  }
};



export const extractJsonFromText = (text) => {
  try {
    // 1. Try extracting from ```json ... ``` block
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    let jsonString = null;

    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1].trim();
    } else {
      // 2. Fallback: Try extracting first {...} block
      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }
    }

    if (!jsonString) throw new Error('No valid JSON block found');

    const parsed = JSON.parse(jsonString);

    // 3. Always return flat nutrition object if nested
    if (parsed?.nutrition && typeof parsed.nutrition === 'object') {
      return parsed.nutrition;
    }

    // 4. If already flat nutrition object
    return parsed;
  } catch (err) {
    console.error('JSON parsing failed:', err);
    return null;
  }
};

