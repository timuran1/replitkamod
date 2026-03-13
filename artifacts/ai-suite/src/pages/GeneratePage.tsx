import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { api, ModelInfo, MediaOutput } from "@/lib/api";
import { saveToGallery } from "@/lib/gallery";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/FileUpload";

const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4"];

const CATEGORY_ICON: Record<string, string> = {
  image: "🖼️",
  video: "🎬",
  "motion-control": "🕺",
  lipsync: "👄",
  tts: "🎙️",
};

const MODEL_GROUP_ORDER = ["image", "video", "motion-control", "lipsync", "tts"];
const MODEL_GROUP_LABELS: Record<string, string> = {
  image: "Image Generation",
  video: "Video Generation",
  "motion-control": "Motion Transfer",
  lipsync: "Lip Sync",
  tts: "Text to Speech",
};

function AspectRatioButton({ ratio, selected, onClick }: { ratio: string; selected: boolean; onClick: () => void }) {
  const [w, h] = ratio.split(":").map(Number);
  const maxSize = 28;
  const scale = maxSize / Math.max(w, h);
  const width = Math.round(w * scale);
  const height = Math.round(h * scale);
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all ${
        selected ? "bg-primary/20 border border-primary text-primary" : "border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      <div className={`border-2 rounded-sm transition-all ${selected ? "border-primary" : "border-current"}`} style={{ width, height }} />
      <span className="text-xs font-medium">{ratio}</span>
    </button>
  );
}

