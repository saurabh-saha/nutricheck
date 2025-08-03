import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

export const getNutritionFromGemini = async (dish) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `Give a nutrition breakdown for "${dish}" in strictly JSON format like:
  {
    "calories": 435,
    "protein": "25g",
    "carbs": "40g",
    "fat": "22g",
    "fiber": "3g"
  }`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const jsonText = text.match(/\{[\s\S]*?\}/)?.[0] // extract first JSON block
    return JSON.parse(jsonText)
  } catch (err) {
    console.error('Gemini SDK error:', err)
    return null
  }
}