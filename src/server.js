import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });


console.log("ENV CHECK:", process.env.OPENROUTER_API_KEY);


import express from "express";
import cors from "cors";
import ingredientReasoning from "./routes/ingredientReasoning.js";

const app = express();

/* ---------- MIDDLEWARE ---------- */
app.use(cors());
app.use(express.json());

/* ---------- ROUTES ---------- */
app.use("/api", ingredientReasoning);

/* ---------- HEALTH CHECK ---------- */
app.get("/", (req, res) => {
  res.send("IngrediAI backend running");
});

/* ---------- SERVER ---------- */
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
