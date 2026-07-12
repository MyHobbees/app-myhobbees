import { Difficulty } from '@/lib/mock/gamification';

export type TutorialStep = {
  id: string;
  title: string;
  description: string;
};

export type Tutorial = {
  id: string;
  boxId: string;
  title: string;
  description: string;
  videoUrl: string;
  durationMin: number;
  xp: number;
  level: Difficulty;
  steps: TutorialStep[];
};

const sampleVideos = [
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_2MB.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://www.w3schools.com/html/mov_bbb.mp4',
];

let videoIndex = 0;
const videoByFile: Record<string, string> = {};

const video = (file: string) => {
  if (!videoByFile[file]) {
    videoByFile[file] = sampleVideos[videoIndex % sampleVideos.length];
    videoIndex += 1;
  }
  return videoByFile[file];
};

export const tutorials: Tutorial[] = [
  {
    id: 't-macrame-1',
    boxId: 'box-2026-07',
    title: 'Les nœuds de base',
    description: 'Nœud plat, nœud torsadé et nœud d’alouette : les trois fondations du macramé.',
    videoUrl: video('BigBuckBunny.mp4'),
    durationMin: 8,
    xp: 120,
    level: 'decouverte',
    steps: [
      { id: 's1', title: 'Préparer les cordes', description: 'Couper 8 cordes de 2,5 m et les fixer sur le support.' },
      { id: 's2', title: 'Nœud d’alouette', description: 'Fixer chaque corde au bâton avec un nœud d’alouette.' },
      { id: 's3', title: 'Nœud plat', description: 'Réaliser une rangée complète de nœuds plats.' },
      { id: 's4', title: 'Nœud torsadé', description: 'Enchaîner 10 nœuds pour obtenir la torsade.' },
    ],
  },
  {
    id: 't-macrame-2',
    boxId: 'box-2026-07',
    title: 'Le motif chevron',
    description: 'Créer le motif central de votre suspension avec des doubles nœuds plats.',
    videoUrl: video('ElephantsDream.mp4'),
    durationMin: 12,
    xp: 180,
    level: 'niveau1',
    steps: [
      { id: 's1', title: 'Diviser les cordes', description: 'Séparer les cordes en deux groupes égaux.' },
      { id: 's2', title: 'Diagonale gauche', description: 'Descendre en nœuds baguette vers la droite.' },
      { id: 's3', title: 'Diagonale droite', description: 'Symétrie : descendre vers la gauche.' },
      { id: 's4', title: 'Fermer le chevron', description: 'Relier les deux diagonales au centre.' },
      { id: 's5', title: 'Répéter le motif', description: 'Réaliser 3 chevrons complets.' },
    ],
  },
  {
    id: 't-macrame-3',
    boxId: 'box-2026-07',
    title: 'Finitions & franges',
    description: 'Égaliser, peigner et fixer votre suspension murale.',
    videoUrl: video('ForBiggerBlazes.mp4'),
    durationMin: 6,
    xp: 100,
    level: 'niveau1',
    steps: [
      { id: 's1', title: 'Couper les franges', description: 'Égaliser en pointe ou en ligne droite.' },
      { id: 's2', title: 'Peigner les cordes', description: 'Brosser les franges pour un effet vaporeux.' },
      { id: 's3', title: 'Accrocher', description: 'Fixer la suspension et admirer votre création.' },
    ],
  },
  {
    id: 't-crochet-1',
    boxId: 'box-2026-01',
    title: 'Granny square multicolore',
    description: 'Le carré granny classique en 4 tours, base de mille projets.',
    videoUrl: video('ForBiggerEscapes.mp4'),
    durationMin: 10,
    xp: 150,
    level: 'decouverte',
    steps: [
      { id: 's1', title: 'Cercle magique', description: 'Démarrer le carré avec un cercle magique.' },
      { id: 's2', title: 'Tour de brides', description: 'Premier tour : 4 groupes de 3 brides.' },
      { id: 's3', title: 'Changer de couleur', description: 'Joindre la deuxième pelote proprement.' },
      { id: 's4', title: 'Assembler', description: 'Rentrer les fils et bloquer le carré.' },
    ],
  },
  {
    id: 't-tricot-1',
    boxId: 'box-2026-02',
    title: 'Point mousse moelleux',
    description: 'Monter ses mailles et tricoter une écharpe toute douce.',
    videoUrl: video('ForBiggerFun.mp4'),
    durationMin: 14,
    xp: 150,
    level: 'decouverte',
    steps: [
      { id: 's1', title: 'Monter 30 mailles', description: 'Montage simple avec le pouce.' },
      { id: 's2', title: 'Rangs de point mousse', description: 'Tricoter tous les rangs à l’endroit.' },
      { id: 's3', title: 'Rabattre', description: 'Rabattre souplement les mailles.' },
      { id: 's4', title: 'Franges', description: 'Ajouter les franges aux extrémités.' },
    ],
  },
  {
    id: 't-broderie-1',
    boxId: 'box-2026-03',
    title: 'Points fleuris',
    description: 'Point de tige, point lancé et rose araignée pour un bouquet brodé.',
    videoUrl: video('ForBiggerJoyrides.mp4'),
    durationMin: 11,
    xp: 160,
    level: 'niveau1',
    steps: [
      { id: 's1', title: 'Transférer le motif', description: 'Décalquer le bouquet sur la toile.' },
      { id: 's2', title: 'Tiges et feuilles', description: 'Broder les tiges au point de tige.' },
      { id: 's3', title: 'Pétales', description: 'Remplir les fleurs au point lancé.' },
      { id: 's4', title: 'Rose araignée', description: 'La fleur signature en relief.' },
    ],
  },
  {
    id: 't-peinture-1',
    boxId: 'box-2026-04',
    title: 'Dégradés de lavande',
    description: 'Maîtriser les fondus de violets sur votre toile numérotée.',
    videoUrl: video('ForBiggerMeltdowns.mp4'),
    durationMin: 15,
    xp: 170,
    level: 'niveau1',
    steps: [
      { id: 's1', title: 'Préparer la palette', description: 'Organiser les pots par zones.' },
      { id: 's2', title: 'Fonds clairs', description: 'Peindre le ciel et les lointains.' },
      { id: 's3', title: 'Rangées de lavande', description: 'Travailler les violets du fond vers l’avant.' },
      { id: 's4', title: 'Détails et lumière', description: 'Rehauts clairs et signature.' },
    ],
  },
  {
    id: 't-bijoux-1',
    boxId: 'box-2026-05',
    title: 'Bracelet heishi',
    description: 'Composer un bracelet coloré en perles heishi et fermoir doré.',
    videoUrl: video('Sintel.mp4'),
    durationMin: 9,
    xp: 140,
    level: 'decouverte',
    steps: [
      { id: 's1', title: 'Composer le motif', description: 'Disposer les perles sur le plateau.' },
      { id: 's2', title: 'Enfiler', description: 'Monter les perles sur le fil élastique.' },
      { id: 's3', title: 'Nouer et sécuriser', description: 'Double nœud et point de colle.' },
    ],
  },
  {
    id: 't-origami-1',
    boxId: 'box-2026-06',
    title: 'La grue traditionnelle',
    description: 'Le pliage japonais emblématique, expliqué pas à pas.',
    videoUrl: video('TearsOfSteel.mp4'),
    durationMin: 7,
    xp: 130,
    level: 'decouverte',
    steps: [
      { id: 's1', title: 'Base préliminaire', description: 'Plis en vallée et en montagne.' },
      { id: 's2', title: 'Base de l’oiseau', description: 'Plis pétales des deux côtés.' },
      { id: 's3', title: 'Cou et queue', description: 'Plis inversés intérieurs.' },
      { id: 's4', title: 'Ailes et envol', description: 'Déployer les ailes en courbe.' },
    ],
  },
  {
    id: 't-macrame-4',
    boxId: 'box-2026-07',
    title: 'Porte-plante express',
    description: 'Un deuxième projet bonus avec les chutes de corde de votre box.',
    videoUrl: video('SubaruOutbackOnStreetAndDirt.mp4'),
    durationMin: 10,
    xp: 150,
    level: 'approfondissement',
    steps: [
      { id: 's1', title: 'Anneau de départ', description: 'Fixer 6 cordes sur l’anneau.' },
      { id: 's2', title: 'Torsades', description: 'Trois sections de nœuds torsadés.' },
      { id: 's3', title: 'Panier', description: 'Croiser les cordes pour former le panier.' },
      { id: 's4', title: 'Pompon final', description: 'Nœud de regroupement et pompon.' },
    ],
  },
];

export function tutorialById(id: string) {
  return tutorials.find((t) => t.id === id);
}

export function tutorialsByBox(boxId: string) {
  return tutorials.filter((t) => t.boxId === boxId);
}
