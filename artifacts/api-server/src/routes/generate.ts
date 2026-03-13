import { Router, type IRouter, type Request, type Response } from "express";
import { fal } from "@fal-ai/client";

const router: IRouter = Router();

fal.config({ credentials: process.env.FAL_KEY });

// ─── OUTPUT PARSING ────────────────────────────────────────────────────────

function parseOutputs(result: unknown): Array<{ url: string; contentType?: string; width?: number; height?: number; duration?: number }> {
  if (!result || typeof result !== "object") return [];
  const r = result as Record<string, unknown>;
  const outputs: Array<{ url: string; contentType?: string; width?: number; height?: number; duration?: number }> = [];

  if (Array.isArray(r.images)) {
    for (const img of r.images as Array<{ url: string; content_type?: string; width?: number; height?: number }>) {
      outputs.push({ url: img.url, contentType: img.content_type, width: img.width, height: img.height });
    }
  }

  if (r.video && typeof r.video === "object") {
    const v = r.video as { url: string; content_type?: string; duration?: number };
    outputs.push({ url: v.url, contentType: v.content_type, duration: v.duration });
  }

  if (Array.isArray(r.videos)) {
    for (const v of r.videos as Array<{ url: string; content_type?: string; duration?: number }>) {
      outputs.push({ url: v.url, contentType: v.content_type, duration: v.duration });
    }
  }

  if (r.audio_url && typeof r.audio_url === "object") {
    const a = r.audio_url as { url: string; content_type?: string; duration?: number };
    outputs.push({ url: a.url, contentType: a.content_type, duration: a.duration });
  }

  if (typeof r.audio_url === "string") {
    outputs.push({ url: r.audio_url, contentType: "audio/mpeg" });
  }

  if (r.audio && typeof r.audio === "object") {
    const a = r.audio as { url: string; content_type?: string; duration?: number };
    outputs.push({ url: a.url, contentType: a.content_type ?? "audio/wav", duration: a.duration });
  }

  if (typeof r.url === "string") {
    outputs.push({ url: r.url });
  }

  return outputs;
}

async function submitJob(modelId: string, input: Record<string, unknown>, mediaType: string, res: Response) {
  const { request_id } = await fal.queue.submit(modelId, { input });
  res.json({ jobId: request_id, requestId: request_id, status: "queued", mediaType });
}

// ─── ROUTES ────────────────────────────────────────────────────────────────

// POST /api/generate/image
router.post("/generate/image", async (req: Request, res: Response) => {
  try {
    const { modelId, prompt, negativePrompt, aspectRatio, numImages, seed, imageUrl, imageStrength } = req.body as Record<string, unknown>;
    if (!modelId || !prompt) return res.status(400).json({ error: "missing_fields", message: "modelId and prompt required" });
    const input: Record<string, unknown> = { prompt };
    if (negativePrompt) input.negative_prompt = negativePrompt;
    if (aspectRatio) input.aspect_ratio = aspectRatio;
    if (numImages) input.num_images = numImages;
    if (seed) input.seed = seed;
    if (imageUrl) { input.image_url = imageUrl; input.image_size = undefined; }
    if (imageUrl && imageStrength !== undefined) input.strength = imageStrength;
    await submitJob(modelId as string, input, "image", res);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Image generation error:", message);
    res.status(500).json({ error: "generation_failed", message });
  }
});

// POST /api/generate/video
router.post("/generate/video", async (req: Request, res: Response) => {
  try {
    const { modelId, prompt, negativePrompt, aspectRatio, duration, imageUrl, seed, generateAudio } = req.body as Record<string, unknown>;
    if (!modelId || !prompt) return res.status(400).json({ error: "missing_fields", message: "modelId and prompt required" });
    const input: Record<string, unknown> = { prompt };
    if (negativePrompt) input.negative_prompt = negativePrompt;
    if (aspectRatio) input.aspect_ratio = aspectRatio;
    if (duration) input.duration = duration;
    if (imageUrl) input.image_url = imageUrl;
    if (seed) input.seed = seed;
    if (generateAudio !== undefined) input.generate_audio = generateAudio;
    await submitJob(modelId as string, input, "video", res);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Video generation error:", message);
    res.status(500).json({ error: "generation_failed", message });
  }
});

