import express from "express";
import cors from "cors";
import ingredientReasoningRoute from "./routes/ingredientReasoning.js";

const app = express();

/* -------- MIDDLEWARE -------- */
app.use(cors());
app.use(express.json({ limit: "2mb" }));

/* -------- ROUTES -------- */
app.use("/api/reasoning", ingredientReasoningRoute);

/* -------- HEALTH CHECK -------- */
app.get("/", (req, res) => {
  res.send("IngrediAI backend running");
});

/* -------- START SERVER -------- */
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 IngrediAI backend running on port ${PORT}`);
});
