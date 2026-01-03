import express from "express";
import cors from "cors";
import ingredientReasoning from "./routes/ingredientReasoning.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/reasoning", ingredientReasoning);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`IngrediAI backend running on port ${PORT}`);
});
