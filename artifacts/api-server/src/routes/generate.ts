import { Router, type IRouter, type Request, type Response } from "express";
import { fal } from "@fal-ai/client";
import { GenerateImageBody, GenerateVideoBody, GetJobStatusQueryParams } from "@workspace/api-zod";
import { z } from "zod/v4";

const router: IRouter = Router();

fal.config({
  credentials: process.env.FAL_KEY,
});

function buildImageInput(body: z.infer<typeof GenerateImageBody>) {
  const base: Record<string, unknown> = {
    prompt: body.prompt,
  };
  if (body.negativePrompt) base.negative_prompt = body.negativePrompt;
  if (body.aspectRatio) base.aspect_ratio = body.aspectRatio;
  if (body.numImages) base.num_images = body.numImages;
  if (body.seed) base.seed = body.seed;
  return base;
}

function buildVideoInput(body: z.infer<typeof GenerateVideoBody>) {
  const base: Record<string, unknown> = {
    prompt: body.prompt,
  };
  if (body.negativePrompt) base.negative_prompt = body.negativePrompt;
  if (body.aspectRatio) base.aspect_ratio = body.aspectRatio;
  if (body.duration) base.duration = body.duration;
  if (body.imageUrl) base.image_url = body.imageUrl;
  if (body.seed) base.seed = body.seed;
  return base;
}

function parseOutputs(result: unknown): Array<{ url: string; contentType?: string; width?: number; height?: number; duration?: number }> {
  if (!result || typeof result !== "object") return [];
  const r = result as Record<string, unknown>;

  const outputs: Array<{ url: string; contentType?: string; width?: number; height?: number; duration?: number }> = [];

  // Image outputs
  if (Array.isArray(r.images)) {
    for (const img of r.images as Array<{ url: string; content_type?: string; width?: number; height?: number }>) {
      outputs.push({
        url: img.url,
        contentType: img.content_type,
        width: img.width,
        height: img.height,
      });
    }
  }

  // Video output
  if (r.video && typeof r.video === "object") {
    const v = r.video as { url: string; content_type?: string; duration?: number };
    outputs.push({
      url: v.url,
      contentType: v.content_type,
      duration: v.duration,
    });
  }

  // Direct URL
  if (typeof r.url === "string") {
    outputs.push({ url: r.url });
  }

  return outputs;
}

// POST /api/generate/image
router.post("/generate/image", async (req: Request, res: Response) => {
  try {
    const body = GenerateImageBody.parse(req.body);
    const input = buildImageInput(body);

    const { request_id } = await fal.queue.submit(body.modelId, { input });

    res.json({
      jobId: request_id,
      requestId: request_id,
      status: "queued",
      mediaType: "image",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Image generation error:", message);
    res.status(500).json({ error: "generation_failed", message });
  }
});

// POST /api/generate/video
router.post("/generate/video", async (req: Request, res: Response) => {
  try {
    const body = GenerateVideoBody.parse(req.body);
    const input = buildVideoInput(body);

    const { request_id } = await fal.queue.submit(body.modelId, { input });

    res.json({
      jobId: request_id,
      requestId: request_id,
      status: "queued",
      mediaType: "video",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Video generation error:", message);
    res.status(500).json({ error: "generation_failed", message });
  }
});

// GET /api/jobs/:jobId/status
router.get("/jobs/:jobId/status", async (req: Request, res: Response) => {
  try {
    const { requestId, modelId } = GetJobStatusQueryParams.parse(req.query);
    const jobId = req.params.jobId;

    const status = await fal.queue.status(modelId, {
      requestId,
      logs: true,
    });

    const logs = Array.isArray((status as Record<string, unknown>).logs)
      ? ((status as Record<string, unknown>).logs as Array<{ message: string }>).map((l) => l.message)
      : [];

    if (status.status === "COMPLETED") {
      const result = await fal.queue.result(modelId, { requestId });
      const outputs = parseOutputs(result.data);
      res.json({
        jobId,
        requestId,
        status: "completed",
        outputs,
        logs,
      });
    } else if (status.status === "FAILED") {
      res.json({
        jobId,
        requestId,
        status: "failed",
        error: "Generation failed",
        logs,
      });
    } else if (status.status === "IN_QUEUE") {
      const qPos = (status as Record<string, unknown>).queue_position;
      res.json({
        jobId,
        requestId,
        status: "queued",
        queuePosition: typeof qPos === "number" ? qPos : undefined,
        logs,
      });
    } else {
      res.json({
        jobId,
        requestId,
        status: "in_progress",
        logs,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Job status error:", message);
    res.status(500).json({ error: "status_failed", message });
  }
});

export default router;
