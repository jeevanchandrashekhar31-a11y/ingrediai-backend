import express from "express";

const router = express.Router();

/* -------- Greeting detection -------- */
function isGreeting(text) {
  return /^(hi|hello|hey|hii|yo)\b/i.test(text.trim());
}

/* -------- Prompt Builder -------- */
function buildPrompt(ingredients) {
  return `
You are an expert food ingredient intelligence AI.

CRITICAL RULES:
- NO scripted or repetitive language
- Think freshly for THIS ingredient combination
- Nutrition must be for the FULL ingredient set
- Nutrition must be PER 100 GRAMS (approximate, realistic)
- Be clear, neutral, and practical

For EACH ingredient:
1. What it is
2. Why it is used
3. Trade-offs
4. Uncertainty
5. Severity (one word only)

AFTER all ingredients:
- Overall nutrition per 100g:
  Calories (kcal)
  Carbohydrates (g)
  Sugars (g)
  Fats (g)
  Protein (g)
  Fiber (g)

- Overall conclusion (non-scripted, unique)

Ingredient list:
${ingredients}
`;
}

/* -------- POST /api/reasoning -------- */
router.post("/", async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients || typeof ingredients !== "string") {
      return res.status(400).json({ error: "Ingredients text is required" });
    }

    // Greeting response
    if (isGreeting(ingredients)) {
      return res.json({
        analysis:
          "Hi! I’m your ingredient intelligence assistant. Tell me the ingredients and I’ll break them down for you.",
      });
    }

    const prompt = buildPrompt(ingredients);

    // ✅ Node 18+ has fetch globally (Render supports this)
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI error:", err);
      return res.status(500).json({ error: "AI processing failed" });
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content;

    res.json({
      ingredients,
      analysis: output,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Backend error:", err);
    res.status(500).json({ error: "Failed to process ingredient reasoning" });
  }
});

export default router;
