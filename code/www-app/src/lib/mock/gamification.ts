export type Difficulty = 'decouverte' | 'niveau1' | 'approfondissement';

export const DifficultyLabels: Record<Difficulty, string> = {
  decouverte: 'Découverte',
  niveau1: 'Niveau 1',
  approfondissement: 'Approfondissement',
};

export const DifficultyDescriptions: Record<Difficulty, string> = {
  decouverte: 'Idéal pour débuter en douceur, sans prérequis.',
  niveau1: 'Le rythme standard, pour progresser pas à pas.',
  approfondissement: 'Projets ambitieux et techniques avancées.',
};

export type BadgeDef = {
  id: string;
  emoji: string;
  title: string;
  description: string;
};

export const badges: BadgeDef[] = [
  { id: 'premiere-creation', emoji: '🌱', title: 'Première création', description: 'Terminer un premier tutoriel.' },
  { id: 'trois-tutos', emoji: '🎯', title: 'Sur ma lancée', description: 'Terminer 3 tutoriels.' },
  { id: 'membre-actif', emoji: '💬', title: 'Membre actif', description: 'Publier dans la communauté.' },
  { id: 'serie-7', emoji: '🔥', title: 'Série de 7 jours', description: '7 jours d’activité consécutifs.' },
  { id: 'exploratrice', emoji: '🧭', title: 'Exploratrice', description: 'Pratiquer 3 passions différentes.' },
  { id: 'perfectionniste', emoji: '🌟', title: 'Perfectionniste', description: 'Noter une box 5 étoiles.' },
];

export const LEVEL_STEP = 500;

export function levelForXp(xp: number) {
  return Math.floor(xp / LEVEL_STEP) + 1;
}

export function xpIntoLevel(xp: number) {
  return xp % LEVEL_STEP;
}
