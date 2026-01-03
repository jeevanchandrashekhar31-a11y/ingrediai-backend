import express from "express";

const router = express.Router();

/* -------- GREETING DETECTION -------- */
const isGreeting = (text) =>
  /^(hi|hello|hey|hii|yo)\b/i.test(text.trim());

/* -------- PROMPT BUILDER -------- */
function buildPrompt(ingredients) {
  return `
You are an ingredient intelligence AI.

STRICT RULES:
- Respond ONLY with valid JSON
- NO markdown
- NO extra text
- NO explanations outside JSON

JSON FORMAT (exact keys only):

{
  "greeting": string | null,
  "ingredients": [
    {
      "name": string,
      "what_it_is": string,
      "why_it_is_used": string,
      "tradeoffs": string,
      "uncertainty": string,
      "severity": "Low" | "Medium" | "High"
    }
  ],
  "overall_nutrition_per_100g": {
    "calories_kcal": string,
    "carbohydrates_g": string,
    "sugars_g": string,
    "fats_g": string,
    "protein_g": string,
    "fiber_g": string
  },
  "overall_conclusion": string
}

Analyze this ingredient set:
${ingredients}
`;
}

/* -------- POST /api/reasoning -------- */
router.post("/", async (req, res) => {
  const { ingredients } = req.body;

  if (!ingredients || typeof ingredients !== "string") {
    return res.status(400).json({ error: "Invalid ingredients input" });
  }

  /* ---- Greeting short-circuit ---- */
  if (isGreeting(ingredients)) {
    return res.json({
      greeting:
        "Hi! I’m your ingredient intelligence assistant. Paste ingredients and I’ll break them down for you.",
      ingredients: [],
      overall_nutrition_per_100g: null,
      overall_conclusion: null,
    });
  }

  const prompt = buildPrompt(ingredients);

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://ingrediai.app",
          "X-Title": "IngrediAI",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content:
                "You are a JSON-only API. Any response not in JSON is invalid.",
            },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    const raw = await response.text();

    if (!response.ok) {
      console.error("❌ OpenRouter error:", raw);
      throw new Error("OpenRouter failed");
    }

    const data = JSON.parse(raw);
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error("Empty AI response");

    const parsed = JSON.parse(content);

    return res.json(parsed);
  } catch (err) {
    console.error("❌ AI processing failed:", err.message);
    return res.status(500).json({
      error: "AI processing failed",
    });
  }
});

export default router;
