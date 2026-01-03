import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import ingredientReasoningRoute from "./routes/ingredientReasoning.js";
import ocrRoute from "./routes/ocr.js";

dotenv.config();

/* ---------------- APP INIT ---------------- */

const app = express(); // ✅ MUST COME FIRST

/* ---------------- MIDDLEWARE ---------------- */

app.use(cors());
app.use(express.json({ limit: "10mb" }));

/* ---------------- ROUTES ---------------- */

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "IngrediAI Backend" });
});

app.use("/api/reasoning", ingredientReasoningRoute);
app.use("/api/ocr", ocrRoute);

/* ---------------- SERVER ---------------- */

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`IngrediAI backend running on port ${PORT}`);
});
