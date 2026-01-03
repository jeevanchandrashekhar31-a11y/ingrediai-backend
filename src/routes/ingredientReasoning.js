import express from "express";
import { callOpenRouter } from "../ai/openrouterClient.js";

const router = express.Router();
// ---------- SEVERITY INFERENCE ----------
function inferSeverity(name) {
  const n = name.toLowerCase();

  if (["salt", "sodium", "sugar", "glucose", "hfcs"].some(k => n.includes(k))) {
    return "HIGH";
  }

  if (["oil", "fat", "flour", "milk powder"].some(k => n.includes(k))) {
    return "MODERATE";
  }

  return "LOW";
}


/* ---------------- Severity Logic ---------------- */

function deriveSeverity(text) {
  const t = text.toLowerCase();

  if (
    t.includes("limit") ||
    t.includes("excess") ||
    t.includes("risk") ||
    t.includes("high intake") ||
    t.includes("pay attention") ||
    t.includes("not ideal daily")
  ) {
    return "HIGH";
  }

  if (
    t.includes("moderation") ||
    t.includes("depends") ||
    t.includes("frequency") ||
    t.includes("context")
  ) {
    return "MODERATE";
  }

  return "LOW";
}

/* ---------------- Fallback ---------------- */

function fallbackIngredient(name) {
  return {
    name,
    severity: "MODERATE",
    why_it_matters:
      "Plays a role in taste, texture, or shelf life of foods.",
    tradeoffs:
      "Improves product quality but increases processing.",
    who_might_care:
      "People who frequently consume packaged foods.",
    confidence_uncertainty:
      "Widely used with generally understood effects.",
  };
}

/* ---------------- Route ---------------- */

router.post("/", async (req, res) => {
  const { ingredients, product_context } = req.body;

  if (!ingredients) {
    return res.status(400).json({ error: "Ingredients are required" });
  }

  const ingredientList = ingredients
    .split(",")
    .map((i) => i.trim())
    .filter(Boolean);

  try {
    const ingredientResults = [];

    for (const ingredient of ingredientList) {
      try {
        /* ---------------- SUPERIOR SYSTEM PROMPT ---------------- */

        const systemPrompt = `
You are a senior food-ingredient intelligence expert.

Your job:
Explain ingredients so people can make better food decisions.

ABSOLUTE RULES:
- Output ONLY valid JSON
- No markdown
- No extra text
- No emojis
- No medical advice
- No fear-based language

STYLE RULES:
- Each field = short bullet-style sentences (not paragraphs)
- 2–3 sentences max per field
- Clear benefits AND downsides
- Concrete, everyday language
- No repetition across fields
- Neutral, confident tone

QUALITY BAR:
Your answer should feel:
- Trustworthy
- Calm
- Decision-ready
- Better than Google summaries

Return EXACTLY this structure:
{
  "name": "${ingredient}",
  "why_it_matters": "",
  "tradeoffs": "",
  "who_might_care": "",
  "confidence_uncertainty": ""
}
`;

        const userPrompt = `
Ingredient: ${ingredient}
Product context: ${product_context || "packaged food"}
`;

        const raw = await callOpenRouter(systemPrompt, userPrompt);

        const cleaned = raw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        const severity = deriveSeverity(
          `${parsed.tradeoffs} ${parsed.who_might_care}`
        );
ingredientResults.push({
  ...parsed,
  severity: inferSeverity(ingredient),
});

      } catch {
        ingredientResults.push(fallbackIngredient(ingredient));
      }
    }

    /* ---------------- Overall Nutrition (SHORT & SCANNABLE) ---------------- */

    const nutritionPrompt = `
You are a food nutrition expert.

Analyze the OVERALL NUTRITION of a product based ONLY on these ingredients:
${ingredientList.join(", ")}

RULES:
- Be ingredient-aware (e.g., salt ≠ carbs, oil ≠ sugar)
- No generic filler sentences
- No medical advice
- 2–3 concise sentences max
- Mention what dominates (salt, fat, sugar, fiber, protein)
- If ingredient is mineral-only (like salt), say so clearly

Return plain text only.
`;


    let overall_nutrition =
      "Higher in refined carbohydrates and fats, with limited protein and fiber. More energy-dense than filling. Best enjoyed occasionally.";

    try {
      overall_nutrition = await callOpenRouter(
        "You summarize nutrition clearly and briefly.",
        nutritionPrompt
      );
    } catch {}

    return res.json({
      ingredients: ingredientResults,
      overall_nutrition,
      overall_conclusion:
        "Convenient and enjoyable, but best balanced with more whole, minimally processed foods.",
    });
  } catch {
    return res.json({
      ingredients: ingredientList.map(fallbackIngredient),
      overall_nutrition:
        "Energy-dense with limited nutritional diversity.",
      overall_conclusion:
        "Occasional use is fine, but not ideal as a daily staple.",
    });
  }
});

export default router;
