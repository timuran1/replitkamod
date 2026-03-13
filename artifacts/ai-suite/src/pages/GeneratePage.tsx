import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { api, type ModelInfo, type MediaOutput, type ReferenceImageInput } from "@/lib/api";
import { saveToGallery } from "@/lib/gallery";
import { FileUpload } from "@/components/FileUpload";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReferenceImage = ReferenceImageInput & { url: string; description: string };

interface JobState {
  jobId: string; requestId: string; modelId: string;
  status: string; queuePosition?: number; logs?: string[];
  error?: string; outputs?: MediaOutput[];
  mediaType: "image" | "video" | "audio";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATS = [
  { id: "image",          label: "Изображения", icon: "🖼️" },
  { id: "video",          label: "Видео",        icon: "🎬" },
  { id: "motion-control", label: "Движение",     icon: "🕺" },
  { id: "lipsync",        label: "Lip Sync",     icon: "👄" },
  { id: "tts",            label: "Голос",        icon: "🎙️" },
];

const RATIOS_LABELS: Record<string, string> = {
  "1:1": "Квадрат", "16:9": "Широкий", "9:16": "Верт.", "4:3": "Класс.", "3:4": "Портрет", "21:9": "Ultra"
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function RatioPill({ ratio, active, onClick }: { ratio: string; active: boolean; onClick: () => void }) {
  const [w, h] = ratio.split(":").map(Number);
  const s = 22 / Math.max(w, h);
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all text-xs font-medium"
      style={active
        ? { background: "rgba(200,169,110,0.15)", border: "1px solid #C8A96E", color: "#C8A96E" }
        : { background: "transparent", border: "1px solid var(--k-border)", color: "var(--k-muted)" }}
    >
      <div
        className="border rounded-sm"
        style={{ width: Math.round(w * s), height: Math.round(h * s), borderColor: active ? "#C8A96E" : "currentColor", opacity: 0.8 }}
      />
      {RATIOS_LABELS[ratio] ?? ratio}
    </button>
  );
}

function Spinner({ size = 20, color = "var(--k-accent)" }: { size?: number; color?: string }) {
  return (
    <div
      className="rounded-full border-2 animate-spin"
      style={{ width: size, height: size, borderColor: color, borderTopColor: "transparent" }}
    />
  );
}

// ─── Output components ────────────────────────────────────────────────────────

function ImageOutput({ outputs }: { outputs: MediaOutput[] }) {
  return (
    <div className={`grid gap-3 ${outputs.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
      {outputs.map((out, i) => (
        <div key={i} className="relative group rounded-2xl overflow-hidden" style={{ border: "0.5px solid var(--k-border)" }}>
          <img src={out.url} alt="Generated" className="w-full h-auto object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
            <a
              href={out.url} download={`kamod-image-${i + 1}.jpg`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(200,169,110,0.9)" }}
            >
              ⬇ Скачать
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

function VideoOutput({ outputs }: { outputs: MediaOutput[] }) {
  const [muted, setMuted] = useState(true);
  const out = outputs[0];
  if (!out) return null;
  return (
    <div className="relative group rounded-2xl overflow-hidden bg-black" style={{ border: "0.5px solid var(--k-border)" }}>
      <video src={out.url} autoPlay loop muted={muted} playsInline className="w-full h-auto max-h-[65vh] object-contain" />
      <div className="absolute top-3 right-3 flex gap-2">
        <button
          onClick={() => setMuted((m) => !m)}
          className="text-white text-xs px-3 py-1.5 rounded-full font-medium backdrop-blur-sm"
          style={{ background: "rgba(0,0,0,0.6)" }}
        >{muted ? "🔇 Звук" : "🔊 Тихо"}</button>
        <a
          href={out.url} download="kamod-video.mp4" target="_blank" rel="noopener noreferrer"
          className="text-white text-xs px-3 py-1.5 rounded-full font-medium backdrop-blur-sm"
          style={{ background: "rgba(200,169,110,0.85)" }}
        >⬇ Скачать</a>
      </div>
    </div>
  );
}

function AudioOutput({ outputs }: { outputs: MediaOutput[] }) {
  const out = outputs[0];
  if (!out) return null;
  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--k-surface)", border: "0.5px solid var(--k-border)" }}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ background: "rgba(63,214,143,0.15)" }}>🎵</div>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--k-text)" }}>Аудио готово</p>
          <p className="text-xs" style={{ color: "var(--k-muted)" }}>{out.contentType ?? "audio"}</p>
        </div>
      </div>
      <audio controls className="w-full" src={out.url} />
      <a href={out.url} download="kamod-audio.mp3" target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 text-sm font-medium" style={{ color: "var(--k-accent)" }}>
        ⬇ Скачать аудио
      </a>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GeneratePage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModelId, setSelectedModelId] = useState(params.get("modelId") || "");
  const [activeCat, setActiveCat] = useState<string>("image");

  // Prompt
  const [prompt, setPrompt] = useState("");
  const [negPrompt, setNegPrompt] = useState("");
  const [showNeg, setShowNeg] = useState(false);
  const [promptFocused, setPromptFocused] = useState(false);

  // Settings
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState(5);
  const [numImages, setNumImages] = useState(1);

  // Image editing (single reference)
  const [editMode, setEditMode] = useState(false);
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editStrength, setEditStrength] = useState(0.75);

  // Nano Banana reference images (up to 14)
  const [refImages, setRefImages] = useState<ReferenceImage[]>([]);

  // Video start/end frames
  const [startFrameUrl, setStartFrameUrl] = useState("");
  const [endFrameUrl, setEndFrameUrl] = useState("");

  // Motion control
  const [motionCharUrl, setMotionCharUrl] = useState("");
  const [motionRefVideoUrl, setMotionRefVideoUrl] = useState("");
  const [motionOrientation, setMotionOrientation] = useState<"video" | "image">("video");

  // Lipsync
  const [lipsyncVideoUrl, setLipsyncVideoUrl] = useState("");
  const [lipsyncAudioUrl, setLipsyncAudioUrl] = useState("");

  // TTS
  const [ttsText, setTtsText] = useState("");
  const [ttsRefAudioUrl, setTtsRefAudioUrl] = useState("");

  // Job
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobState, setJobState] = useState<JobState | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.listModels().then((r) => {
      setModels(r.models);
      const initial = params.get("modelId");
      if (initial) {
        const m = r.models.find((m) => m.id === initial);
        if (m) { setSelectedModelId(m.id); setActiveCat(m.category); return; }
      }
      const first = r.models.find((m) => m.category === "image");
      if (first) { setSelectedModelId(first.id); setActiveCat("image"); }
    });
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const selectedModel = models.find((m) => m.id === selectedModelId);
  const catModels = models.filter((m) => m.category === activeCat);

  // auto-select first model when switching category
  const switchCat = (cat: string) => {
    setActiveCat(cat);
    const first = models.find((m) => m.category === cat);
    if (first && first.category !== selectedModel?.category) {
      setSelectedModelId(first.id);
      setAspectRatio(first.aspectRatios?.[0] ?? "16:9");
    }
  };

  const selectModel = (m: ModelInfo) => {
    setSelectedModelId(m.id);
    setAspectRatio(m.aspectRatios?.[0] ?? "16:9");
    setEditMode(false);
    setRefImages([]);
    setStartFrameUrl("");
    setEndFrameUrl("");
  };

  // ── Polling ──────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPolling = useCallback((jobId: string, requestId: string, modelId: string, mediaType: "image" | "video" | "audio") => {
    pollRef.current = setInterval(async () => {
      try {
        const s = await api.getJobStatus(jobId, requestId, modelId);
        setJobState((prev) => prev ? { ...prev, status: s.status, queuePosition: s.queuePosition, logs: s.logs, error: s.error, outputs: s.outputs } : null);
        if (s.status === "completed" || s.status === "failed") {
          stopPolling();
          setIsGenerating(false);
          if (s.status === "completed" && s.outputs?.length) {
            const model = models.find((m) => m.id === modelId);
            saveToGallery({ prompt: prompt || ttsText || "Generated", modelId, modelName: model?.name ?? modelId, mediaType, outputs: s.outputs, aspectRatio });
          }
        }
      } catch (err) { console.error("Poll error:", err); }
    }, 3000);
  }, [prompt, ttsText, aspectRatio, models, stopPolling]);

  const handleResponse = (r: { jobId: string; requestId: string; status: string; mediaType: "image" | "video" | "audio"; outputs?: MediaOutput[] }, modelId: string) => {
    const mt = r.mediaType;
    setJobState({ jobId: r.jobId, requestId: r.requestId, modelId, status: r.status, mediaType: mt, outputs: r.outputs });
    if (r.status !== "completed" && r.status !== "failed" && r.jobId !== "direct") {
      startPolling(r.jobId, r.requestId, modelId, mt);
    } else {
      setIsGenerating(false);
      if (r.outputs?.length) {
        const model = models.find((m) => m.id === modelId);
        saveToGallery({ prompt: prompt || ttsText || "Generated", modelId, modelName: model?.name ?? modelId, mediaType: mt, outputs: r.outputs, aspectRatio });
      }
    }
  };

  // ── Generate ──────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!selectedModel) return;
    stopPolling();
    setIsGenerating(true);
    setJobState(null);

    try {
      const cat = selectedModel.category;
      const ratio = selectedModel.aspectRatios?.includes(aspectRatio) ? aspectRatio : (selectedModel.aspectRatios?.[0] ?? "16:9");

      if (cat === "image") {
        const isNanoBanana = selectedModel.id.includes("nano-banana");
        const r = await api.generateImage({
          modelId: selectedModelId,
          prompt: prompt.trim(),
          negativePrompt: negPrompt || undefined,
          aspectRatio: ratio,
          numImages,
          imageUrl: editMode && editImageUrl ? editImageUrl : undefined,
          imageStrength: editMode && editImageUrl ? editStrength : undefined,
          referenceImages: isNanoBanana && refImages.length > 0 ? refImages : undefined,
        });
        handleResponse(r as Parameters<typeof handleResponse>[0], selectedModelId);

      } else if (cat === "video") {
        const r = await api.generateVideo({
          modelId: selectedModelId,
          prompt: prompt.trim(),
          negativePrompt: negPrompt || undefined,
          aspectRatio: ratio,
          duration: selectedModel.supportsDuration ? String(duration) : undefined,
          imageUrl: startFrameUrl || undefined,
          endImageUrl: endFrameUrl || undefined,
        });
        handleResponse(r as Parameters<typeof handleResponse>[0], selectedModelId);

      } else if (cat === "motion-control") {
        const r = await api.generateMotion({ modelId: selectedModelId, imageUrl: motionCharUrl, videoUrl: motionRefVideoUrl, prompt: prompt || undefined, characterOrientation: motionOrientation });
        handleResponse(r as Parameters<typeof handleResponse>[0], selectedModelId);

      } else if (cat === "lipsync") {
        const r = await api.generateLipsync({ modelId: selectedModelId, videoUrl: lipsyncVideoUrl, audioUrl: lipsyncAudioUrl });
        handleResponse(r as Parameters<typeof handleResponse>[0], selectedModelId);

      } else if (cat === "tts") {
        const r = await api.generateTts({ modelId: selectedModelId, text: ttsText.trim(), referenceAudioUrl: ttsRefAudioUrl || undefined });
        handleResponse(r as Parameters<typeof handleResponse>[0], selectedModelId);
      }
    } catch (err) {
      setIsGenerating(false);
      setJobState({ jobId: "", requestId: "", modelId: selectedModelId, status: "failed", error: err instanceof Error ? err.message : "Generation failed", mediaType: "image" });
    }
  };

  const canGenerate = (() => {
    if (!selectedModel || isGenerating) return false;
    const cat = selectedModel.category;
    if (cat === "image") {
      if (!prompt.trim()) return false;
      if (editMode && !editImageUrl) return false;
      return true;
    }
    if (cat === "video") {
      if (!prompt.trim()) return false;
      if (selectedModel.supportsImageInput && !startFrameUrl) return false;
      return true;
    }
    if (cat === "motion-control") return !!motionCharUrl && !!motionRefVideoUrl;
    if (cat === "lipsync") return !!lipsyncVideoUrl && !!lipsyncAudioUrl;
    if (cat === "tts") return !!ttsText.trim();
    return false;
  })();

  // ── Auth wall ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--k-bg)" }}>
        <Spinner size={28} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--k-bg)" }}>
        <div className="max-w-sm w-full rounded-2xl p-8 text-center" style={{ background: "var(--k-surface)", border: "0.5px solid var(--k-border)" }}>
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--k-text)" }}>Войдите, чтобы создавать</h2>
          <p className="text-sm mb-6" style={{ color: "var(--k-muted)" }}>
            Генерация доступна только авторизованным пользователям. При регистрации —&nbsp;
            <span style={{ color: "var(--k-accent)" }}>10 бесплатных кредитов</span>.
          </p>
          <button onClick={() => navigate("/auth")} className="w-full py-2.5 rounded-xl font-semibold text-sm" style={{ background: "var(--k-accent)", color: "#111118" }}>
            Войти через Google
          </button>
          <button onClick={() => navigate("/")} className="w-full mt-3 py-2 text-sm" style={{ color: "var(--k-muted)" }}>← Назад</button>
        </div>
      </div>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────

  const isNanoBanana = selectedModel?.id.includes("nano-banana") ?? false;
  const isImageToVideo = selectedModel?.type === "image-to-video";
  const showPrompt = selectedModel && (selectedModel.category === "image" || selectedModel.category === "video" || selectedModel.category === "tts");
  const showRatios = selectedModel && selectedModel.aspectRatios && selectedModel.aspectRatios.length > 0;
  const showDuration = selectedModel?.supportsDuration && selectedModel.category === "video";

  const genBtnLabel = (() => {
    if (!selectedModel) return "Выберите модель";
    const map: Record<string, string> = { image: "✨ Создать изображение", video: "🎬 Создать видео", "motion-control": "🕺 Перенести движение", lipsync: "👄 Синхронизировать", tts: "🎙️ Создать голос" };
    return map[selectedModel.category] ?? "✨ Создать";
  })();

  return (
    <div className="min-h-screen" style={{ background: "var(--k-bg)" }}>
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/")} className="flex items-center gap-1 text-sm transition-colors" style={{ color: "var(--k-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--k-text)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--k-muted)")}>
            ← Студия
          </button>
          <span style={{ color: "var(--k-border)" }}>/</span>
          <h1 className="text-base font-semibold" style={{ color: "var(--k-text)" }}>Создать</h1>
          {selectedModel && (
            <>
              <span style={{ color: "var(--k-border)" }}>/</span>
              <span className="text-sm" style={{ color: "var(--k-accent)" }}>{selectedModel.name}</span>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">

          {/* ── Left Panel: Controls ─────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {CATS.filter(c => models.some(m => m.category === c.id)).map((c) => (
                <button
                  key={c.id}
                  onClick={() => switchCat(c.id)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0"
                  style={activeCat === c.id
                    ? { background: "rgba(200,169,110,0.15)", border: "1px solid rgba(200,169,110,0.6)", color: "#C8A96E" }
                    : { background: "var(--k-surface)", border: "1px solid var(--k-border)", color: "var(--k-muted)" }}
                >
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>

            {/* Model grid */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--k-surface)", border: "0.5px solid var(--k-border)" }}>
              <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--k-muted)" }}>Модель</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {catModels.map((m) => {
                  const active = m.id === selectedModelId;
                  return (
                    <button
                      key={m.id}
                      onClick={() => selectModel(m)}
                      className="text-left p-3 rounded-xl transition-all"
                      style={active
                        ? { background: "rgba(200,169,110,0.1)", border: "1px solid rgba(200,169,110,0.5)" }
                        : { background: "transparent", border: "1px solid var(--k-border)" }}
                      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(200,169,110,0.25)"; }}
                      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--k-border)"; }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: active ? "#C8A96E" : "var(--k-text)" }}>{m.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--k-muted)" }}>{m.provider}</p>
                        </div>
                        {active && <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: "#C8A96E" }} />}
                      </div>
                      <p className="text-xs mt-1.5 line-clamp-2 leading-relaxed" style={{ color: "var(--k-muted)" }}>{m.description}</p>
                      {m.tags.slice(0, 3).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {m.tags.slice(0, 3).map((t) => (
                            <span key={t} className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.05)", color: "var(--k-muted)" }}>{t}</span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Image: Edit mode toggle ─────────────────────────────────── */}
            {selectedModel?.category === "image" && selectedModel.supportsImageInput && !isNanoBanana && (
              <div className="rounded-2xl p-4" style={{ background: "var(--k-surface)", border: "0.5px solid var(--k-border)" }}>
                <div className="flex gap-2 mb-3">
                  {[
                    { v: false, icon: "✨", label: "Создать с нуля" },
                    { v: true,  icon: "✏️", label: "Редактировать фото" },
                  ].map(({ v, icon, label }) => (
                    <button
                      key={String(v)} onClick={() => { setEditMode(v); if (!v) setEditImageUrl(""); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                      style={editMode === v
                        ? { background: "var(--k-accent)", color: "#111118" }
                        : { background: "transparent", color: "var(--k-muted)", border: "1px solid var(--k-border)" }}
                    >{icon} {label}</button>
                  ))}
                </div>
                {editMode && (
                  <div className="space-y-3">
                    <FileUpload label="Исходное изображение" accept="image/*" hint="JPG, PNG, WebP · до 20 МБ" icon="🖼️" value={editImageUrl} onChange={setEditImageUrl} maxSizeMB={20} />
                    {editImageUrl && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span style={{ color: "var(--k-muted)" }}>Сила изменений</span>
                          <span style={{ color: "var(--k-accent)" }}>{editStrength < 0.35 ? "Слабые" : editStrength < 0.65 ? "Средние" : "Сильные"} · {Math.round(editStrength * 100)}%</span>
                        </div>
                        <input type="range" min={0.1} max={0.95} step={0.05} value={editStrength} onChange={(e) => setEditStrength(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "var(--k-accent)" }} />
                        <div className="flex justify-between text-xs" style={{ color: "var(--k-muted)" }}>
                          <span>Близко к оригиналу</span><span>Полная переработка</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Nano Banana: Reference images (up to 14) ───────────────── */}
            {isNanoBanana && (
              <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--k-surface)", border: "0.5px solid var(--k-border)" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--k-text)" }}>Референс-изображения</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--k-muted)" }}>До 14 изображений для стилевого ориентира (необязательно)</p>
                  </div>
                  {refImages.length < 14 && (
                    <button
                      onClick={() => setRefImages((prev) => [...prev, { url: "", description: "" }])}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                      style={{ background: "rgba(200,169,110,0.1)", color: "var(--k-accent)", border: "1px solid rgba(200,169,110,0.3)" }}
                    >+ Добавить</button>
                  )}
                </div>

                {refImages.length === 0 && (
                  <div
                    className="rounded-xl border-dashed border-2 p-4 text-center cursor-pointer transition-all"
                    style={{ borderColor: "var(--k-border)" }}
                    onClick={() => setRefImages([{ url: "", description: "" }])}
                  >
                    <p className="text-xs" style={{ color: "var(--k-muted)" }}>🖼️ Нажмите «Добавить» или перетащите изображения для ориентира стиля</p>
                  </div>
                )}

                <div className="space-y-3">
                  {refImages.map((ri, idx) => (
                    <div key={idx} className="rounded-xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid var(--k-border)" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium" style={{ color: "var(--k-muted)" }}>Изображение {idx + 1} / 14</span>
                        <button onClick={() => setRefImages((prev) => prev.filter((_, i) => i !== idx))} className="text-xs" style={{ color: "var(--k-muted)" }}>✕</button>
                      </div>
                      <FileUpload
                        label="" accept="image/*" hint="JPG, PNG, WebP" icon="📎"
                        value={ri.url}
                        onChange={(url) => setRefImages((prev) => prev.map((r, i) => i === idx ? { ...r, url } : r))}
                        maxSizeMB={10}
                      />
                      {ri.url && (
                        <input
                          type="text"
                          placeholder="Описание (необязательно): «стиль аниме», «закат», …"
                          value={ri.description}
                          onChange={(e) => setRefImages((prev) => prev.map((r, i) => i === idx ? { ...r, description: e.target.value } : r))}
                          className="w-full text-xs px-3 py-2 rounded-lg outline-none"
                          style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid var(--k-border)", color: "var(--k-text)" }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Video: Start / End frames ───────────────────────────────── */}
            {selectedModel?.category === "video" && isImageToVideo && (
              <div className="rounded-2xl p-4 space-y-4" style={{ background: "var(--k-surface)", border: "0.5px solid var(--k-border)" }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--k-text)" }}>Кадры</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--k-muted)" }}>
                    {selectedModel.supportsEndFrame
                      ? "Загрузите начальный и/или конечный кадр — KLING сгенерирует переход между ними"
                      : "Загрузите изображение, которое будет анимировано"}
                  </p>
                </div>
                <div className={`grid gap-4 ${selectedModel.supportsEndFrame ? "grid-cols-2" : "grid-cols-1"}`}>
                  <FileUpload
                    label={selectedModel.supportsEndFrame ? "Начальный кадр" : "Изображение"}
                    accept="image/*" hint="JPG, PNG, WebP" icon="🎬"
                    value={startFrameUrl} onChange={setStartFrameUrl} maxSizeMB={20}
                  />
                  {selectedModel.supportsEndFrame && (
                    <FileUpload
                      label="Конечный кадр (необязательно)"
                      accept="image/*" hint="JPG, PNG, WebP" icon="🏁"
                      value={endFrameUrl} onChange={setEndFrameUrl} maxSizeMB={20}
                    />
                  )}
                </div>
              </div>
            )}

            {/* ── Motion control ──────────────────────────────────────────── */}
            {selectedModel?.category === "motion-control" && (
              <div className="rounded-2xl p-4 space-y-4" style={{ background: "var(--k-surface)", border: "0.5px solid var(--k-border)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--k-text)" }}>Входные данные</p>
                <div className="grid grid-cols-2 gap-4">
                  <FileUpload label="Персонаж" accept="image/*" hint="Изображение персонажа" icon="👤" value={motionCharUrl} onChange={setMotionCharUrl} maxSizeMB={20} />
                  <FileUpload label="Референс-видео" accept="video/*" hint="MP4 до 30 сек" icon="🎞️" value={motionRefVideoUrl} onChange={setMotionRefVideoUrl} maxSizeMB={50} />
                </div>
                <div>
                  <p className="text-xs mb-2" style={{ color: "var(--k-muted)" }}>Ориентация персонажа</p>
                  <div className="flex gap-2">
                    {(["video", "image"] as const).map((v) => (
                      <button key={v} onClick={() => setMotionOrientation(v)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={motionOrientation === v
                          ? { background: "var(--k-accent)", color: "#111118" }
                          : { background: "transparent", color: "var(--k-muted)", border: "1px solid var(--k-border)" }}
                      >{v === "video" ? "Из видео" : "Из изображения"}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Lipsync ─────────────────────────────────────────────────── */}
            {selectedModel?.category === "lipsync" && (
              <div className="rounded-2xl p-4 space-y-4" style={{ background: "var(--k-surface)", border: "0.5px solid var(--k-border)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--k-text)" }}>Файлы</p>
                <div className="grid grid-cols-2 gap-4">
                  <FileUpload label="Видео с лицом" accept="video/*" hint="MP4 с говорящим лицом" icon="🎭" value={lipsyncVideoUrl} onChange={setLipsyncVideoUrl} maxSizeMB={100} />
                  <FileUpload label="Аудио / речь" accept="audio/*" hint="MP3, WAV, AAC" icon="🎤" value={lipsyncAudioUrl} onChange={setLipsyncAudioUrl} maxSizeMB={20} />
                </div>
              </div>
            )}

            {/* ── TTS: Text + reference audio ─────────────────────────────── */}
            {selectedModel?.category === "tts" && (
              <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--k-surface)", border: "0.5px solid var(--k-border)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--k-text)" }}>Текст для озвучки</p>
                <textarea
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  placeholder="Введите текст на русском, английском или другом языке..."
                  rows={5}
                  className="w-full text-sm resize-none rounded-xl px-4 py-3 outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid var(--k-border)", color: "var(--k-text)" }}
                />
                {selectedModel.supportsAudioInput && (
                  <FileUpload label="Референс-голос (для клонирования)" accept="audio/*" hint="MP3, WAV · 5–10 сек образца голоса" icon="🎤" value={ttsRefAudioUrl} onChange={setTtsRefAudioUrl} maxSizeMB={10} />
                )}
              </div>
            )}

            {/* ── Prompt (image / video) ───────────────────────────────────── */}
            {showPrompt && selectedModel?.category !== "tts" && (
              <div className="rounded-2xl p-4 space-y-3 transition-all" style={{
                background: "var(--k-surface)",
                border: promptFocused ? "1px solid rgba(200,169,110,0.6)" : "0.5px solid var(--k-border)",
                boxShadow: promptFocused ? "0 0 0 3px rgba(200,169,110,0.08)" : "none",
              }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold" style={{ color: "var(--k-text)" }}>
                    {selectedModel?.category === "image" && editMode ? "Описание изменений" : "Промпт"}
                  </p>
                  <span className="text-xs" style={{ color: prompt.length > 900 ? "#ef4444" : "var(--k-muted)" }}>{prompt.length}/1000</span>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
                  onFocus={() => setPromptFocused(true)}
                  onBlur={() => setPromptFocused(false)}
                  placeholder={
                    selectedModel?.category === "image" && editMode
                      ? "Опишите изменения: «Сделай фон заснеженным, добавь тёплое освещение...»"
                      : selectedModel?.category === "video"
                      ? "Опишите сцену, движение и стиль: «Девушка идёт по осенней улице Парижа, кинематографичный стиль...»"
                      : "Опишите изображение: «Портрет молодой женщины в японском стиле аниме, 4K, яркие цвета...»"
                  }
                  rows={5}
                  className="w-full text-sm resize-none outline-none bg-transparent"
                  style={{ color: "var(--k-text)" }}
                />
                <button
                  onClick={() => setShowNeg((v) => !v)}
                  className="text-xs transition-colors"
                  style={{ color: "var(--k-muted)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--k-text)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--k-muted)")}
                >{showNeg ? "▼" : "▶"} Негативный промпт</button>
                {showNeg && (
                  <textarea
                    value={negPrompt}
                    onChange={(e) => setNegPrompt(e.target.value)}
                    placeholder="Что исключить: размытость, водяные знаки, деформированные лица..."
                    rows={2}
                    className="w-full text-xs resize-none outline-none rounded-lg px-3 py-2"
                    style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid var(--k-border)", color: "var(--k-muted)" }}
                  />
                )}
              </div>
            )}

            {/* ── Aspect ratio + Duration + NumImages ──────────────────────── */}
            {(showRatios || showDuration || selectedModel?.category === "image") && (
              <div className="rounded-2xl p-4 space-y-4" style={{ background: "var(--k-surface)", border: "0.5px solid var(--k-border)" }}>
                {showRatios && (
                  <div>
                    <p className="text-xs font-medium mb-2 uppercase tracking-widest" style={{ color: "var(--k-muted)" }}>Соотношение сторон</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedModel!.aspectRatios.map((r) => (
                        <RatioPill key={r} ratio={r} active={aspectRatio === r} onClick={() => setAspectRatio(r)} />
                      ))}
                    </div>
                  </div>
                )}

                {selectedModel?.category === "image" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--k-muted)" }}>Количество изображений</p>
                      <span className="text-sm font-bold" style={{ color: "var(--k-accent)" }}>{numImages}</span>
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((n) => (
                        <button key={n} onClick={() => setNumImages(n)}
                          className="flex-1 py-1.5 rounded-lg text-sm font-medium transition-all"
                          style={numImages === n
                            ? { background: "rgba(200,169,110,0.15)", border: "1px solid rgba(200,169,110,0.5)", color: "#C8A96E" }
                            : { background: "transparent", border: "1px solid var(--k-border)", color: "var(--k-muted)" }}
                        >{n}</button>
                      ))}
                    </div>
                  </div>
                )}

                {showDuration && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--k-muted)" }}>Длительность</p>
                      <span className="text-sm font-bold" style={{ color: "var(--k-accent)" }}>{duration} сек</span>
                    </div>
                    <input
                      type="range" min={3} max={selectedModel!.maxDuration ?? 10} step={1}
                      value={duration} onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full" style={{ accentColor: "var(--k-accent)" }}
                    />
                    <div className="flex justify-between text-xs mt-1" style={{ color: "var(--k-muted)" }}>
                      <span>3 сек</span><span>{selectedModel!.maxDuration ?? 10} сек</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Generate button ─────────────────────────────────────────── */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-all"
              style={canGenerate
                ? { background: "linear-gradient(135deg, #C8A96E 0%, #D4B87A 100%)", color: "#111118", boxShadow: "0 4px 20px rgba(200,169,110,0.3)" }
                : { background: "rgba(255,255,255,0.06)", color: "var(--k-muted)", cursor: "not-allowed" }}
            >
              {isGenerating ? (
                <div className="flex items-center justify-center gap-2">
                  <Spinner size={16} color="#111118" />
                  <span>Генерирую...</span>
                </div>
              ) : genBtnLabel}
            </button>
          </div>

          {/* ── Right Panel: Output ───────────────────────────────────────────── */}
          <div className="lg:sticky lg:top-20">
            {!jobState && !isGenerating && (
              <div
                className="rounded-2xl flex flex-col items-center justify-center text-center p-10 min-h-[300px]"
                style={{ background: "var(--k-surface)", border: "0.5px dashed var(--k-border)" }}
              >
                <div className="text-5xl mb-4 opacity-40">
                  {activeCat === "image" ? "🖼️" : activeCat === "video" ? "🎬" : activeCat === "motion-control" ? "🕺" : activeCat === "lipsync" ? "👄" : "🎙️"}
                </div>
                <p className="text-sm font-medium" style={{ color: "var(--k-muted)" }}>Результат появится здесь</p>
                <p className="text-xs mt-1" style={{ color: "var(--k-muted)", opacity: 0.6 }}>Выберите модель и заполните промпт</p>
              </div>
            )}

            {isGenerating && !jobState?.outputs?.length && (
              <div
                className="rounded-2xl flex flex-col items-center justify-center text-center p-10 min-h-[300px]"
                style={{ background: "var(--k-surface)", border: "0.5px solid var(--k-border)" }}
              >
                <Spinner size={36} />
                <p className="mt-4 text-sm font-medium" style={{ color: "var(--k-text)" }}>Генерирую...</p>
                {jobState?.status === "queued" && (
                  <p className="text-xs mt-1" style={{ color: "var(--k-muted)" }}>
                    В очереди{jobState.queuePosition !== undefined ? ` · позиция #${jobState.queuePosition + 1}` : ""}
                  </p>
                )}
                {jobState?.status === "in_progress" && (
                  <p className="text-xs mt-1" style={{ color: "var(--k-muted)" }}>Обрабатываю запрос...</p>
                )}
                {jobState?.logs && jobState.logs.length > 0 && (
                  <div className="mt-3 text-xs font-mono text-left w-full max-h-20 overflow-y-auto" style={{ color: "var(--k-muted)" }}>
                    {jobState.logs.slice(-3).map((l, i) => <div key={i}>{l}</div>)}
                  </div>
                )}
              </div>
            )}

            {jobState?.status === "failed" && (
              <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(239,68,68,0.05)", border: "0.5px solid rgba(239,68,68,0.3)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-red-400 text-lg">⚠️</span>
                  <p className="text-sm font-semibold text-red-400">Ошибка генерации</p>
                </div>
                <p className="text-xs text-red-300 font-mono">{jobState.error}</p>
                <button
                  onClick={() => setJobState(null)}
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}
                >Попробовать снова</button>
              </div>
            )}

            {jobState?.status === "completed" && jobState.outputs?.length && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: "var(--k-green)" }} />
                    <p className="text-sm font-semibold" style={{ color: "var(--k-text)" }}>Готово!</p>
                  </div>
                  <button
                    onClick={() => { setJobState(null); }}
                    className="text-xs px-3 py-1.5 rounded-lg transition-all"
                    style={{ color: "var(--k-muted)", border: "1px solid var(--k-border)" }}
                  >Создать ещё</button>
                </div>

                {jobState.mediaType === "image" && <ImageOutput outputs={jobState.outputs} />}
                {jobState.mediaType === "video" && <VideoOutput outputs={jobState.outputs} />}
                {jobState.mediaType === "audio" && <AudioOutput outputs={jobState.outputs} />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
