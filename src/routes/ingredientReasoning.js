import express from "express";
import fetch from "node-fetch";

const router = express.Router();

/* ===============================
   POST /api/reasoning
================================ */
router.post("/reasoning", async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients || ingredients.trim().length === 0) {
      return res.status(400).json({
        error: "Ingredients are required",
      });
    }

    const input = ingredients.trim();
    const normalized = input.toLowerCase();

    /* -------------------------------
       Conversation handling
    -------------------------------- */
    const greetings = [
      "hi",
      "hello",
      "hey",
      "good morning",
      "good evening",
      "good afternoon",
    ];

    if (greetings.includes(normalized)) {
      return res.json({
        type: "conversation",
        response:
          "Hi! I’m your ingredient intelligence assistant. Tell me the ingredients or food you want to understand.",
      });
    }

    /* -------------------------------
       AI reasoning prompt
    -------------------------------- */
    const prompt = `
You are an ingredient intelligence assistant.

User input:
"${input}"

Your task:

1. Identify each ingredient in the list.
2. For EACH ingredient, explain:
   - What it is
   - Why it is used
   - Trade-offs
   - Uncertainty
   - Severity (ONE WORD ONLY: Low, Medium, or High)

IMPORTANT RULES:
- Do NOT include nutrition numbers for individual ingredients.
- Do NOT use scripted or repeated phrasing.

3. After all ingredient explanations, provide:
   Overall Nutrition per 100g (combined estimate):
   - Calories (kcal)
   - Carbohydrates (g)
   - Sugars (g)
   - Fats (g)
   - Protein (g)
   - Fiber (g)

4. Then provide:
   - Overall nutrition assessment
   - A unique, human-style overall conclusion

STYLE:
- Natural language
- No templates
- No repeated wording
- Realistic but approximate values
`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
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
                "You generate non-scripted, thoughtful ingredient analysis like a real nutrition expert.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.85,
          frequency_penalty: 0.6,
          presence_penalty: 0.6,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenRouter error:", err);
      return res.status(500).json({ error: "AI provider error" });
    }

    const data = await response.json();
    const output = data?.choices?.[0]?.message?.content;

    res.json({
      type: "analysis",
      ingredients: input,
      result: output,
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
