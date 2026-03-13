const BASE = "/api";

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  type: "text-to-image" | "text-to-video" | "image-to-video";
  description: string;
  tags: string[];
  supportsDuration: boolean;
  supportsImageInput: boolean;
  maxDuration: number | null;
  aspectRatios: string[];
}

export interface MediaOutput {
  url: string;
  contentType?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface GenerationResponse {
  jobId: string;
  requestId: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  mediaType: "image" | "video";
  outputs?: MediaOutput[];
  error?: string;
}

export interface JobStatusResponse {
  jobId: string;
  requestId: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  queuePosition?: number;
  outputs?: MediaOutput[];
  error?: string;
  logs?: string[];
}

export interface ImageGenerationRequest {
  modelId: string;
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
  numImages?: number;
  seed?: number;
}

export interface VideoGenerationRequest {
  modelId: string;
  prompt: string;
  negativePrompt?: string;
  duration?: string;
  aspectRatio?: string;
  imageUrl?: string;
  seed?: number;
}

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || "Request failed");
  return data as T;
}

export const api = {
  listModels: () => request<{ models: ModelInfo[] }>("/models"),

  generateImage: (body: ImageGenerationRequest) =>
    request<GenerationResponse>("/generate/image", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  generateVideo: (body: VideoGenerationRequest) =>
    request<GenerationResponse>("/generate/video", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getJobStatus: (jobId: string, requestId: string, modelId: string) =>
    request<JobStatusResponse>(
      `/jobs/${jobId}/status?requestId=${encodeURIComponent(requestId)}&modelId=${encodeURIComponent(modelId)}`
    ),
};
