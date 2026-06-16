import { create } from 'zustand'
import type { CompletionSummary } from '../lib/complete'

interface RunStore {
  /** Summary of the most recently completed session, shown on the Done screen. */
  summary: CompletionSummary | null
  setSummary: (s: CompletionSummary) => void
  clearSummary: () => void
}

export const useRunStore = create<RunStore>((set) => ({
  summary: null,
  setSummary: (summary) => set({ summary }),
  clearSummary: () => set({ summary: null }),
}))
