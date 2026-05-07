import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HistoryItem, ParseResult } from "@/lib/types";

interface HistoryStore {
  items: HistoryItem[];
  add: (instruction: string, result: ParseResult) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useParseHistory = create<HistoryStore>()(
  persist(
    (set) => ({
      items: [],
      add: (instruction, result) =>
        set((state) => ({
          items: [
            {
              id: crypto.randomUUID(),
              instruction,
              result,
              timestamp: Date.now(),
            },
            ...state.items.slice(0, 19), // keep last 20
          ],
        })),
      remove: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    { name: "videoai-history" }
  )
);
