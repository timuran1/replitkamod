import { useState, useEffect } from "react";
import { loadGallery, deleteFromGallery, clearGallery, GalleryItem } from "@/lib/gallery";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

function MediaCard({ item, onDelete }: { item: GalleryItem; onDelete: () => void }) {
  const [muted, setMuted] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const output = item.outputs[0];
  if (!output) return null;

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const mediaTypeInfo = {
    image: { icon: "🖼️", label: "Image", ext: "jpg" },
    video: { icon: "🎬", label: "Video", ext: "mp4" },
    audio: { icon: "🎵", label: "Audio", ext: "mp3" },
  }[item.mediaType] || { icon: "✨", label: "Media", ext: "bin" };

  return (
    <div
      className="bg-card border border-border rounded-2xl overflow-hidden group"
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      {/* Media */}
      <div className="relative bg-black aspect-video">
        {item.mediaType === "image" && (
          <img src={output.url} alt={item.prompt} className="w-full h-full object-cover" />
        )}
        {item.mediaType === "video" && (
          <video src={output.url} autoPlay loop muted={muted} playsInline className="w-full h-full object-contain" />
        )}
        {item.mediaType === "audio" && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
            <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center text-3xl">🎵</div>
            <audio controls className="w-full max-w-xs" src={output.url} style={{ filter: "invert(0.9) hue-rotate(180deg)" }} />
          </div>
        )}

        {/* Overlay controls (non-audio) */}
        {item.mediaType !== "audio" && (
          <div className={`absolute inset-0 bg-black/40 flex items-end justify-between p-2 transition-opacity ${showDelete ? "opacity-100" : "opacity-0"}`}>
            <div className="flex gap-1.5">
              {item.mediaType === "video" && (
                <button onClick={() => setMuted((m) => !m)} className="bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  {muted ? "🔇" : "🔊"}
                </button>
              )}
              <a href={output.url} download={`generation.${mediaTypeInfo.ext}`} target="_blank" rel="noopener noreferrer" className="bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                ⬇️
              </a>
            </div>
            <button onClick={onDelete} className="bg-red-500/80 text-white text-xs px-2 py-1 rounded-full hover:bg-red-500">
              🗑️
            </button>
          </div>
        )}

        {/* Delete button for audio */}
        {item.mediaType === "audio" && (
          <div className={`absolute top-2 right-2 transition-opacity ${showDelete ? "opacity-100" : "opacity-0"}`}>
            <button onClick={onDelete} className="bg-red-500/80 text-white text-xs px-2 py-1 rounded-full hover:bg-red-500">
              🗑️
            </button>
          </div>
        )}

        {/* Media type badge */}
        <div className="absolute top-2 left-2">
          <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
            {mediaTypeInfo.icon} {mediaTypeInfo.label}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        <p className="text-xs text-foreground line-clamp-2">{item.prompt}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground truncate">{item.modelName}</span>
          <span className="text-xs text-muted-foreground shrink-0">{timeAgo(item.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [, navigate] = useLocation();

  const refresh = () => setItems(loadGallery());

  useEffect(() => {
    refresh();
  }, []);

  const handleDelete = (id: string) => {
    deleteFromGallery(id);
    refresh();
  };

  const handleClear = () => {
    if (window.confirm("Clear all gallery items? This cannot be undone.")) {
      clearGallery();
      refresh();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Gallery</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{items.length} creation{items.length !== 1 ? "s" : ""}</p>
          </div>
          {items.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClear} className="text-destructive border-destructive/30 hover:bg-destructive/10">
              Clear All
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-64 text-center">
            <div className="text-5xl mb-4 opacity-20">🎨</div>
            <h2 className="text-xl font-semibold mb-2">No creations yet</h2>
            <p className="text-muted-foreground text-sm mb-6">Generate your first image or video to see it here</p>
            <Button onClick={() => navigate("/generate")} className="bg-primary hover:bg-primary/90">
              Start Creating →
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <MediaCard key={item.id} item={item} onDelete={() => handleDelete(item.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
