import express from "express";
import cors from "cors";
import ingredientReasoning from "./routes/ingredientReasoning.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check (VERY useful on Render)
app.get("/", (req, res) => {
  res.json({ status: "IngrediAI backend running" });
});

// ✅ MOUNT ROUTES HERE
app.use("/api", ingredientReasoning);

// Port
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
