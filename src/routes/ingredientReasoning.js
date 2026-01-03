import express from "express";

const router = express.Router();

/* Greeting detection */
function isGreeting(text) {
  return /^(hi|hello|hey|hii|hiii|yo)\b/i.test(text.trim());
}

function buildPrompt(ingredients) {
  return `
You are an expert Ingredient Intelligence AI.

First, detect intent:
- If the user greets (hi, hello, hey, etc.), respond briefly:
  "Hi, I’m your ingredient intelligence assistant. Paste ingredients or ask about food."

Otherwise, analyze the FULL ingredient list below as ONE food product.

STRICT RULES:
- Do NOT use scripted or repeated wording.
- Think uniquely for this exact ingredient combination.
- Be realistic, approximate, and human.
- Nutrition must be for the FULL ingredient set (not per ingredient).
- Nutrition must be PER 100 GRAMS.
- Do NOT include disclaimers.

For EACH ingredient, provide:
- what_it_is
- why_it_is_used
- tradeoffs
- uncertainty
- severity (ONE word only: Low / Moderate / High)

After ALL ingredients, provide:
1) overall_nutrition_per_100g with:
   - calories_kcal
   - carbohydrates_g
   - sugars_g
   - fats_g
   - protein_g
   - fiber_g

2) overall_conclusion:
   - A short, clear, non-repetitive summary
   - Must reflect THIS ingredient set only

Respond ONLY in valid JSON.

INGREDIENTS:
${ingredients}
`;
}

router.post("/", async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients || typeof ingredients !== "string") {
      return res.status(400).json({ error: "Invalid ingredients input" });
    }

    if (isGreeting(ingredients)) {
      return res.json({
        greeting:
          "Hi, I’m your ingredient intelligence assistant. Paste ingredients or ask about food.",
      });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "HTTP-Referer": "https://ingrediai.app",
    "X-Title": "IngrediAI",
  },
  body: JSON.stringify({
    model: "openai/gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an ingredient intelligence AI. Respond ONLY in valid JSON. Do not add markdown or text outside JSON.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.8,
  }),
});



   if (!response.ok) {
  const text = await response.text();
  console.error("OpenRouter error:", text);
  return res.status(500).json({
    error: "AI processing failed",
    debug: text,
  });
}


    const data = await response.json();
    const output = data.choices?.[0]?.message?.content;

    let parsed;
try {
  parsed = JSON.parse(output);
} catch {
  throw new Error("Invalid JSON from model");
}

return res.json(parsed);


   
  } catch (err) {
    console.error("Ingredient reasoning error:", err);
    res.status(500).json({ error: "AI processing failed" });
  }
});

export default router;
