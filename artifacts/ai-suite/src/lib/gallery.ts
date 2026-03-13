export interface GalleryItem {
  id: string;
  prompt: string;
  modelId: string;
  modelName: string;
  mediaType: "image" | "video";
  outputs: Array<{ url: string; contentType?: string; width?: number; height?: number; duration?: number }>;
  createdAt: string;
  aspectRatio?: string;
}

const STORAGE_KEY = "ai_suite_gallery";

export function saveToGallery(item: Omit<GalleryItem, "id" | "createdAt">) {
  const existing = loadGallery();
  const newItem: GalleryItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const updated = [newItem, ...existing].slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newItem;
}

export function loadGallery(): GalleryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function deleteFromGallery(id: string) {
  const existing = loadGallery();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.filter((i) => i.id !== id)));
}

export function clearGallery() {
  localStorage.removeItem(STORAGE_KEY);
}
