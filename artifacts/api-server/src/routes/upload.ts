import { Router, type IRouter, type Request, type Response } from "express";
import { fal } from "@fal-ai/client";
import multer from "multer";

const router: IRouter = Router();

fal.config({ credentials: process.env.FAL_KEY });

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max
});

router.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "no_file", message: "No file provided" });
    }

    const blob = new Blob([file.buffer], { type: file.mimetype });
    const url = await fal.storage.upload(blob, {
      filename: file.originalname || "upload",
    });

    res.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Upload error:", message);
    res.status(500).json({ error: "upload_failed", message });
  }
});

export default router;
