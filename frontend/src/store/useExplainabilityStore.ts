import { create } from 'zustand';
import type { Task } from '../types';

interface ExplainabilityStore {
  selectedTask: Task | null;
  isOpen: boolean;
  openDrawer: (task: Task) => void;
  closeDrawer: () => void;
}

export const useExplainabilityStore = create<ExplainabilityStore>((set) => ({
  selectedTask: null,
  isOpen: false,
  openDrawer: (task) => set({ selectedTask: task, isOpen: true }),
  closeDrawer: () => set({ isOpen: false, selectedTask: null }),
}));
