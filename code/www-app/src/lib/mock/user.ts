import { Difficulty } from '@/lib/mock/gamification';

export type PresetAvatar = {
  id: string;
  emoji: string;
  background: string;
};

export const presetAvatars: PresetAvatar[] = [
  { id: 'fox', emoji: '🦊', background: '#F2994A' },
  { id: 'cat', emoji: '🐱', background: '#CD6581' },
  { id: 'panda', emoji: '🐼', background: '#2F80ED' },
  { id: 'flower', emoji: '🌸', background: '#8E5AA8' },
  { id: 'bee', emoji: '🐝', background: '#C4841D' },
  { id: 'whale', emoji: '🐳', background: '#2D9CDB' },
];

export type UserProfile = {
  firstName: string;
  lastName: string;
  email: string;
  bio: string;
  avatarUri: string | null;
  presetAvatarId: string;
  difficulty: Difficulty;
};

export const initialProfile: UserProfile = {
  firstName: 'Camille',
  lastName: 'Martin',
  email: 'camille.martin@example.com',
  bio: 'Accro aux loisirs créatifs, une passion par mois ✨',
  avatarUri: null,
  presetAvatarId: 'cat',
  difficulty: 'niveau1',
};
