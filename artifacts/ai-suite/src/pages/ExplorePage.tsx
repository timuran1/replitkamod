import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { api, ModelInfo } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PROVIDER_COLORS: Record<string, string> = {
  Google: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Google DeepMind": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  OpenAI: "bg-green-500/20 text-green-300 border-green-500/30",
  Kuaishou: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Black Forest Labs": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  Recraft: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  Ideogram: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  Alibaba: "bg-red-500/20 text-red-300 border-red-500/30",
  "Sync Labs": "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  SWivid: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  "fal.ai": "bg-violet-500/20 text-violet-300 border-violet-500/30",
};

const CATEGORY_CONFIG: Record<string, { icon: string; label: string; gradientClass: string }> = {
  "text-to-image": { icon: "🖼️", label: "Image", gradientClass: "from-pink-500 to-violet-500" },
  "text-to-video": { icon: "🎬", label: "Text→Video", gradientClass: "from-violet-500 to-blue-500" },
  "image-to-video": { icon: "🎞️", label: "Img→Video", gradientClass: "from-blue-500 to-cyan-500" },
  "motion-control": { icon: "🕺", label: "Motion", gradientClass: "from-orange-500 to-red-500" },
  "lipsync": { icon: "👄", label: "Lip Sync", gradientClass: "from-rose-500 to-pink-600" },
  "text-to-speech": { icon: "🎙️", label: "Voice", gradientClass: "from-teal-500 to-emerald-500" },
};

type FilterKey = "all" | "image" | "video" | "motion-control" | "lipsync" | "tts";

function ModelCard({ model, onGenerate }: { model: ModelInfo; onGenerate: () => void }) {
  const providerColor = PROVIDER_COLORS[model.provider] || "bg-violet-500/20 text-violet-300 border-violet-500/30";
  const cfg = CATEGORY_CONFIG[model.type] || { icon: "✨", label: model.type, gradientClass: "from-violet-500 to-blue-500" };

  const capabilities: string[] = [];
  if (model.supportsImageInput) capabilities.push("📷 Image Input");
  if (model.supportsVideoInput) capabilities.push("🎬 Video Input");
  if (model.supportsAudioInput) capabilities.push("🎵 Audio Input");
  if (model.supportsDuration) capabilities.push(`⏱️ Up to ${model.maxDuration}s`);

  return (
    <div className="group relative model-card-gradient border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
      <div className={`h-1 w-full bg-gradient-to-r ${cfg.gradientClass}`} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{cfg.icon}</span>
            <div>
              <h3 className="font-semibold text-foreground text-sm leading-tight">{model.name}</h3>
              <span className="text-xs text-muted-foreground">{model.provider}</span>
            </div>
          </div>
          <Badge variant="outline" className={`text-xs shrink-0 border ${providerColor}`}>
            {cfg.label}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground mb-3 leading-relaxed line-clamp-3">{model.description}</p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {model.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
              {tag}
            </span>
          ))}
          {capabilities.map((cap) => (
            <span key={cap} className="text-xs px-2 py-0.5 bg-primary/10 rounded-full text-primary/80 border border-primary/20">
              {cap}
            </span>
          ))}
        </div>

        <Button
          onClick={onGenerate}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium"
          size="sm"
        >
          {model.category === "tts" ? "Generate Voice →" :
           model.category === "lipsync" ? "Sync Lips →" :
           model.category === "motion-control" ? "Transfer Motion →" :
           "Generate →"}
        </Button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="model-card-gradient border border-border rounded-2xl overflow-hidden animate-pulse">
      <div className="h-1 w-full bg-muted" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-muted rounded-lg" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3 bg-muted rounded w-3/4" />
            <div className="h-2.5 bg-muted rounded w-1/2" />
          </div>
        </div>
        <div className="h-12 bg-muted rounded" />
        <div className="flex gap-1.5">
          <div className="h-5 w-16 bg-muted rounded-full" />
          <div className="h-5 w-20 bg-muted rounded-full" />
        </div>
        <div className="h-8 bg-muted rounded-lg" />
      </div>
    </div>
  );
}

const FILTER_DEFS: { key: FilterKey; label: string; icon: string; match: (m: ModelInfo) => boolean }[] = [
  { key: "all", label: "All", icon: "✨", match: () => true },
  { key: "image", label: "Images", icon: "🖼️", match: (m) => m.category === "image" },
  { key: "video", label: "Video", icon: "🎬", match: (m) => m.category === "video" },
  { key: "motion-control", label: "Motion", icon: "🕺", match: (m) => m.category === "motion-control" },
  { key: "lipsync", label: "Lip Sync", icon: "👄", match: (m) => m.category === "lipsync" },
  { key: "tts", label: "Voice", icon: "🎙️", match: (m) => m.category === "tts" },
];

export default function ExplorePage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [, navigate] = useLocation();

  useEffect(() => {
    api.listModels()
      .then((r) => setModels(r.models))
      .finally(() => setLoading(false));
  }, []);

  const currentFilter = FILTER_DEFS.find((f) => f.key === filter)!;
  const filtered = models.filter(currentFilter.match);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-bold mb-3 gradient-text">
            AI Media Suite
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Generate images, videos, voice, lip sync, and motion transfer — all powered by state-of-the-art AI.
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-8">
          {FILTER_DEFS.map(({ key, label, icon, match }) => {
            const count = models.filter(match).length;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === key
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <span>{icon}</span>
                <span>{label}</span>
                {!loading && key !== "all" && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === key ? "bg-white/20" : "bg-muted-foreground/20"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Category description */}
        {filter === "motion-control" && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-orange-300">
              🕺 <strong>Motion Transfer</strong> — Upload a character image and a reference video to copy realistic motion onto your character.
            </p>
          </div>
        )}
        {filter === "lipsync" && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-rose-300">
              👄 <strong>Lip Sync</strong> — Upload any face video + audio to generate perfectly synced lips. Works with any language.
            </p>
          </div>
        )}
        {filter === "tts" && (
          <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-teal-300">
              🎙️ <strong>Text to Speech</strong> — Convert text to natural-sounding voice. Supports voice cloning with a reference audio clip.
            </p>
          </div>
        )}

        {/* Model grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : filtered.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  onGenerate={() => navigate(`/generate?modelId=${encodeURIComponent(model.id)}`)}
                />
              ))}
        </div>

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            No models found for this filter.
          </div>
        )}
      </div>
    </div>
  );
}
