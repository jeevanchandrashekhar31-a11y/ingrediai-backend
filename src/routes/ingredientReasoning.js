import express from "express";

const router = express.Router();

/* Greeting detection */
function isGreeting(text) {
  return /^(hi|hello|hey|hii|hiii|yo)\b/i.test(text.trim());
}

/* Prompt builder */
function buildPrompt(ingredients) {
  return `
You are an expert ingredient intelligence AI.

Rules:
- No scripted or repeated language
- Think uniquely for every input
- Nutrition must be for the FULL ingredient set (not per ingredient)
- Nutrition must be PER 100 GRAMS
- Be realistic and approximate

For EACH ingredient, explain:
• What it is
• Why it is used
• Trade-offs
• Uncertainty
• Severity (ONE word only: low / moderate / high)

After ALL ingredients:
1) Overall nutrition per 100g:
   - Calories (kcal)
   - Carbohydrates (g)
   - Sugars (g)
   - Fats (g)
   - Protein (g)
   - Fiber (g)

2) Overall conclusion (fresh, non-scripted)

Ingredients:
${ingredients}
`;
}

router.post("/reasoning", async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients || typeof ingredients !== "string") {
      return res.status(400).json({
        error: "Ingredients must be a text string",
      });
    }

    /* Greeting shortcut */
    if (isGreeting(ingredients)) {
      return res.json({
        type: "greeting",
        message:
          "Hi 👋 I’m your ingredient intelligence assistant. Paste ingredients and I’ll break them down clearly.",
      });
    }

    const prompt = buildPrompt(ingredients);

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://ingrediai.app",
          "X-Title": "IngrediAI",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a critical food ingredient analyst. Avoid templates and generic phrasing.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.85,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText);
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content;

    res.json({
      ingredients,
      analysis: output,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Ingredient reasoning error:", err.message);
    res.status(500).json({
      error: "Failed to process ingredient reasoning",
    });
  }
});

export default router;
