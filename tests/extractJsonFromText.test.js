// src/utils/extractJsonFromText.test.js
import { describe, expect, test } from 'vitest'
import { extractJsonFromText } from '../src/utils/gemini.jsx'

describe('extractJsonFromText', () => {
  const sampleJson = {
    calories: 435,
    protein: "25g",
    carbs: "40g",
    fat: "22g",
    fiber: "3g"
  };

  test('parses JSON wrapped in ```json block', () => {
    const input = `
      Here is the breakdown:

      \`\`\`json
      {
        "calories": 435,
        "protein": "25g",
        "carbs": "40g",
        "fat": "22g",
        "fiber": "3g"
      }
      \`\`\`
    `;
    expect(extractJsonFromText(input)).toEqual(sampleJson);
  });

  test('parses plain JSON with no wrapping text', () => {
    const input = `{
      "calories": 435,
      "protein": "25g",
      "carbs": "40g",
      "fat": "22g",
      "fiber": "3g"
    }`;
    expect(extractJsonFromText(input)).toEqual(sampleJson);
  });

  test('parses first JSON object when multiple are present', () => {
    const input = `
      Extra info before

      {
        "calories": 435,
        "protein": "25g",
        "carbs": "40g",
        "fat": "22g",
        "fiber": "3g"
      }

      Another object:
      {
        "calories": 999
      }
    `;
    expect(extractJsonFromText(input)).toEqual(sampleJson);
  });

  test('returns null on invalid JSON inside code block', () => {
    const input = `
      \`\`\`json
      {
        "calories": 435,
        "protein": "25g",
        "carbs":  // missing value
        "fat": "22g"
      }
      \`\`\`
    `;
    expect(extractJsonFromText(input)).toBeNull();
  });

  test('returns null on totally invalid text', () => {
    const input = `no json here at all`;
    expect(extractJsonFromText(input)).toBeNull();
  });

  test('ignores explanations outside of code block', () => {
    const input = `
      Here's your breakdown:

      \`\`\`json
      {
        "calories": 435,
        "protein": "25g",
        "carbs": "40g",
        "fat": "22g",
        "fiber": "3g"
      }
      \`\`\`

      Please consult a nutritionist.
    `;
    expect(extractJsonFromText(input)).toEqual(sampleJson);
  });

  test('parses JSON with dish name included', () => {
    const input = `
      \`\`\`json
      {
        "dish": "kadai paneer",
        "nutrition": {
          "calories": 435,
          "protein": "25g",
          "carbs": "40g",
          "fat": "22g",
          "fiber": "3g"
        }
      }
      \`\`\`
    `;
    expect(extractJsonFromText(input)).toEqual(sampleJson);
  });

  // Removed test: nested "macros" key is no longer valid per new prompt
});
