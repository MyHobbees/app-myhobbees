export type BoxStatus = 'past' | 'current' | 'next';

export type Box = {
  id: string;
  themeId: string;
  monthLabel: string;
  title: string;
  status: BoxStatus;
  tutorialIds: string[];
};

export const boxes: Box[] = [
  {
    id: 'box-2026-01',
    themeId: 'crochet',
    monthLabel: 'Janvier 2026',
    title: 'Granny squares vitaminés',
    status: 'past',
    tutorialIds: ['t-crochet-1'],
  },
  {
    id: 'box-2026-02',
    themeId: 'tricot',
    monthLabel: 'Février 2026',
    title: 'Écharpe nuage',
    status: 'past',
    tutorialIds: ['t-tricot-1'],
  },
  {
    id: 'box-2026-03',
    themeId: 'broderie',
    monthLabel: 'Mars 2026',
    title: 'Bouquet brodé',
    status: 'past',
    tutorialIds: ['t-broderie-1'],
  },
  {
    id: 'box-2026-04',
    themeId: 'peinture',
    monthLabel: 'Avril 2026',
    title: 'Champ de lavande',
    status: 'past',
    tutorialIds: ['t-peinture-1'],
  },
  {
    id: 'box-2026-05',
    themeId: 'bijoux',
    monthLabel: 'Mai 2026',
    title: 'Perles d’été',
    status: 'past',
    tutorialIds: ['t-bijoux-1'],
  },
  {
    id: 'box-2026-06',
    themeId: 'origami',
    monthLabel: 'Juin 2026',
    title: 'Envolée de grues',
    status: 'past',
    tutorialIds: ['t-origami-1'],
  },
  {
    id: 'box-2026-07',
    themeId: 'macrame',
    monthLabel: 'Juillet 2026',
    title: 'Suspension murale bohème',
    status: 'current',
    tutorialIds: ['t-macrame-1', 't-macrame-2', 't-macrame-3'],
  },
  {
    id: 'box-2026-08',
    themeId: 'aquarelle',
    monthLabel: 'Août 2026',
    title: 'Carnet de voyage',
    status: 'next',
    tutorialIds: [],
  },
];

export const currentBox = boxes.find((b) => b.status === 'current')!;
export const nextBox = boxes.find((b) => b.status === 'next')!;
export const pastBoxes = boxes.filter((b) => b.status === 'past').reverse();

export function boxById(id: string) {
  return boxes.find((b) => b.id === id);
}
