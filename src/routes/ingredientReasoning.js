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

CRITICAL RULES:
- No scripted or repeated language
- Think uniquely for every input
- Nutrition must be for the FULL ingredient set
- Nutrition must be PER 100 GRAMS
- Values must be realistic and approximate

For EACH ingredient, explain:
- What it is
- Why it is used
- Trade-offs
- Scientific uncertainty
- Severity (ONE WORD only: Low / Medium / High)

AFTER all ingredient explanations:

### Overall Nutrition (per 100g)
- Calories (kcal)
- Carbohydrates (g)
- Sugars (g)
- Fats (g)
- Protein (g)
- Fiber (g)

### Overall Conclusion
- Unique to THIS ingredient combination
- No generic wording

Ingredient list:
${ingredients}
`;
}

router.post("/", async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients || typeof ingredients !== "string") {
      return res.status(400).json({ error: "Invalid ingredients input" });
    }

    /* Greeting shortcut */
    if (isGreeting(ingredients)) {
      return res.json({
        analysis:
          "Hi! I’m your ingredient intelligence assistant. Paste a list of food ingredients and I’ll break them down, assess trade-offs, and estimate overall nutrition per 100g.",
      });
    }

    const prompt = buildPrompt(ingredients);

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.9,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText);
    }

    const data = await response.json();

    res.json({
      ingredients,
      analysis: data.choices?.[0]?.message?.content ?? "",
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Ingredient reasoning error:", err);
    res.status(500).json({
      error: "Failed to process ingredient reasoning",
    });
  }
});

export default router;
