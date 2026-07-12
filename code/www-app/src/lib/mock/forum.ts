import { daysAgo } from '@/lib/utils';

export type ForumAuthor = {
  name: string;
  avatarEmoji: string;
  avatarBackground: string;
};

export type ForumComment = {
  id: string;
  author: ForumAuthor;
  body: string;
  createdAt: string;
  likes: number;
  likedByMe: boolean;
  replies: ForumComment[];
};

export type Topic = {
  id: string;
  author: ForumAuthor;
  title: string;
  body: string;
  imageUri?: string;
  boxTagId: string;
  createdAt: string;
  likes: number;
  likedByMe: boolean;
  comments: ForumComment[];
};

const lea: ForumAuthor = { name: 'Léa R.', avatarEmoji: '🌸', avatarBackground: '#8E5AA8' };
const hugo: ForumAuthor = { name: 'Hugo T.', avatarEmoji: '🦊', avatarBackground: '#F2994A' };
const emma: ForumAuthor = { name: 'Emma D.', avatarEmoji: '🐝', avatarBackground: '#C4841D' };
const nathan: ForumAuthor = { name: 'Nathan R.', avatarEmoji: '🐳', avatarBackground: '#2D9CDB' };
const chloe: ForumAuthor = { name: 'Chloé P.', avatarEmoji: '🐱', avatarBackground: '#CD6581' };

export const initialTopics: Topic[] = [
  {
    id: 'topic-1',
    author: lea,
    title: 'Ma suspension murale terminée ! 🪢',
    body: 'Après deux soirées sur le motif chevron, la voilà accrochée au-dessus du canapé. Le peigne fourni dans la box fait toute la différence pour les franges.',
    boxTagId: 'macrame',
    createdAt: daysAgo(0, 3),
    likes: 24,
    likedByMe: false,
    comments: [
      {
        id: 'c-1-1',
        author: hugo,
        body: 'Superbe ! Tes torsades sont hyper régulières, tu as un secret ?',
        createdAt: daysAgo(0, 2),
        likes: 4,
        likedByMe: false,
        replies: [
          {
            id: 'c-1-1-r1',
            author: lea,
            body: 'Je compte à voix haute à chaque nœud 😄 et je serre toujours dans le même sens.',
            createdAt: daysAgo(0, 1),
            likes: 6,
            likedByMe: true,
            replies: [],
          },
        ],
      },
      {
        id: 'c-1-2',
        author: chloe,
        body: 'Elle rend super bien, bravo ! Hâte de finir la mienne.',
        createdAt: daysAgo(0, 1),
        likes: 2,
        likedByMe: false,
        replies: [],
      },
    ],
  },
  {
    id: 'topic-2',
    author: hugo,
    title: 'Astuce pour des nœuds plats bien serrés',
    body: 'Si vos rangées gondolent, fixez le bâton à hauteur des yeux et tirez les cordes porteuses vers le bas à chaque nœud. Changement radical chez moi.',
    boxTagId: 'macrame',
    createdAt: daysAgo(1, 5),
    likes: 18,
    likedByMe: true,
    comments: [
      {
        id: 'c-2-1',
        author: emma,
        body: 'Merci, ça marche vraiment mieux comme ça !',
        createdAt: daysAgo(1, 2),
        likes: 3,
        likedByMe: false,
        replies: [],
      },
    ],
  },
  {
    id: 'topic-3',
    author: emma,
    title: 'Mes grues en papier washi',
    body: 'La box origami de juin avec du papier acheté en plus : une guirlande de 20 grues pour la chambre de ma fille.',
    boxTagId: 'origami',
    createdAt: daysAgo(4),
    likes: 31,
    likedByMe: false,
    comments: [
      {
        id: 'c-3-1',
        author: nathan,
        body: 'La guirlande est magnifique. Le papier washi tient bien les plis ?',
        createdAt: daysAgo(3),
        likes: 1,
        likedByMe: false,
        replies: [
          {
            id: 'c-3-1-r1',
            author: emma,
            body: 'Oui, encore mieux que le papier de la box ! Il faut juste bien marquer les plis à l’ongle.',
            createdAt: daysAgo(3),
            likes: 2,
            likedByMe: false,
            replies: [],
          },
        ],
      },
    ],
  },
  {
    id: 'topic-4',
    author: nathan,
    title: 'Champ de lavande : avant / après',
    body: 'Premier tableau de ma vie avec la box d’avril. Le dégradé m’a fait transpirer mais le résultat vaut le coup.',
    boxTagId: 'peinture',
    createdAt: daysAgo(8),
    likes: 12,
    likedByMe: false,
    comments: [],
  },
  {
    id: 'topic-5',
    author: chloe,
    title: 'Quel fil pour continuer le crochet ?',
    body: 'J’ai adoré la box crochet de janvier et je veux enchaîner sur un plaid. Vous recommandez quelle épaisseur de fil pour rester sur le même crochet ?',
    boxTagId: 'crochet',
    createdAt: daysAgo(12),
    likes: 9,
    likedByMe: false,
    comments: [
      {
        id: 'c-5-1',
        author: lea,
        body: 'Un fil épaisseur 4 ou 5 passe très bien avec le crochet de la box !',
        createdAt: daysAgo(11),
        likes: 5,
        likedByMe: false,
        replies: [],
      },
      {
        id: 'c-5-2',
        author: hugo,
        body: 'Team coton recyclé, il glisse super bien.',
        createdAt: daysAgo(10),
        likes: 2,
        likedByMe: false,
        replies: [],
      },
    ],
  },
  {
    id: 'topic-6',
    author: lea,
    title: 'Bracelets heishi assortis mère-fille',
    body: 'La box bijoux nous a occupées tout un dimanche pluvieux. On a même customisé les fermoirs.',
    boxTagId: 'bijoux',
    createdAt: daysAgo(18),
    likes: 27,
    likedByMe: false,
    comments: [],
  },
  {
    id: 'topic-7',
    author: emma,
    title: 'Bouquet brodé encadré 🪡',
    body: 'La rose araignée m’a résisté mais le tuto pas-à-pas est très clair. Encadré et offert à ma grand-mère !',
    boxTagId: 'broderie',
    createdAt: daysAgo(25),
    likes: 15,
    likedByMe: false,
    comments: [],
  },
  {
    id: 'topic-8',
    author: nathan,
    title: 'L’écharpe nuage la plus douce du monde',
    body: 'Le point mousse c’est simple mais avec cette laine c’est un nuage. J’en refais une en gris.',
    boxTagId: 'tricot',
    createdAt: daysAgo(32),
    likes: 8,
    likedByMe: false,
    comments: [],
  },
];
