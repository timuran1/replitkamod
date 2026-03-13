import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { api, ModelInfo } from "@/lib/api";
import { getModelPricing, formatUZS } from "@/lib/pricing";

const CATEGORY_CONFIG: Record<string, { icon: string; label: string; topColor: string }> = {
  "text-to-image": { icon: "🖼️", label: "Изображение", topColor: "#C8A96E" },
  "text-to-video": { icon: "🎬", label: "Текст→Видео", topColor: "#8B6FE8" },
  "image-to-video": { icon: "🎞️", label: "Фото→Видео", topColor: "#6B8BE8" },
  "motion-control": { icon: "🕺", label: "Движение", topColor: "#E8936B" },
  "lipsync": { icon: "👄", label: "Lip Sync", topColor: "#E86B8B" },
  "text-to-speech": { icon: "🎙️", label: "Голос", topColor: "#3FD68F" },
};

type FilterKey = "all" | "image" | "video" | "motion-control" | "lipsync" | "tts";

const FILTER_DEFS: { key: FilterKey; label: string; icon: string; match: (m: ModelInfo) => boolean }[] = [
  { key: "all", label: "Все", icon: "✦", match: () => true },
  { key: "image", label: "Изображения", icon: "🖼️", match: (m) => m.category === "image" },
  { key: "video", label: "Видео", icon: "🎬", match: (m) => m.category === "video" },
  { key: "motion-control", label: "Движение", icon: "🕺", match: (m) => m.category === "motion-control" },
  { key: "lipsync", label: "Lip Sync", icon: "👄", match: (m) => m.category === "lipsync" },
  { key: "tts", label: "Голос", icon: "🎙️", match: (m) => m.category === "tts" },
];

function CostRow({ modelId }: { modelId: string }) {
  const p = getModelPricing(modelId);
  if (!p) return null;
  return (
    <div
      className="flex items-center justify-between text-xs py-2 px-3 rounded-lg mt-3 mb-1"
      style={{ background: "rgba(200, 169, 110, 0.06)", border: "0.5px solid rgba(200, 169, 110, 0.15)" }}
    >
      <span style={{ color: "var(--k-muted)" }}>
        1 {p.unit} → <strong style={{ color: "var(--k-text)", fontWeight: 600 }}>{p.credits} кр.</strong>
      </span>
      <span style={{ color: "var(--k-accent)", fontWeight: 600 }}>~{formatUZS(p.uzs)} UZS</span>
    </div>
  );
}

function ModelCard({ model, onGenerate }: { model: ModelInfo; onGenerate: () => void }) {
  const [hovered, setHovered] = useState(false);
  const cfg = CATEGORY_CONFIG[model.type] || { icon: "✨", label: model.type, topColor: "#C8A96E" };

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden transition-all duration-200 cursor-pointer"
      style={{
        background: "var(--k-card)",
        border: hovered ? "0.5px solid rgba(200, 169, 110, 0.3)" : "0.5px solid var(--k-border)",
        borderRadius: "12px",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top accent line */}
      <div className="h-0.5 w-full" style={{ background: cfg.topColor, opacity: 0.7 }} />

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{cfg.icon}</span>
            <div>
              <h3 className="font-semibold text-sm leading-tight" style={{ color: "var(--k-text)" }}>{model.name}</h3>
              <span className="text-xs" style={{ color: "var(--k-muted)" }}>{model.provider}</span>
            </div>
          </div>
          <span
            className="text-xs px-2 py-0.5 rounded-full shrink-0"
            style={{
              background: "rgba(200, 169, 110, 0.1)",
              color: "var(--k-accent)",
              border: "0.5px solid rgba(200, 169, 110, 0.2)",
            }}
          >
            {cfg.label}
          </span>
        </div>

        <p className="text-sm leading-relaxed mb-3 line-clamp-2 flex-1" style={{ color: "var(--k-muted)" }}>
          {model.description}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-2">
          {model.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.04)", color: "var(--k-muted)" }}
            >
              {tag}
            </span>
          ))}
          {model.supportsImageInput && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(139,111,232,0.1)", color: "#8B6FE8" }}>📷 Фото</span>
          )}
          {model.supportsVideoInput && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(139,111,232,0.1)", color: "#8B6FE8" }}>🎬 Видео</span>
          )}
        </div>

        <CostRow modelId={model.id} />

        <button
          onClick={onGenerate}
          className="w-full text-sm font-semibold py-2.5 rounded-lg mt-2 transition-all duration-150"
          style={{
            background: hovered ? "var(--k-accent)" : "rgba(200, 169, 110, 0.08)",
            color: hovered ? "#111118" : "var(--k-accent)",
            border: "1px solid rgba(200, 169, 110, 0.3)",
          }}
        >
          {model.category === "tts" ? "Сгенерировать голос →" :
           model.category === "lipsync" ? "Синхронизировать →" :
           model.category === "motion-control" ? "Перенести движение →" :
           "Создать →"}
        </button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden animate-pulse" style={{ background: "var(--k-card)", border: "0.5px solid var(--k-border)" }}>
      <div className="h-0.5 w-full bg-white/5" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3 bg-white/5 rounded w-3/4" />
            <div className="h-2.5 bg-white/5 rounded w-1/2" />
          </div>
        </div>
        <div className="h-10 bg-white/5 rounded" />
        <div className="flex gap-1.5">
          <div className="h-5 w-16 bg-white/5 rounded-full" />
          <div className="h-5 w-20 bg-white/5 rounded-full" />
        </div>
        <div className="h-9 bg-white/5 rounded-lg" />
        <div className="h-9 bg-white/5 rounded-lg" />
      </div>
    </div>
  );
}

