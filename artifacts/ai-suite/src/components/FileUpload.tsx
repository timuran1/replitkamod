import { useRef, useState, type DragEvent } from "react";
import { api } from "@/lib/api";

interface FileUploadProps {
  label: string;
  accept: string;
  hint?: string;
  icon?: string;
  value?: string;
  onChange: (url: string) => void;
  maxSizeMB?: number;
}

export function FileUpload({ label, accept, hint, icon = "📎", value, onChange, maxSizeMB = 200 }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFile = async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File too large. Max ${maxSizeMB}MB.`);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const { url } = await api.uploadFile(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleUrlSubmit = () => {
    const trimmed = urlInput.trim();
    if (trimmed) {
      onChange(trimmed);
      setUrlInput("");
      setShowUrlInput(false);
    }
  };

  const isVideo = accept.includes("video");
  const isAudio = accept.includes("audio");
  const isImage = accept.includes("image");

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>

      {/* Upload zone */}
      {!value ? (
        <div
          className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
            dragOver
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !showUrlInput && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleChange}
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : showUrlInput ? (
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://..."
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
              />
              <div className="flex gap-2">
                <button onClick={handleUrlSubmit} className="flex-1 bg-primary text-primary-foreground text-xs py-1.5 rounded-lg">
                  Use URL
                </button>
                <button onClick={() => setShowUrlInput(false)} className="flex-1 bg-muted text-muted-foreground text-xs py-1.5 rounded-lg">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="text-3xl">{icon}</span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isVideo ? "Drop video or click to upload" : isAudio ? "Drop audio or click to upload" : "Drop image or click to upload"}
                </p>
                {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                  className="text-xs px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg border border-border text-foreground transition-colors"
                >
                  📁 Browse File
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowUrlInput(true); }}
                  className="text-xs px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg border border-border text-foreground transition-colors"
                >
                  🔗 Paste URL
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-border bg-card">
          {isImage && (
            <img src={value} alt="Uploaded" className="w-full h-32 object-cover" />
          )}
          {isVideo && (
            <video src={value} className="w-full h-32 object-cover" muted />
          )}
          {isAudio && (
            <div className="flex items-center gap-3 p-3">
              <span className="text-2xl">🎵</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">Audio uploaded</p>
                <p className="text-xs text-muted-foreground truncate">{value.split("/").pop()}</p>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={() => { onChange(""); if (inputRef.current) inputRef.current.value = ""; }}
              className="bg-red-500/90 text-white text-xs px-3 py-1.5 rounded-lg"
            >
              🗑️ Remove
            </button>
            <button
              onClick={() => inputRef.current?.click()}
              className="bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg"
            >
              🔄 Replace
            </button>
          </div>
          <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
