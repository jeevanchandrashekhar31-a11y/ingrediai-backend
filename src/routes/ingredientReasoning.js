import express from "express";

const router = express.Router();

function isGreeting(text) {
  return /^(hi|hello|hey|hii|yo)\b/i.test(text.trim());
}

function buildPrompt(ingredients) {
  return `
You are an expert food ingredient intelligence AI.

Rules:
- No scripted or repeated language
- Think uniquely for this ingredient set
- Nutrition is for the FULL ingredient list
- Nutrition is per 100 grams (approximate)

For each ingredient:
- What it is
- Why it is used
- Trade-offs
- Uncertainty
- Severity (one word)

After all ingredients:
- Overall nutrition per 100g:
  Calories, Carbs, Sugars, Fats, Protein, Fiber
- Overall conclusion

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
          "Hi! I’m your ingredient intelligence assistant. Tell me the ingredients and I’ll explain them.",
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ OPENAI_API_KEY missing");
      return res.status(500).json({ error: "Server misconfigured" });
    }

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
          messages: [{ role: "user", content: buildPrompt(ingredients) }],
          temperature: 0.9,
        }),
      }
    );

    const raw = await response.text();

    if (!response.ok) {
      console.error("❌ OpenAI RAW ERROR:", raw);
      return res.status(500).json({
        error: "OpenAI rejected request",
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