function Hero({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center mb-12 pt-4">
      {/* Pill badge */}
      <div className="inline-flex items-center gap-2 text-xs px-4 py-1.5 rounded-full mb-6"
        style={{ background: "rgba(200, 169, 110, 0.08)", border: "0.5px solid rgba(200, 169, 110, 0.25)", color: "var(--k-accent)" }}>
        <span>✦</span>
        <span>20 AI моделей · Оплата в UZS</span>
      </div>

      {/* H1 */}
      <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight" style={{ color: "var(--k-text)" }}>
        Создавайте{" "}
        <span className="gradient-text-gold">кино</span>
        {" "}с помощью ИИ
      </h1>

      {/* Subtitle */}
      <p className="text-base md:text-lg max-w-2xl mx-auto mb-8 leading-relaxed" style={{ color: "var(--k-muted)" }}>
        Изображения, видео, голос, синхронизация губ — всё в одной студии.
        <br className="hidden md:block" />
        Оплата через Click, Payme, Humo.
      </p>

      {/* CTAs */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button onClick={onStart} className="k-btn-accent px-6 py-2.5 text-sm">
          Попробовать бесплатно
        </button>
        <button
          className="k-btn-outline px-6 py-2.5 text-sm"
          style={{ color: "var(--k-text)" }}
        >
          Смотреть примеры
        </button>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [, navigate] = useLocation();

  useEffect(() => {
    api.listModels().then((r) => setModels(r.models)).finally(() => setLoading(false));
  }, []);

  const currentFilter = FILTER_DEFS.find((f) => f.key === filter)!;
  const filtered = models.filter(currentFilter.match);

  return (
    <div className="min-h-screen" style={{ background: "var(--k-bg)" }}>
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
        <Hero onStart={() => navigate("/generate")} />

        {/* Filter tabs */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-8">
          {FILTER_DEFS.map(({ key, label, icon, match }) => {
            const active = filter === key;
            const count = models.filter(match).length;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={
                  active
                    ? { background: "var(--k-accent)", color: "#111118" }
                    : { background: "transparent", color: "var(--k-muted)", border: "1px solid var(--k-border)" }
                }
              >
                <span>{icon}</span>
                <span>{label}</span>
                {!loading && key !== "all" && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: active ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.06)" }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Info banners */}
        {filter === "motion-control" && (
          <div className="rounded-xl p-4 mb-6 text-center text-sm" style={{ background: "rgba(232,147,107,0.08)", border: "0.5px solid rgba(232,147,107,0.2)", color: "#E8936B" }}>
            🕺 <strong>Перенос движения</strong> — загрузите фото персонажа и референс-видео с движением.
          </div>
        )}
        {filter === "lipsync" && (
          <div className="rounded-xl p-4 mb-6 text-center text-sm" style={{ background: "rgba(232,107,139,0.08)", border: "0.5px solid rgba(232,107,139,0.2)", color: "#E86B8B" }}>
            👄 <strong>Синхронизация губ</strong> — загрузите видео с лицом + аудио. Работает с любым языком.
          </div>
        )}
        {filter === "tts" && (
          <div className="rounded-xl p-4 mb-6 text-center text-sm" style={{ background: "rgba(63,214,143,0.08)", border: "0.5px solid rgba(63,214,143,0.2)", color: "#3FD68F" }}>
            🎙️ <strong>Текст в речь</strong> — конвертируйте текст в голос. F5-TTS поддерживает клонирование голоса.
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
          <div className="text-center py-16" style={{ color: "var(--k-muted)" }}>Нет моделей для этого фильтра.</div>
        )}
      </div>
    </div>
  );
}
