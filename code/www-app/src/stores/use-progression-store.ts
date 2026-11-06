import { create } from 'zustand';

import { boxById } from '@/lib/mock/boxes';
import { levelForXp, xpIntoLevel } from '@/lib/mock/gamification';
import { themeById } from '@/lib/mock/themes';
import { tutorialById, tutorialsByBox } from '@/lib/mock/tutorials';

export type DownloadState = {
  status: 'idle' | 'downloading' | 'done';
  progress: number;
};

type ProgressionState = {
  stepsDone: Record<string, string[]>;
  xp: number;
  streakDays: number;
  unlockedBadgeIds: string[];
  downloads: Record<string, DownloadState>;
  ratings: Record<string, { stars: number; comment: string }>;
  toggleStep: (tutorialId: string, stepId: string) => boolean;
  startDownload: (tutorialId: string) => void;
  rateBox: (boxId: string, stars: number, comment: string) => void;
  unlockBadge: (badgeId: string) => void;
};

export const useProgressionStore = create<ProgressionState>((set, get) => ({
  stepsDone: {
    't-crochet-1': ['s1', 's2', 's3', 's4'],
    't-tricot-1': ['s1', 's2', 's3', 's4'],
    't-broderie-1': ['s1', 's2', 's3', 's4'],
    't-macrame-1': ['s1', 's2'],
  },
  xp: 1240,
  streakDays: 12,
  unlockedBadgeIds: ['premiere-creation', 'trois-tutos', 'serie-7'],
  downloads: {},
  ratings: {},

  toggleStep: (tutorialId, stepId) => {
    const tutorial = tutorialById(tutorialId);
    if (!tutorial) return false;

    const current = get().stepsDone[tutorialId] ?? [];
    const wasComplete = current.length === tutorial.steps.length;
    const next = current.includes(stepId)
      ? current.filter((id) => id !== stepId)
      : [...current, stepId];
    const isComplete = next.length === tutorial.steps.length;
    const justCompleted = isComplete && !wasComplete;

    set((state) => {
      const stepsDone = { ...state.stepsDone, [tutorialId]: next };
      let xp = state.xp;
      let unlockedBadgeIds = state.unlockedBadgeIds;

      if (justCompleted) {
        xp += tutorial.xp;
        const completedIds = Object.entries(stepsDone)
          .filter(([id, steps]) => {
            const t = tutorialById(id);
            return t && steps.length === t.steps.length;
          })
          .map(([id]) => id);

        const toUnlock: string[] = [];
        if (!unlockedBadgeIds.includes('premiere-creation')) toUnlock.push('premiere-creation');
        if (completedIds.length >= 3 && !unlockedBadgeIds.includes('trois-tutos'))
          toUnlock.push('trois-tutos');
        const themeIds = new Set(
          completedIds
            .map((id) => tutorialById(id))
            .filter(Boolean)
            .map((t) => themeById(boxById(t!.boxId)?.themeId ?? '').id),
        );
        if (themeIds.size >= 3 && !unlockedBadgeIds.includes('exploratrice'))
          toUnlock.push('exploratrice');
        if (toUnlock.length > 0) unlockedBadgeIds = [...unlockedBadgeIds, ...toUnlock];
      }

      return { stepsDone, xp, unlockedBadgeIds };
    });

    return justCompleted;
  },

  startDownload: (tutorialId) => {
    const existing = get().downloads[tutorialId];
    if (existing && existing.status !== 'idle') return;

    set((state) => ({
      downloads: {
        ...state.downloads,
        [tutorialId]: { status: 'downloading', progress: 0 },
      },
    }));

    const interval = setInterval(() => {
      const download = get().downloads[tutorialId];
      if (!download || download.status !== 'downloading') {
        clearInterval(interval);
        return;
      }
      const progress = Math.min(1, download.progress + 0.06 + Math.random() * 0.05);
      set((state) => ({
        downloads: {
          ...state.downloads,
          [tutorialId]: progress >= 1 ? { status: 'done', progress: 1 } : { status: 'downloading', progress },
        },
      }));
      if (progress >= 1) clearInterval(interval);
    }, 180);
  },

  rateBox: (boxId, stars, comment) => {
    set((state) => ({
      ratings: { ...state.ratings, [boxId]: { stars, comment } },
      xp: state.xp + 20,
      unlockedBadgeIds:
        stars === 5 && !state.unlockedBadgeIds.includes('perfectionniste')
          ? [...state.unlockedBadgeIds, 'perfectionniste']
          : state.unlockedBadgeIds,
    }));
  },

  unlockBadge: (badgeId) => {
    set((state) =>
      state.unlockedBadgeIds.includes(badgeId)
        ? state
        : { unlockedBadgeIds: [...state.unlockedBadgeIds, badgeId] },
    );
  },
}));

export function tutorialProgress(stepsDone: Record<string, string[]>, tutorialId: string) {
  const tutorial = tutorialById(tutorialId);
  if (!tutorial || tutorial.steps.length === 0) return 0;
  return (stepsDone[tutorialId]?.length ?? 0) / tutorial.steps.length;
}

export function boxCompletion(stepsDone: Record<string, string[]>, boxId: string) {
  const boxTutorials = tutorialsByBox(boxId);
  if (boxTutorials.length === 0) return 0;
  const total = boxTutorials.reduce((sum, t) => sum + tutorialProgress(stepsDone, t.id), 0);
  return total / boxTutorials.length;
}

export function completedTutorialsCount(stepsDone: Record<string, string[]>) {
  return Object.entries(stepsDone).filter(([id, steps]) => {
    const t = tutorialById(id);
    return t && steps.length === t.steps.length;
  }).length;
}

export { levelForXp, xpIntoLevel };
