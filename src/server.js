import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ingredientReasoningRoute from "./routes/ingredientReasoning.js";

console.log("Starting backend...");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Ingredient Reasoning Backend Running");
});

app.use("/api/reasoning/ingredient", ingredientReasoningRoute);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
