import { Router, type IRouter } from "express";

const router: IRouter = Router();

const MODELS = [
  {
    id: "fal-ai/nano-banana-2",
    name: "Nano Banana 2",
    provider: "Google",
    type: "text-to-image",
    description: "Google's state-of-the-art Imagen model. Fast, photorealistic image generation with excellent prompt adherence.",
    tags: ["photorealistic", "fast", "commercial"],
    supportsDuration: false,
    supportsImageInput: false,
    maxDuration: null,
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
  },
  {
    id: "fal-ai/nano-banana-pro",
    name: "Nano Banana Pro",
    provider: "Google",
    type: "text-to-image",
    description: "Google's premium Imagen model with enhanced detail, realism, and superior image quality for professional use.",
    tags: ["photorealistic", "professional", "high-quality"],
    supportsDuration: false,
    supportsImageInput: false,
    maxDuration: null,
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
  },
  {
    id: "fal-ai/kling-video/v3/pro/text-to-video",
    name: "KLING 3.0 Pro",
    provider: "Kuaishou",
    type: "text-to-video",
    description: "KLING's most advanced video generation model. Cinematic quality, coherent motion, and precise text-to-video generation.",
    tags: ["cinematic", "high-quality", "motion"],
    supportsDuration: true,
    supportsImageInput: false,
    maxDuration: 10,
    aspectRatios: ["16:9", "9:16", "1:1"],
  },
  {
    id: "fal-ai/kling-video/v3/pro/image-to-video",
    name: "KLING 3.0 Pro (Image→Video)",
    provider: "Kuaishou",
    type: "image-to-video",
    description: "Animate any image into a dynamic video clip. KLING 3.0's motion synthesis engine preserves subject identity.",
    tags: ["image-to-video", "animation", "motion"],
    supportsDuration: true,
    supportsImageInput: true,
    maxDuration: 10,
    aspectRatios: ["16:9", "9:16", "1:1"],
  },
  {
    id: "fal-ai/veo3",
    name: "VEO 3.1",
    provider: "Google DeepMind",
    type: "text-to-video",
    description: "Google DeepMind's flagship video model. Generates high-fidelity videos with realistic physics and natural motion.",
    tags: ["realistic", "physics", "google"],
    supportsDuration: true,
    supportsImageInput: false,
    maxDuration: 8,
    aspectRatios: ["16:9", "9:16", "1:1"],
  },
  {
    id: "fal-ai/sora-2/text-to-video",
    name: "Sora 2",
    provider: "OpenAI",
    type: "text-to-video",
    description: "OpenAI's Sora 2 model for high-quality video generation with exceptional scene understanding and temporal coherence.",
    tags: ["openai", "temporal", "scene"],
    supportsDuration: true,
    supportsImageInput: false,
    maxDuration: 10,
    aspectRatios: ["16:9", "9:16", "1:1"],
  },
  {
    id: "fal-ai/sora-2/image-to-video",
    name: "Sora 2 (Image→Video)",
    provider: "OpenAI",
    type: "image-to-video",
    description: "Animate images into videos using OpenAI's Sora 2. Maintains visual fidelity while adding natural motion.",
    tags: ["openai", "image-to-video", "animation"],
    supportsDuration: true,
    supportsImageInput: true,
    maxDuration: 10,
    aspectRatios: ["16:9", "9:16", "1:1"],
  },
];

router.get("/models", (_req, res) => {
  res.json({ models: MODELS });
});

export default router;