// POST /api/generate/motion
router.post("/generate/motion", async (req: Request, res: Response) => {
  try {
    const { modelId, imageUrl, videoUrl, prompt, characterOrientation } = req.body as Record<string, unknown>;
    if (!modelId || !imageUrl || !videoUrl) return res.status(400).json({ error: "missing_fields", message: "modelId, imageUrl, and videoUrl required" });
    const input: Record<string, unknown> = { image_url: imageUrl, video_url: videoUrl };
    if (prompt) input.prompt = prompt;
    if (characterOrientation) input.character_orientation = characterOrientation;
    await submitJob(modelId as string, input, "video", res);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Motion generation error:", message);
    res.status(500).json({ error: "generation_failed", message });
  }
});

// POST /api/generate/lipsync
router.post("/generate/lipsync", async (req: Request, res: Response) => {
  try {
    const { modelId, videoUrl, audioUrl } = req.body as Record<string, unknown>;
    if (!modelId || !videoUrl || !audioUrl) return res.status(400).json({ error: "missing_fields", message: "modelId, videoUrl, and audioUrl required" });
    const input: Record<string, unknown> = { video_url: videoUrl, audio_url: audioUrl };
    await submitJob(modelId as string, input, "video", res);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Lipsync generation error:", message);
    res.status(500).json({ error: "generation_failed", message });
  }
});

// POST /api/generate/tts
router.post("/generate/tts", async (req: Request, res: Response) => {
  try {
    const { modelId, text, voice, speed, referenceAudioUrl } = req.body as Record<string, unknown>;
    if (!modelId || !text) return res.status(400).json({ error: "missing_fields", message: "modelId and text required" });
    const input: Record<string, unknown> = { text };
    if (voice) input.voice = voice;
    if (speed) input.speed = speed;
    if (referenceAudioUrl) {
      input.reference_audio_url = referenceAudioUrl;
      input.ref_audio_url = referenceAudioUrl;
    }

    // TTS models are fast — try direct run first
    try {
      const result = await fal.run(modelId as string, { input });
      const outputs = parseOutputs(result);
      if (outputs.length > 0) {
        return res.json({ jobId: "direct", requestId: "direct", status: "completed", mediaType: "audio", outputs });
      }
    } catch {
      // Fall back to queue
    }

    await submitJob(modelId as string, input, "audio", res);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("TTS generation error:", message);
    res.status(500).json({ error: "generation_failed", message });
  }
});

// GET /api/jobs/:jobId/status
router.get("/jobs/:jobId/status", async (req: Request, res: Response) => {
  try {
    const requestId = req.query.requestId as string;
    const modelId = req.query.modelId as string;
    const jobId = req.params.jobId;

    if (!requestId || !modelId) return res.status(400).json({ error: "missing_fields", message: "requestId and modelId required" });

    if (jobId === "direct") {
      return res.json({ jobId, requestId, status: "completed" });
    }

    const status = await fal.queue.status(modelId, { requestId, logs: true });
    const logs = Array.isArray((status as Record<string, unknown>).logs)
      ? ((status as Record<string, unknown>).logs as Array<{ message: string }>).map((l) => l.message)
      : [];

    if (status.status === "COMPLETED") {
      const result = await fal.queue.result(modelId, { requestId });
      const outputs = parseOutputs(result.data);
      return res.json({ jobId, requestId, status: "completed", outputs, logs });
    }

    if (status.status === "FAILED") {
      return res.json({ jobId, requestId, status: "failed", error: "Generation failed", logs });
    }

    if (status.status === "IN_QUEUE") {
      const qPos = (status as Record<string, unknown>).queue_position;
      return res.json({ jobId, requestId, status: "queued", queuePosition: typeof qPos === "number" ? qPos : undefined, logs });
    }

    return res.json({ jobId, requestId, status: "in_progress", logs });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Job status error:", message);
    res.status(500).json({ error: "status_failed", message });
  }
});

export default router;
