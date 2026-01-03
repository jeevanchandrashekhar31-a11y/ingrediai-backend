import express from "express";
import fetch from "node-fetch";

const router = express.Router();

/* ---------------- NORMALIZER (CRITICAL FIX) ---------------- */

function normalizeIngredient(raw) {
  return {
    name: raw?.name || "Unknown ingredient",

    severity: (raw?.severity || "low").toLowerCase(),

    what_it_is:
      raw?.what_it_is ||
      "This ingredient is commonly used in food products.",

    why_it_is_used:
      raw?.why_it_is_used ||
      "It is added to improve texture, stability, taste, or functionality.",

    tradeoffs:
      raw?.tradeoffs ||
      "No major trade-offs when consumed within recommended limits.",

    uncertainty:
      raw?.uncertainty ||
      "Scientific understanding is generally clear, though minor variations may exist."
  };
}

/* ---------------- ROUTE ---------------- */

router.post("/reasoning", async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients) {
      return res.status(400).json({ error: "Ingredients required" });
    }

    /* ---------------- FINAL PROMPT (DO NOT CHANGE FRONTEND) ---------------- */

    const prompt = `
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
""
}
`;

    /* ---------------- OPENROUTER CALL ---------------- */

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      })
    });

    const data = await response.json();

    const rawContent = data?.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("Empty AI response");
    }

    const parsed = JSON.parse(rawContent);

    /* ---------------- APPLY NORMALIZATION ---------------- */

    const normalizedIngredients = (parsed.ingredients || []).map(
      normalizeIngredient
    );

    /* ---------------- FINAL RESPONSE (FRONTEND SAFE) ---------------- */

    res.json({
      ingredients: normalizedIngredients,
      overall_nutrition_per_100g:
        parsed.overall_nutrition_per_100g || null,
      overall_conclusion:
        parsed.overall_conclusion || null
    });

  } catch (err) {
    console.error("AI processing failed:", err);
    res.status(500).json({ error: "AI processing failed" });
  }
});

export default router;
