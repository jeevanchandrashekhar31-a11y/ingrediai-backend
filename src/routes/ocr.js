import express from "express";
import multer from "multer";
import Tesseract from "tesseract.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const {
      data: { text },
    } = await Tesseract.recognize(req.file.buffer, "eng", {
      logger: () => {},
    });

    // clean ingredient-style text
    const cleanedText = text
      .replace(/\n+/g, ", ")
      .replace(/[^a-zA-Z0-9, ]/g, "")
      .trim();

    res.json({
      extracted_text: cleanedText,
    });
  } catch (err) {
    res.status(500).json({
      error: "OCR failed",
    });
  }
});

export default router;
