import express from "express";

const router = express.Router();

/* -------- GREETING DETECTION -------- */
const isGreeting = (text) =>
  /^(hi|hello|hey|hii|yo)\b/i.test(text.trim());

/* -------- PROMPT BUILDER -------- */
function buildPrompt(ingredients) {
  return `
You are an AI Ingredient Intelligence assistant.

Your job is to analyze a list of food ingredients and respond in a calm,
clear, human-expert tone.

IMPORTANT OUTPUT RULES (STRICT):

1. For EACH ingredient, return ONLY these fields:
   - name
   - what_it_is
   - why_it_is_used
   - tradeoffs
   - uncertainty
   - severity  (one word only: Low | Medium | High)

2. DO NOT include:
   - definitions disguised as explanations
   - chemistry textbook language
   - marketing language
   - moral judgments

3. Write for a normal consumer who wants to understand food labels quickly.

4. Severity must reflect real-world dietary concern, not danger hype.

5. After all ingredients:
   - Provide overall_nutrition_per_100g (realistic, approximate values)
   - Provide a short, human overall_conclusion
   - Nutrition and conclusion should depend on the FULL ingredient set,
     not individual ingredients.

6. Keep nutrition factual and neutral.
7. Keep conclusions practical, not preachy.

---

INGREDIENT EXPLANATION STYLE (VERY IMPORTANT):

• what_it_is:
  Plain-language description of what the ingredient actually is.

• why_it_is_used:
  Why manufacturers include it (function, texture, shelf life, taste, cost).

• tradeoffs:
  Pros vs cons of having it in food (health, quality, processing).

• uncertainty:
  What science, sourcing, or usage levels are still unclear or variable.

• severity:
  One word only — Low, Medium, or High.

---

OUTPUT FORMAT (JSON ONLY):

{
  "ingredients": [
    {
      "name": "",
      "what_it_is": "",
      "why_it_is_used": "",
      "tradeoffs": "",
      "uncertainty": "",
      "severity": ""
    }
  ],
  "overall_nutrition_per_100g": {
    "calories_kcal": "",
    "carbohydrates_g": "",
    "sugars_g": "",
    "fats_g": "",
    "protein_g": "",
    "fiber_g": ""
  },
  "overall_conclusion": ""
}

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
