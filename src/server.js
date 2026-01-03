import express from "express";
import cors from "cors";
import ingredientReasoning from "./routes/ingredientReasoning.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/reasoning", ingredientReasoning);

app.get("/", (req, res) => {
  res.send("IngrediAI backend running");
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
