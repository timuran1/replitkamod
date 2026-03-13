import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { api, ModelInfo, MediaOutput } from "@/lib/api";
import { saveToGallery } from "@/lib/gallery";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4"];
const ASPECT_RATIO_SHAPES: Record<string, string> = {
  "16:9": "w-8 h-4.5",
  "9:16": "w-4.5 h-8",
  "1:1": "w-6 h-6",
  "4:3": "w-8 h-6",
  "3:4": "w-6 h-8",
};

function AspectRatioButton({
  ratio,
  selected,
  onClick,
}: {
  ratio: string;
  selected: boolean;
  onClick: () => void;
}) {
  const [w, h] = ratio.split(":").map(Number);
  const maxSize = 28;
  const scale = maxSize / Math.max(w, h);
  const width = Math.round(w * scale);
  const height = Math.round(h * scale);

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all ${
        selected
          ? "bg-primary/20 border border-primary text-primary"
          : "border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      <div
        className={`border-2 rounded-sm transition-all ${selected ? "border-primary" : "border-current"}`}
        style={{ width, height }}
      />
      <span className="text-xs font-medium">{ratio}</span>
    </button>
  );
}

function StatusDisplay({
  status,
  queuePosition,
  logs,
  error,
}: {
  status: string;
  queuePosition?: number;
  logs?: string[];
  error?: string;
}) {
  const statusMap: Record<string, { label: string; color: string }> = {
    queued: { label: "In Queue", color: "text-yellow-400" },
    in_progress: { label: "Generating...", color: "text-blue-400" },
    completed: { label: "Complete", color: "text-green-400" },
    failed: { label: "Failed", color: "text-red-400" },
  };
  const s = statusMap[status] || { label: status, color: "text-muted-foreground" };

  return (
    <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        {status === "queued" || status === "in_progress" ? (
          <div className="w-3 h-3 rounded-full bg-current animate-pulse" style={{ color: s.color.replace("text-", "") }} />
        ) : null}
        <span className={`text-sm font-medium ${s.color}`}>{s.label}</span>
        {status === "queued" && queuePosition !== undefined && (
          <span className="text-xs text-muted-foreground">— position #{queuePosition + 1}</span>
        )}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {logs && logs.length > 0 && (
        <div className="text-xs text-muted-foreground font-mono space-y-0.5 max-h-20 overflow-y-auto">
          {logs.slice(-3).map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function ImageOutput({ outputs }: { outputs: MediaOutput[] }) {
  return (
    <div className={`grid gap-3 ${outputs.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
      {outputs.map((out, i) => (
        <div key={i} className="relative group rounded-xl overflow-hidden bg-muted border border-border">
          <img
            src={out.url}
            alt="Generated"
            className="w-full h-auto object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <a
              href={out.url}
              download={`ai-image-${i + 1}.jpg`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-white text-xs font-medium"
            >
              ⬇️ Download
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

function VideoOutput({ outputs }: { outputs: MediaOutput[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const out = outputs[0];
  if (!out) return null;

  return (
    <div className="relative group rounded-xl overflow-hidden bg-black border border-border">
      <video
        ref={videoRef}
        src={out.url}
        autoPlay
        loop
        muted={muted}
        playsInline
        className="w-full h-auto max-h-[60vh] object-contain"
      />
      <div className="absolute top-3 right-3 flex gap-2">
        <button
          onClick={() => setMuted((m) => !m)}
          className="bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-medium hover:bg-black/80 transition-colors"
        >
          {muted ? "🔇 Unmute" : "🔊 Mute"}
        </button>
        <a
          href={out.url}
          download="ai-video.mp4"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-medium hover:bg-black/80 transition-colors"
        >
          ⬇️ Download
        </a>
      </div>
    </div>
  );
}

export default function GeneratePage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const [, navigate] = useLocation();

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModelId, setSelectedModelId] = useState(params.get("modelId") || "");
  const [prompt, setPrompt] = useState("");
  const [negPrompt, setNegPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState("5");
  const [numImages, setNumImages] = useState(1);
  const [showNeg, setShowNeg] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobStatus, setJobStatus] = useState<{
    jobId: string;
    requestId: string;
    modelId: string;
    status: string;
    queuePosition?: number;
    logs?: string[];
    error?: string;
    outputs?: MediaOutput[];
    mediaType: "image" | "video";
  } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.listModels().then((r) => {
      setModels(r.models);
      if (!selectedModelId && r.models.length > 0) {
        setSelectedModelId(r.models[0].id);
      }
    });
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const selectedModel = models.find((m) => m.id === selectedModelId);
  const isImageModel = selectedModel?.type === "text-to-image";
  const imageModels = models.filter((m) => m.type === "text-to-image");
  const videoModels = models.filter((m) => m.type !== "text-to-image");

  const availableRatios = selectedModel?.aspectRatios || ASPECT_RATIOS;

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (jobId: string, requestId: string, modelId: string, mediaType: "image" | "video") => {
      pollRef.current = setInterval(async () => {
        try {
          const status = await api.getJobStatus(jobId, requestId, modelId);
          setJobStatus((prev) =>
            prev
              ? {
                  ...prev,
                  status: status.status,
                  queuePosition: status.queuePosition,
                  logs: status.logs,
                  error: status.error,
                  outputs: status.outputs,
                }
              : null
          );

          if (status.status === "completed" || status.status === "failed") {
            stopPolling();
            setIsGenerating(false);

            if (status.status === "completed" && status.outputs && status.outputs.length > 0) {
              const model = models.find((m) => m.id === modelId);
              saveToGallery({
                prompt,
                modelId,
                modelName: model?.name || modelId,
                mediaType,
                outputs: status.outputs,
                aspectRatio,
              });
            }
          }
        } catch (err) {
          console.error("Poll error:", err);
        }
      }, 3000);
    },
    [prompt, aspectRatio, models, stopPolling]
  );

  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedModel) return;
    stopPolling();
    setIsGenerating(true);
    setJobStatus(null);

    try {
      let response;
      if (isImageModel) {
        response = await api.generateImage({
          modelId: selectedModelId,
          prompt: prompt.trim(),
          negativePrompt: negPrompt || undefined,
          aspectRatio: availableRatios.includes(aspectRatio) ? aspectRatio : availableRatios[0],
          numImages,
        });
      } else {
        response = await api.generateVideo({
          modelId: selectedModelId,
          prompt: prompt.trim(),
          negativePrompt: negPrompt || undefined,
          aspectRatio: availableRatios.includes(aspectRatio) ? aspectRatio : availableRatios[0],
          duration: selectedModel.supportsDuration ? duration : undefined,
        });
      }

      const mediaType = response.mediaType || (isImageModel ? "image" : "video");
      setJobStatus({
        jobId: response.jobId,
        requestId: response.requestId,
        modelId: selectedModelId,
        status: response.status,
        mediaType,
        outputs: response.outputs,
      });

      if (response.status !== "completed" && response.status !== "failed") {
        startPolling(response.jobId, response.requestId, selectedModelId, mediaType);
      } else {
        setIsGenerating(false);
        if (response.outputs && response.outputs.length > 0) {
          const model = models.find((m) => m.id === selectedModelId);
          saveToGallery({
            prompt,
            modelId: selectedModelId,
            modelName: model?.name || selectedModelId,
            mediaType,
            outputs: response.outputs,
            aspectRatio,
          });
        }
      }
    } catch (err) {
      setIsGenerating(false);
      const msg = err instanceof Error ? err.message : "Generation failed";
      setJobStatus({
        jobId: "",
        requestId: "",
        modelId: selectedModelId,
        status: "failed",
        error: msg,
        mediaType: isImageModel ? "image" : "video",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors text-sm">
            ← Back
          </button>
          <h1 className="text-xl font-bold">Generate</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          {/* Left: Controls */}
          <div className="space-y-5">
            {/* Model selector */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Select Model</h2>

              {/* Image models */}
              {imageModels.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Image Models</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {imageModels.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setSelectedModelId(m.id); setAspectRatio(m.aspectRatios[0] || "1:1"); }}
                        className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                          selectedModelId === m.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        }`}
                      >
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs opacity-70">{m.provider}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Video models */}
              {videoModels.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Video Models</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {videoModels.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setSelectedModelId(m.id); setAspectRatio(m.aspectRatios[0] || "16:9"); }}
                        className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                          selectedModelId === m.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        }`}
                      >
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs opacity-70">{m.provider} · {m.type === "image-to-video" ? "Img→Video" : "Text→Video"}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Prompt */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-semibold">Prompt</h2>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={isImageModel
                  ? "Describe the image you want to create..."
                  : "Describe the video scene, motion, and style..."}
                className="min-h-28 bg-muted/50 border-border resize-none text-sm"
              />

              <button
                onClick={() => setShowNeg((v) => !v)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNeg ? "▼" : "▶"} Negative prompt
              </button>

              {showNeg && (
                <Textarea
                  value={negPrompt}
                  onChange={(e) => setNegPrompt(e.target.value)}
                  placeholder="What to avoid: blur, watermark, distorted faces..."
                  className="min-h-16 bg-muted/50 border-border resize-none text-sm"
                />
              )}
            </div>

            {/* Settings */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-semibold">Settings</h2>

              {/* Aspect ratio */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Aspect Ratio</p>
                <div className="flex gap-2 flex-wrap">
                  {availableRatios.map((r) => (
                    <AspectRatioButton
                      key={r}
                      ratio={r}
                      selected={aspectRatio === r}
                      onClick={() => setAspectRatio(r)}
                    />
                  ))}
                </div>
              </div>

              {/* Duration (video only) */}
              {!isImageModel && selectedModel?.supportsDuration && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Duration</p>
                  <div className="flex gap-2">
                    {["5", "10"].filter((d) => !selectedModel.maxDuration || parseInt(d) <= selectedModel.maxDuration).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDuration(d)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                          duration === d
                            ? "bg-primary/20 border-primary text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {d}s
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Num images (image only) */}
              {isImageModel && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Number of Images</p>
                  <div className="flex gap-2">
                    {[1, 2, 4].map((n) => (
                      <button
                        key={n}
                        onClick={() => setNumImages(n)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                          numImages === n
                            ? "bg-primary/20 border-primary text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Generate button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || !selectedModel}
              className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 disabled:opacity-50 glow-primary transition-all"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </span>
              ) : (
                `Generate ${isImageModel ? "Image" : "Video"} ✨`
              )}
            </Button>
          </div>

          {/* Right: Output */}
          <div className="space-y-4">
            {/* Model info badge */}
            {selectedModel && (
              <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
                <span className="text-2xl">{selectedModel.type === "text-to-image" ? "🖼️" : "🎬"}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{selectedModel.name}</div>
                  <div className="text-xs text-muted-foreground">{selectedModel.provider}</div>
                </div>
                <Badge variant="outline" className="text-xs border-border shrink-0">
                  {selectedModel.type === "text-to-image" ? "Image" : "Video"}
                </Badge>
              </div>
            )}

            {/* Output area */}
            {!jobStatus ? (
              <div className="bg-card border border-border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-48">
                <div className="text-4xl mb-3 opacity-30">✨</div>
                <p className="text-muted-foreground text-sm">Your generation will appear here</p>
                <p className="text-muted-foreground/60 text-xs mt-1">Enter a prompt and click Generate</p>
              </div>
            ) : (
              <div className="space-y-4">
                <StatusDisplay
                  status={jobStatus.status}
                  queuePosition={jobStatus.queuePosition}
                  logs={jobStatus.logs}
                  error={jobStatus.error}
                />

                {jobStatus.status === "completed" && jobStatus.outputs && jobStatus.outputs.length > 0 && (
                  <div>
                    {jobStatus.mediaType === "image" ? (
                      <ImageOutput outputs={jobStatus.outputs} />
                    ) : (
                      <VideoOutput outputs={jobStatus.outputs} />
                    )}
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Saved to gallery ✓
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tips */}
            {!isGenerating && !jobStatus && selectedModel && (
              <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tips for {selectedModel.name}</p>
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  {selectedModel.type === "text-to-image" && (
                    <>
                      <li>• Be specific about lighting, style, and mood</li>
                      <li>• Add "photorealistic" or "cinematic" for better quality</li>
                      <li>• Use negative prompt to exclude unwanted elements</li>
                    </>
                  )}
                  {selectedModel.type !== "text-to-image" && (
                    <>
                      <li>• Describe the camera motion (slow pan, zoom in, etc.)</li>
                      <li>• Include subject, action, and environment</li>
                      <li>• Video generation may take 1-3 minutes</li>
                    </>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
