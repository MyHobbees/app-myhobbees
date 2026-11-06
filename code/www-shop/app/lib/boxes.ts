export type BoxSlug = 'crochet' | 'couture' | 'peinture';

export interface Box {
  included: readonly string[];
  slug: BoxSlug;
  tagline: string;
  title: string;
}

export const BOXES: Record<BoxSlug, Box> = {
  crochet: {
    slug: 'crochet',
    title: 'Box Crochet',
    tagline:
      'Apprends les bases du crochet et réalise ta première pièce, pas à pas.',
    included: [
      'Une pelote de laine adaptée au projet',
      'Un crochet à la bonne taille',
      'Un patron pensé pour les débutants',
      'Un guide pas à pas illustré',
    ],
  },
  couture: {
    slug: 'couture',
    title: 'Box Couture',
    tagline:
      'Découvre la couture à la main avec un projet simple et entièrement guidé.',
    included: [
      'Un tissu sélectionné pour le projet',
      'Fil, aiguilles et épingles',
      'Un patron prêt à l’emploi',
      'Un guide pas à pas illustré',
    ],
  },
  peinture: {
    slug: 'peinture',
    title: 'Box Peinture',
    tagline:
      'Initie-toi à la peinture avec le matériel et les conseils pour oser ta première toile.',
    included: [
      'Une toile adaptée au projet',
      'Un jeu de peintures et de pinceaux',
      'Une palette et ses accessoires',
      'Un guide pas à pas illustré',
    ],
  },
};
