import { supabase } from "./supabase";

const BASE = "/api";

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  category: "image" | "video" | "motion-control" | "lipsync" | "tts";
  type: string;
  description: string;
  tags: string[];
  supportsDuration: boolean;
  supportsImageInput: boolean;
  supportsVideoInput: boolean;
  supportsAudioInput: boolean;
  maxDuration: number | null;
  aspectRatios: string[];
  voices: string[];
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
  mediaType: "image" | "video" | "audio";
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
  imageUrl?: string;
  imageStrength?: number;
}

export interface VideoGenerationRequest {
  modelId: string;
  prompt: string;
  negativePrompt?: string;
  duration?: string;
  aspectRatio?: string;
  imageUrl?: string;
  seed?: number;
  generateAudio?: boolean;
}

export interface MotionGenerationRequest {
  modelId: string;
  imageUrl: string;
  videoUrl: string;
  prompt?: string;
  characterOrientation?: "video" | "image";
}

export interface LipsyncGenerationRequest {
  modelId: string;
  videoUrl: string;
  audioUrl: string;
}

export interface TtsGenerationRequest {
  modelId: string;
  text: string;
  voice?: string;
  speed?: number;
  referenceAudioUrl?: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  return {};
}

async function request<T>(path: string, opts?: RequestInit & { skipAuth?: boolean }): Promise<T> {
  const authHeaders = opts?.skipAuth ? {} : await getAuthHeaders();
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(opts?.headers as Record<string, string> | undefined),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || "Request failed");
  return data as T;
}

export const api = {
  listModels: () => request<{ models: ModelInfo[] }>("/models", { skipAuth: true }),

  generateImage: (body: ImageGenerationRequest) =>
    request<GenerationResponse>("/generate/image", { method: "POST", body: JSON.stringify(body) }),

  generateVideo: (body: VideoGenerationRequest) =>
    request<GenerationResponse>("/generate/video", { method: "POST", body: JSON.stringify(body) }),

  generateMotion: (body: MotionGenerationRequest) =>
    request<GenerationResponse>("/generate/motion", { method: "POST", body: JSON.stringify(body) }),

  generateLipsync: (body: LipsyncGenerationRequest) =>
    request<GenerationResponse>("/generate/lipsync", { method: "POST", body: JSON.stringify(body) }),

  generateTts: (body: TtsGenerationRequest) =>
    request<GenerationResponse>("/generate/tts", { method: "POST", body: JSON.stringify(body) }),

  getJobStatus: (jobId: string, requestId: string, modelId: string) =>
    request<JobStatusResponse>(
      `/jobs/${jobId}/status?requestId=${encodeURIComponent(requestId)}&modelId=${encodeURIComponent(modelId)}`,
      { skipAuth: true }
    ),

  uploadFile: async (file: File): Promise<{ url: string }> => {
    const authHeaders = await getAuthHeaders();
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${BASE}/upload`, {
      method: "POST",
      headers: authHeaders,
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Upload failed");
    return data as { url: string };
  },
};
