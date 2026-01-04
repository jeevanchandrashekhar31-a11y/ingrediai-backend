import express from "express";
import fetch from "node-fetch";

const router = express.Router();

/* ---------------- NORMALIZER ---------------- */

function clean(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeIngredient(raw) {
  return {
    name: clean(raw?.name, "Unknown ingredient"),

    severity: clean(raw?.severity, "low").toLowerCase(),

    what_it_is: clean(
      raw?.what_it_is,
      "This ingredient is commonly used in food products."
    ),

    why_it_is_used: clean(
      raw?.why_it_is_used,
      "It is added for functional or practical reasons in food preparation."
    ),

    tradeoffs: clean(
      raw?.tradeoffs,
      "There are no major trade-offs when consumed in normal amounts."
    ),

    uncertainty: clean(
      raw?.uncertainty,
      "Some variation may exist depending on source or usage."
    ),
  };
}




/* ---------------- ROUTE ---------------- */

router.post("/reasoning", async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients) {
      return res.status(400).json({ error: "Ingredients required" });
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      throw new Error("Missing OPENROUTER_API_KEY");
    }

    /* ---------------- PROMPT ---------------- */

    const prompt = `
You are an AI Ingredient Intelligence assistant.

Analyze ONLY the following ingredients exactly as provided.
DO NOT add, infer, or assume any other ingredients.

INGREDIENTS:
${ingredients}

---

Your job is to analyze ONLY the ingredients listed above.
If only one ingredient is provided, return exactly one ingredient.
Never add extra ingredients.
...



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
  "overall_conclusion":
  
  For EACH ingredient, you MUST return ALL of the following fields.
If unsure, still provide a best-effort explanation.

Fields (mandatory, never omit):
- what_it_is
- why_it_is_used
- tradeoffs
- uncertainty

For EACH ingredient, you MUST return ALL of the following fields.
If unsure, still provide a best-effort explanation.

Fields (mandatory, never omit):
- what_it_is
- why_it_is_used
- tradeoffs
- uncertainty

Never merge fields.
Never return empty strings.
Never omit keys.
`;

    /* ---------------- OPENROUTER CALL ---------------- */

    const aiResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:8000",
          "X-Title": "IngrediAI",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a food ingredient expert. Respond ONLY with valid JSON.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
        }),
      }
    );

    const raw = await aiResponse.json();

    if (!raw?.choices?.[0]?.message?.content) {
      console.error("RAW AI RESPONSE:", raw);
      throw new Error("Empty AI response");
    }

    const parsed = JSON.parse(raw.choices[0].message.content);

    /* ---------------- NORMALIZE ---------------- */

    const normalizedIngredients = (parsed.ingredients || []).map(
      normalizeIngredient
    );

    /* ---------------- RESPONSE ---------------- */

    res.json({
      ingredients: normalizedIngredients,
      overall_nutrition_per_100g:
        parsed.overall_nutrition_per_100g || null,
      overall_conclusion: parsed.overall_conclusion || null,
    });
  } catch (err) {
    console.error("AI processing failed:", err);
    res.status(500).json({ error: "AI processing failed" });
  }
});

export default router;
