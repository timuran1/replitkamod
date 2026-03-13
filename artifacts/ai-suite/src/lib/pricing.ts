export const RATE_PER_CREDIT = 363;

export const MODEL_CREDITS: Record<string, { credits: number; unit: string }> = {
  "fal-ai/nano-banana-2": { credits: 2, unit: "изображение" },
  "fal-ai/nano-banana-pro": { credits: 2, unit: "изображение" },
  "fal-ai/flux/schnell": { credits: 1, unit: "изображение" },
  "fal-ai/flux-pro": { credits: 3, unit: "изображение" },
  "fal-ai/recraft-v3": { credits: 2, unit: "изображение" },
  "fal-ai/ideogram/v2": { credits: 2, unit: "изображение" },
  "fal-ai/kling-video/v3/pro/text-to-video": { credits: 50, unit: "видео (5с)" },
  "fal-ai/veo3": { credits: 250, unit: "видео (5с)" },
  "fal-ai/sora-2/text-to-video": { credits: 200, unit: "видео (5с)" },
  "fal-ai/wan/v2.2-a14b/text-to-video": { credits: 25, unit: "видео (5с)" },
  "fal-ai/kling-video/v3/pro/image-to-video": { credits: 50, unit: "видео (5с)" },
  "fal-ai/sora-2/image-to-video": { credits: 200, unit: "видео (5с)" },
  "fal-ai/wan/v2.2-a14b/image-to-video": { credits: 25, unit: "видео (5с)" },
  "fal-ai/kling-video/v3/pro/motion-control": { credits: 60, unit: "генерация" },
  "fal-ai/kling-video/v3/standard/motion-control": { credits: 60, unit: "генерация" },
  "fal-ai/sync-lipsync": { credits: 30, unit: "минута" },
  "fal-ai/sync-lipsync/v2": { credits: 30, unit: "минута" },
  "fal-ai/f5-tts": { credits: 5, unit: "генерация" },
  "fal-ai/tada/3b/text-to-speech": { credits: 5, unit: "генерация" },
  "fal-ai/tada/1b/text-to-speech": { credits: 5, unit: "генерация" },
};

export function formatUZS(uzs: number): string {
  if (uzs >= 1000) return `${Math.round(uzs / 1000 * 10) / 10}K`;
  return uzs.toLocaleString("ru-RU");
}

export function getModelPricing(modelId: string): { credits: number; uzs: number; unit: string } | null {
  const p = MODEL_CREDITS[modelId];
  if (!p) return null;
  return { credits: p.credits, uzs: p.credits * RATE_PER_CREDIT, unit: p.unit };
}

export const PLANS = [
  {
    id: "free",
    name: "FREE",
    priceUZS: 0,
    priceUSD: "$0",
    credits: 10,
    creditsLabel: "10 изображений/день",
    badge: null,
    cta: "Начать бесплатно",
    ctaVariant: "ghost" as const,
    highlight: false,
    features: [
      "10 изображений в день",
      "Только Wan 2.5",
      "Водяной знак на всех работах",
      "Стандартная очередь",
    ],
  },
  {
    id: "starter",
    name: "STARTER",
    priceUZS: 89900,
    priceUSD: "≈$7",
    credits: 200,
    creditsLabel: "200 кредитов/мес",
    badge: null,
    cta: "Выбрать",
    ctaVariant: "ghost" as const,
    highlight: false,
    features: [
      "200 кредитов в месяц",
      "≈100 изображений или 4 видео (5с)",
      "Nano Banana, Wan 2.2, FLUX Schnell",
      "Без водяного знака",
    ],
  },
  {
    id: "creator",
    name: "CREATOR",
    priceUZS: 199900,
    priceUSD: "≈$15.6",
    credits: 550,
    creditsLabel: "550 кредитов/мес",
    badge: "⭐ ХИТ",
    cta: "Выбрать",
    ctaVariant: "accent" as const,
    highlight: true,
    features: [
      "550 кредитов в месяц",
      "≈275 изображений или 11 видео",
      "Все модели включая KLING 3.0",
      "Cinematic prompt presets",
      "Приоритетная очередь",
    ],
  },
  {
    id: "studio",
    name: "STUDIO",
    priceUZS: 379900,
    priceUSD: "≈$29.7",
    credits: 1100,
    creditsLabel: "1 100 кредитов/мес",
    badge: null,
    cta: "Выбрать",
    ctaVariant: "ghost" as const,
    highlight: false,
    features: [
      "1 100 кредитов в месяц",
      "≈550 изображений или 22 видео",
      "Все модели: Veo 3.1 и Sora 2",
      "Upscale HD без ограничений",
      "AI Director workflow",
      "Максимальный приоритет",
    ],
  },
];

export const CALCULATOR_ROWS = [
  {
    plan: "Free",
    credits: "10/день",
    images: "10",
    wanVideos: "0",
    klingVideos: "0",
    tts: "0",
  },
  {
    plan: "Starter",
    credits: "200",
    images: "100",
    wanVideos: "8",
    klingVideos: "4",
    tts: "40",
  },
  {
    plan: "Creator",
    credits: "550",
    images: "275",
    wanVideos: "22",
    klingVideos: "11",
    tts: "110",
  },
  {
    plan: "Studio",
    credits: "1 100",
    images: "550",
    wanVideos: "44",
    klingVideos: "22",
    tts: "220",
  },
];
