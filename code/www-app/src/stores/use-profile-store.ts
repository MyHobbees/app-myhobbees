import { create } from 'zustand';

import { Difficulty } from '@/lib/mock/gamification';
import { initialProfile, type UserProfile } from '@/lib/mock/user';

type ProfileState = UserProfile & {
  updateInfo: (partial: Partial<Pick<UserProfile, 'firstName' | 'lastName' | 'email' | 'bio'>>) => void;
  setAvatarUri: (uri: string) => void;
  setPresetAvatar: (presetId: string) => void;
  setDifficulty: (difficulty: Difficulty) => void;
};

export const useProfileStore = create<ProfileState>((set) => ({
  ...initialProfile,

  updateInfo: (partial) => set(partial),
  setAvatarUri: (uri) => set({ avatarUri: uri }),
  setPresetAvatar: (presetId) => set({ presetAvatarId: presetId, avatarUri: null }),
  setDifficulty: (difficulty) => set({ difficulty }),
}));