function StatusDisplay({ status, queuePosition, logs, error }: { status: string; queuePosition?: number; logs?: string[]; error?: string }) {
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
        {(status === "queued" || status === "in_progress") && (
          <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
        )}
        <span className={`text-sm font-medium ${s.color}`}>{s.label}</span>
        {status === "queued" && queuePosition !== undefined && (
          <span className="text-xs text-muted-foreground">— position #{queuePosition + 1}</span>
        )}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {logs && logs.length > 0 && (
        <div className="text-xs text-muted-foreground font-mono space-y-0.5 max-h-20 overflow-y-auto">
          {logs.slice(-3).map((l, i) => <div key={i}>{l}</div>)}
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
          <img src={out.url} alt="Generated" className="w-full h-auto object-cover" />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <a href={out.url} download={`ai-image-${i + 1}.jpg`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-white text-xs font-medium">
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
      <video ref={videoRef} src={out.url} autoPlay loop muted={muted} playsInline className="w-full h-auto max-h-[60vh] object-contain" />
      <div className="absolute top-3 right-3 flex gap-2">
        <button onClick={() => setMuted((m) => !m)} className="bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-medium hover:bg-black/80 transition-colors">
          {muted ? "🔇 Unmute" : "🔊 Mute"}
        </button>
        <a href={out.url} download="ai-video.mp4" target="_blank" rel="noopener noreferrer" className="bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-medium hover:bg-black/80 transition-colors">
          ⬇️ Download
        </a>
      </div>
    </div>
  );
}

function AudioOutput({ outputs }: { outputs: MediaOutput[] }) {
  const out = outputs[0];
  if (!out) return null;
  return (
    <div className="rounded-xl overflow-hidden bg-card border border-border p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center text-2xl">🎵</div>
        <div>
          <p className="text-sm font-medium text-foreground">Audio Generated</p>
          <p className="text-xs text-muted-foreground">{out.contentType || "audio"}</p>
        </div>
      </div>
      <audio controls className="w-full" src={out.url} style={{ filter: "invert(0.9) hue-rotate(180deg)" }} />
      <a href={out.url} download="ai-audio.mp3" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
        ⬇️ Download Audio
      </a>
    </div>
  );
}

export default function GeneratePage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const [, navigate] = useLocation();

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModelId, setSelectedModelId] = useState(params.get("modelId") || "");

  // Shared
  const [prompt, setPrompt] = useState("");
  const [negPrompt, setNegPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState("5");
  const [numImages, setNumImages] = useState(1);
  const [showNeg, setShowNeg] = useState(false);

  // Motion control inputs
  const [characterImageUrl, setCharacterImageUrl] = useState("");
  const [referenceVideoUrl, setReferenceVideoUrl] = useState("");
  const [characterOrientation, setCharacterOrientation] = useState<"video" | "image">("video");

  // Lipsync inputs
  const [lipsyncVideoUrl, setLipsyncVideoUrl] = useState("");
  const [lipsyncAudioUrl, setLipsyncAudioUrl] = useState("");

  // TTS inputs
  const [ttsText, setTtsText] = useState("");
  const [referenceAudioUrl, setReferenceAudioUrl] = useState("");
  const [ttsVoice, setTtsVoice] = useState("default");

  // Image editing
  const [imageMode, setImageMode] = useState<"generate" | "edit">("generate");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [imageStrength, setImageStrength] = useState(0.75);

  const [isGenerating, setIsGenerating] = useState(false);
  const [jobStatus, setJobStatus] = useState<{
    jobId: string; requestId: string; modelId: string; status: string;
    queuePosition?: number; logs?: string[]; error?: string;
    outputs?: MediaOutput[]; mediaType: "image" | "video" | "audio";
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

  const modelsByCategory = MODEL_GROUP_ORDER.reduce<Record<string, ModelInfo[]>>((acc, cat) => {
    acc[cat] = models.filter((m) => m.category === cat);
    return acc;
  }, {});

  const availableRatios = selectedModel?.aspectRatios?.length ? selectedModel.aspectRatios : ASPECT_RATIOS;

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPolling = useCallback(
    (jobId: string, requestId: string, modelId: string, mediaType: "image" | "video" | "audio") => {
      pollRef.current = setInterval(async () => {
        try {
          const status = await api.getJobStatus(jobId, requestId, modelId);
          setJobStatus((prev) =>
            prev ? { ...prev, status: status.status, queuePosition: status.queuePosition, logs: status.logs, error: status.error, outputs: status.outputs } : null
          );
          if (status.status === "completed" || status.status === "failed") {
            stopPolling();
            setIsGenerating(false);
            if (status.status === "completed" && status.outputs?.length) {
              const model = models.find((m) => m.id === modelId);
              saveToGallery({ prompt: prompt || ttsText || "Generated", modelId, modelName: model?.name || modelId, mediaType, outputs: status.outputs, aspectRatio });
            }
          }
        } catch (err) { console.error("Poll error:", err); }
      }, 3000);
    },
    [prompt, ttsText, aspectRatio, models, stopPolling]
  );

  const handleJobResponse = (response: { jobId: string; requestId: string; status: string; mediaType: "image" | "video" | "audio"; outputs?: MediaOutput[] }, modelId: string) => {
    const mt = response.mediaType;
    setJobStatus({ jobId: response.jobId, requestId: response.requestId, modelId, status: response.status, mediaType: mt, outputs: response.outputs });
    if (response.status !== "completed" && response.status !== "failed" && response.jobId !== "direct") {
      startPolling(response.jobId, response.requestId, modelId, mt);
    } else {
      setIsGenerating(false);
      if (response.outputs?.length) {
        const model = models.find((m) => m.id === modelId);
        saveToGallery({ prompt: prompt || ttsText || "Generated", modelId, modelName: model?.name || modelId, mediaType: mt, outputs: response.outputs, aspectRatio });
      }
    }
  };

  const handleGenerate = async () => {
    if (!selectedModel) return;
    stopPolling();
    setIsGenerating(true);
    setJobStatus(null);

    try {
      const cat = selectedModel.category;

      if (cat === "image") {
        const hasRefImg = imageMode === "edit" && !!referenceImageUrl;
        const r = await api.generateImage({
          modelId: selectedModelId,
          prompt: prompt.trim(),
          negativePrompt: negPrompt || undefined,
          aspectRatio: availableRatios.includes(aspectRatio) ? aspectRatio : availableRatios[0],
          numImages,
          imageUrl: hasRefImg ? referenceImageUrl : undefined,
          imageStrength: hasRefImg ? imageStrength : undefined,
        });
        handleJobResponse(r as Parameters<typeof handleJobResponse>[0], selectedModelId);

      } else if (cat === "video") {
        const r = await api.generateVideo({ modelId: selectedModelId, prompt: prompt.trim(), negativePrompt: negPrompt || undefined, aspectRatio: availableRatios.includes(aspectRatio) ? aspectRatio : availableRatios[0], duration: selectedModel.supportsDuration ? duration : undefined });
        handleJobResponse(r as Parameters<typeof handleJobResponse>[0], selectedModelId);

      } else if (cat === "motion-control") {
        const r = await api.generateMotion({ modelId: selectedModelId, imageUrl: characterImageUrl, videoUrl: referenceVideoUrl, prompt: prompt || undefined, characterOrientation });
        handleJobResponse(r as Parameters<typeof handleJobResponse>[0], selectedModelId);

      } else if (cat === "lipsync") {
        const r = await api.generateLipsync({ modelId: selectedModelId, videoUrl: lipsyncVideoUrl, audioUrl: lipsyncAudioUrl });
        handleJobResponse(r as Parameters<typeof handleJobResponse>[0], selectedModelId);

      } else if (cat === "tts") {
        const r = await api.generateTts({ modelId: selectedModelId, text: ttsText.trim(), voice: ttsVoice !== "default" ? ttsVoice : undefined, referenceAudioUrl: referenceAudioUrl || undefined });
        handleJobResponse(r as Parameters<typeof handleJobResponse>[0], selectedModelId);
      }
    } catch (err) {
      setIsGenerating(false);
      setJobStatus({ jobId: "", requestId: "", modelId: selectedModelId, status: "failed", error: err instanceof Error ? err.message : "Generation failed", mediaType: "image" });
    }
  };

  const canGenerate = (() => {
    if (!selectedModel || isGenerating) return false;
    const cat = selectedModel.category;
    if (cat === "image") {
      if (!prompt.trim()) return false;
      if (imageMode === "edit" && !referenceImageUrl) return false;
      return true;
    }
    if (cat === "video") return !!prompt.trim();
    if (cat === "motion-control") return !!characterImageUrl && !!referenceVideoUrl;
    if (cat === "lipsync") return !!lipsyncVideoUrl && !!lipsyncAudioUrl;
    if (cat === "tts") return !!ttsText.trim();
    return false;
  })();

  const getButtonLabel = () => {
    if (isGenerating) return null;
    if (!selectedModel) return "Select a Model";
    const map: Record<string, string> = { image: "Generate Image ✨", video: "Generate Video ✨", "motion-control": "Transfer Motion 🕺", lipsync: "Sync Lips 👄", tts: "Generate Voice 🎙️" };
    return map[selectedModel.category] || "Generate ✨";
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
              {MODEL_GROUP_ORDER.filter((cat) => modelsByCategory[cat]?.length > 0).map((cat) => (
                <div key={cat}>
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1.5">
                    <span>{CATEGORY_ICON[cat]}</span>
                    <span>{MODEL_GROUP_LABELS[cat]}</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {modelsByCategory[cat].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setSelectedModelId(m.id); setAspectRatio((m.aspectRatios?.[0]) || "16:9"); }}
                        className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                          selectedModelId === m.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        }`}
                      >
                        <div className="font-medium leading-tight">{m.name}</div>
                        <div className="text-xs opacity-70">{m.provider}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* ─── Image: Mode toggle + upload ─── */}
            {selectedModel?.category === "image" && selectedModel.supportsImageInput && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                {/* Mode tabs */}
                <div className="flex gap-2">
                  {[
                    { mode: "generate" as const, icon: "✨", label: "Создать" },
                    { mode: "edit" as const, icon: "✏️", label: "Редактировать фото" },
                  ].map(({ mode, icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => { setImageMode(mode); if (mode === "generate") setReferenceImageUrl(""); }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                      style={
                        imageMode === mode
                          ? { background: "var(--k-accent)", color: "#111118" }
                          : { background: "transparent", color: "var(--k-muted)", border: "1px solid var(--k-border)" }
                      }
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {imageMode === "generate" && (
                  <p className="text-xs" style={{ color: "var(--k-muted)" }}>
                    Введите промпт ниже — ИИ создаст изображение с нуля.
                  </p>
                )}

                {imageMode === "edit" && (
                  <div className="space-y-4">
                    <p className="text-xs" style={{ color: "var(--k-muted)" }}>
                      Загрузите исходное изображение — ИИ внесёт изменения на основе вашего промпта.
                    </p>

                    <FileUpload
                      label="Исходное изображение"
                      accept="image/*"
                      hint="JPG, PNG, WebP · до 20 МБ"
                      icon="🖼️"
                      value={referenceImageUrl}
                      onChange={setReferenceImageUrl}
                      maxSizeMB={20}
                    />

                    {referenceImageUrl && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium" style={{ color: "var(--k-muted)" }}>
                            Сила изменений
                          </p>
                          <span className="text-xs font-semibold" style={{ color: "var(--k-accent)" }}>
                            {imageStrength < 0.35 ? "Слабые" : imageStrength < 0.65 ? "Средние" : "Сильные"} · {Math.round(imageStrength * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={0.95}
                          step={0.05}
                          value={imageStrength}
                          onChange={(e) => setImageStrength(parseFloat(e.target.value))}
                          className="w-full accent-[var(--k-accent)]"
                          style={{ accentColor: "var(--k-accent)" }}
                        />
                        <div className="flex justify-between text-xs" style={{ color: "var(--k-muted)" }}>
                          <span>Близко к оригиналу</span>
                          <span>Полная переработка</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ─── Image / Video: Prompt ─── */}
            {selectedModel && (selectedModel.category === "image" || selectedModel.category === "video") && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <h2 className="text-sm font-semibold">
                  {selectedModel.category === "image" && imageMode === "edit" ? "Описание изменений" : "Промпт"}
                </h2>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    selectedModel.category === "image" && imageMode === "edit"
                      ? "Опишите, что нужно изменить: «Сделай фон заснеженным, добавь тёплое освещение...»"
                      : selectedModel.category === "image"
                      ? "Describe the image you want to create..."
                      : "Describe the video scene, motion, and style..."
                  }
                  className="min-h-28 bg-muted/50 border-border resize-none text-sm"
                />
                <button onClick={() => setShowNeg((v) => !v)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
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
            )}

            {/* ─── Image / Video: Settings ─── */}
            {selectedModel && (selectedModel.category === "image" || selectedModel.category === "video") && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <h2 className="text-sm font-semibold">Settings</h2>
                {availableRatios.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Aspect Ratio</p>
                    <div className="flex gap-2 flex-wrap">
                      {availableRatios.map((r) => (
                        <AspectRatioButton key={r} ratio={r} selected={aspectRatio === r} onClick={() => setAspectRatio(r)} />
                      ))}
                    </div>
                  </div>
                )}
                {selectedModel.category === "video" && selectedModel.supportsDuration && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Duration</p>
                    <div className="flex gap-2">
                      {["5", "10"].filter((d) => !selectedModel.maxDuration || parseInt(d) <= selectedModel.maxDuration).map((d) => (
                        <button key={d} onClick={() => setDuration(d)} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${duration === d ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                          {d}s
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {selectedModel.category === "image" && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Number of Images</p>
                    <div className="flex gap-2">
                      {[1, 2, 4].map((n) => (
                        <button key={n} onClick={() => setNumImages(n)} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${numImages === n ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── Motion Control ─── */}
            {selectedModel?.category === "motion-control" && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
                <div>
                  <h2 className="text-sm font-semibold mb-1">Motion Transfer</h2>
                  <p className="text-xs text-muted-foreground">Upload a character image and a reference video with the motion you want to copy.</p>
                </div>

                <FileUpload
                  label="Character Image"
                  accept="image/*"
                  hint="The subject whose appearance will be used"
                  icon="🧑"
                  value={characterImageUrl}
                  onChange={setCharacterImageUrl}
                />

                <FileUpload
                  label="Reference Motion Video"
                  accept="video/*"
                  hint="The motion from this video will be transferred to the character"
                  icon="🎬"
                  value={referenceVideoUrl}
                  onChange={setReferenceVideoUrl}
                  maxSizeMB={100}
                />

                <div>
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Character Orientation Source</p>
                  <div className="flex gap-2">
                    {[
                      { val: "video" as const, label: "Follow Video", hint: "Use orientation from reference video" },
                      { val: "image" as const, label: "Follow Image", hint: "Use orientation from character image" },
                    ].map(({ val, label, hint }) => (
                      <button
                        key={val}
                        onClick={() => setCharacterOrientation(val)}
                        className={`flex-1 text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${characterOrientation === val ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
                      >
                        <div className="font-medium">{label}</div>
                        <div className="text-xs opacity-70">{hint}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Optional Prompt</p>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Optional: describe additional style or scene details..."
                    className="min-h-16 bg-muted/50 border-border resize-none text-sm"
                  />
                </div>
              </div>
            )}

            {/* ─── Lip Sync ─── */}
            {selectedModel?.category === "lipsync" && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
                <div>
                  <h2 className="text-sm font-semibold mb-1">Lip Sync</h2>
                  <p className="text-xs text-muted-foreground">Upload the face video and the audio you want to sync to the lips.</p>
                </div>

                <FileUpload
                  label="Face Video"
                  accept="video/*"
                  hint="Video showing the person's face clearly"
                  icon="🎥"
                  value={lipsyncVideoUrl}
                  onChange={setLipsyncVideoUrl}
                  maxSizeMB={100}
                />

                <FileUpload
                  label="Audio to Sync"
                  accept="audio/*"
                  hint="The audio that will be synced to the lips"
                  icon="🎵"
                  value={lipsyncAudioUrl}
                  onChange={setLipsyncAudioUrl}
                  maxSizeMB={50}
                />
              </div>
            )}

            {/* ─── TTS ─── */}
            {selectedModel?.category === "tts" && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
                <div>
                  <h2 className="text-sm font-semibold mb-1">Text to Speech</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedModel.id === "fal-ai/f5-tts"
                      ? "F5-TTS supports voice cloning — upload a reference audio clip to replicate any voice."
                      : "Convert your text into natural-sounding speech."}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Text to Speak</p>
                  <Textarea
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    placeholder="Enter the text you want to convert to speech..."
                    className="min-h-32 bg-muted/50 border-border resize-none text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{ttsText.length} characters</p>
                </div>

                {selectedModel.id === "fal-ai/f5-tts" && (
                  <FileUpload
                    label="Reference Voice Audio (Optional)"
                    accept="audio/*"
                    hint="Upload 5-15 seconds of clear speech to clone the voice"
                    icon="🎙️"
                    value={referenceAudioUrl}
                    onChange={setReferenceAudioUrl}
                    maxSizeMB={20}
                  />
                )}
              </div>
            )}

            {/* Generate button */}
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 disabled:opacity-50 glow-primary transition-all"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </span>
              ) : getButtonLabel()}
            </Button>
          </div>

          {/* Right: Output */}
          <div className="space-y-4">
            {/* Model info */}
            {selectedModel && (
              <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
                <span className="text-2xl">{CATEGORY_ICON[selectedModel.category] || "✨"}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{selectedModel.name}</div>
                  <div className="text-xs text-muted-foreground">{selectedModel.provider}</div>
                </div>
                <Badge variant="outline" className="text-xs border-border shrink-0">
                  {MODEL_GROUP_LABELS[selectedModel.category] || selectedModel.category}
                </Badge>
              </div>
            )}

            {/* Output area */}
            {!jobStatus ? (
              <div className="bg-card border border-border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-48">
                <div className="text-4xl mb-3 opacity-30">{selectedModel ? CATEGORY_ICON[selectedModel.category] : "✨"}</div>
                <p className="text-muted-foreground text-sm">Your generation will appear here</p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  {selectedModel?.category === "motion-control" ? "Upload files and click Transfer Motion" :
                   selectedModel?.category === "lipsync" ? "Upload video and audio, then click Sync Lips" :
                   selectedModel?.category === "tts" ? "Enter text and click Generate Voice" :
                   "Enter a prompt and click Generate"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <StatusDisplay status={jobStatus.status} queuePosition={jobStatus.queuePosition} logs={jobStatus.logs} error={jobStatus.error} />
                {jobStatus.status === "completed" && jobStatus.outputs && jobStatus.outputs.length > 0 && (
                  <div>
                    {jobStatus.mediaType === "image" && <ImageOutput outputs={jobStatus.outputs} />}
                    {jobStatus.mediaType === "video" && <VideoOutput outputs={jobStatus.outputs} />}
                    {jobStatus.mediaType === "audio" && <AudioOutput outputs={jobStatus.outputs} />}
                    <p className="text-xs text-muted-foreground text-center mt-2">Saved to gallery ✓</p>
                  </div>
                )}
              </div>
            )}

            {/* Tips */}
            {!isGenerating && !jobStatus && selectedModel && (
              <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tips for {selectedModel.name}</p>
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  {selectedModel.category === "image" && imageMode === "generate" && (
                    <>
                      <li>• Опишите освещение, стиль, настроение</li>
                      <li>• Добавьте «фотореалистично» или «кинематографично» для качества</li>
                      <li>• Используйте негативный промпт чтобы исключить лишнее</li>
                    </>
                  )}
                  {selectedModel.category === "image" && imageMode === "edit" && (
                    <>
                      <li>• Опишите конкретно, что нужно изменить</li>
                      <li>• Сила 30-50% — мягкие правки с сохранением стиля</li>
                      <li>• Сила 70-95% — кардинальная переработка изображения</li>
                    </>
                  )}
                  {selectedModel.category === "video" && (
                    <>
                      <li>• Describe the camera motion (slow pan, zoom in, etc.)</li>
                      <li>• Include subject, action, and environment</li>
                      <li>• Video generation may take 1-3 minutes</li>
                    </>
                  )}
                  {selectedModel.category === "motion-control" && (
                    <>
                      <li>• Use a clear front-facing photo for best results</li>
                      <li>• Reference video should have clear, visible motion</li>
                      <li>• Shorter reference videos (5-15s) work best</li>
                    </>
                  )}
                  {selectedModel.category === "lipsync" && (
                    <>
                      <li>• Face should be clearly visible and well-lit</li>
                      <li>• Audio should be clean with minimal background noise</li>
                      <li>• Works with any language</li>
                    </>
                  )}
                  {selectedModel.category === "tts" && (
                    <>
                      <li>• F5-TTS: Upload a 5-15s voice clip for voice cloning</li>
                      <li>• Keep text under 500 characters for best quality</li>
                      <li>• Punctuation improves pacing and naturalness</li>
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
