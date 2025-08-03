import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

export const getNutritionFromGemini = async (dish, quantity = 1, unit = 'bowl') => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const fullQuery = `${quantity} ${unit} of ${dish}`;

  const prompt = `
    Give a nutrition breakdown for the following serving: "${fullQuery}".
    Return strictly this JSON format:

    {
      "calories": ,
      "protein": "{}g",
      "carbs": "{}g",
      "fat": "{}g",
      "fiber": "{}g"
    }

    Strictly return only this JSON object — do not include explanations, extra text, or nested structures.
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

