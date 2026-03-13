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
};

const TYPE_ICONS: Record<string, string> = {
  "text-to-image": "🖼️",
  "text-to-video": "🎬",
  "image-to-video": "🎞️",
};

const TYPE_LABELS: Record<string, string> = {
  "text-to-image": "Image",
  "text-to-video": "Video",
  "image-to-video": "Img→Video",
};

function ModelCard({ model, onGenerate }: { model: ModelInfo; onGenerate: () => void }) {
  const providerColor = PROVIDER_COLORS[model.provider] || "bg-violet-500/20 text-violet-300 border-violet-500/30";
  const isVideo = model.type !== "text-to-image";

  return (
    <div className="group relative model-card-gradient border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
      {/* Header gradient bar */}
      <div className={`h-1 w-full ${isVideo ? "bg-gradient-to-r from-violet-500 to-blue-500" : "bg-gradient-to-r from-pink-500 to-violet-500"}`} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{TYPE_ICONS[model.type]}</span>
            <div>
              <h3 className="font-semibold text-foreground text-sm leading-tight">{model.name}</h3>
              <span className="text-xs text-muted-foreground">{model.provider}</span>
            </div>
          </div>
          <Badge variant="outline" className={`text-xs shrink-0 border ${providerColor}`}>
            {TYPE_LABELS[model.type]}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{model.description}</p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {model.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
              {tag}
            </span>
          ))}
          {model.supportsDuration && (
            <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
              up to {model.maxDuration}s
            </span>
          )}
        </div>

        <Button
          onClick={onGenerate}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium"
          size="sm"
        >
          Generate →
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

export default function ExplorePage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");
  const [, navigate] = useLocation();

  useEffect(() => {
    api.listModels()
      .then((r) => setModels(r.models))
      .finally(() => setLoading(false));
  }, []);

  const filtered = models.filter((m) => {
    if (filter === "image") return m.type === "text-to-image";
    if (filter === "video") return m.type !== "text-to-image";
    return true;
  });

  const imageCount = models.filter((m) => m.type === "text-to-image").length;
  const videoCount = models.filter((m) => m.type !== "text-to-image").length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-bold mb-3 gradient-text">
            AI Media Suite
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Generate stunning images and videos with the world's most powerful AI models — all in one place.
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[
            { key: "all", label: `All Models (${models.length})` },
            { key: "image", label: `Images (${imageCount})` },
            { key: "video", label: `Videos (${videoCount})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === key
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

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
