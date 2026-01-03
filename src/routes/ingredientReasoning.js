import express from "express";

const router = express.Router();

/* Greeting detection */
function isGreeting(text) {
  return /^(hi|hello|hey|hii|yo)\b/i.test(text.trim());
}

/* Prompt builder */
function buildPrompt(ingredients) {
  return `
You are an expert ingredient intelligence AI.

Rules:
- NO scripted or repeated wording
- Think uniquely for every ingredient set
- Nutrition is for the FULL ingredient list
- Nutrition is PER 100 GRAMS (approximate, realistic)

For EACH ingredient:
- What it is
- Why it is used
- Trade-offs
- Uncertainty
- Severity (ONE word)

AFTER all ingredients:
- Overall nutrition per 100g:
  Calories (kcal)
  Carbohydrates (g)
  Sugars (g)
  Fats (g)
  Protein (g)
  Fiber (g)

- Overall conclusion (unique, human, non-generic)

Ingredients:
${ingredients}
`;
}

router.post("/", async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients) {
      return res.status(400).json({ error: "Ingredients required" });
    }

    if (isGreeting(ingredients)) {
      return res.json({
        analysis:
          "Hi! I’m your ingredient intelligence assistant. Tell me the ingredients and I’ll explain what they mean for your food.",
      });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      console.error("❌ OPENROUTER_API_KEY missing");
      return res.status(500).json({ error: "Server not configured" });
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost",
          "X-Title": "IngrediAI",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: buildPrompt(ingredients),
            },
          ],
          temperature: 0.9,
        }),
      }
    );

    const raw = await response.text();

    if (!response.ok) {
      console.error("❌ OpenRouter ERROR:", raw);
      return res.status(500).json({
        error: "OpenRouter request failed",
        details: raw,
      });
    }

    const data = JSON.parse(raw);

    res.json({
      ingredients,
      analysis: data.choices[0].message.content,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ Backend crash:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
