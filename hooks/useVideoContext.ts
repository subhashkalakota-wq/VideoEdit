import { create } from "zustand";

export interface VideoInfo {
  name: string;
  size: number;           // bytes
  type: string;
  duration: number;       // seconds
  width: number;
  height: number;
  objectUrl: string;      // blob URL for preview
  fps?: number;
  uploadedAt: number;
}

interface VideoContextStore {
  video: VideoInfo | null;
  setVideo: (info: VideoInfo) => void;
  clearVideo: () => void;
}

export const useVideoContext = create<VideoContextStore>((set, get) => ({
  video: null,
  setVideo: (info) => {
    // Revoke old blob URL to avoid memory leaks
    const prev = get().video;
    if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl);
    set({ video: info });
  },
  clearVideo: () => {
    const prev = get().video;
    if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl);
    set({ video: null });
  },
}));
