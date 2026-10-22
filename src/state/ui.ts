import { create } from 'zustand';

interface UiState {
  /** Text read out by the polite live region. */
  announcement: string;
  toast: string | null;
  celebrating: boolean;
  dailyQuestionOpen: boolean;
  announce(message: string): void;
  showToast(message: string): void;
  clearToast(): void;
  setCelebrating(open: boolean): void;
  setDailyQuestionOpen(open: boolean): void;
}

export const useUi = create<UiState>((set) => ({
  announcement: '',
  toast: null,
  celebrating: false,
  dailyQuestionOpen: false,
  announce: (message) => {
    // Clear first so repeating the same message is still announced.
    set({ announcement: '' });
    requestAnimationFrame(() => set({ announcement: message }));
  },
  showToast: (message) => set({ toast: message }),
  clearToast: () => set({ toast: null }),
  setCelebrating: (celebrating) => set({ celebrating }),
  setDailyQuestionOpen: (dailyQuestionOpen) => set({ dailyQuestionOpen }),
}));
