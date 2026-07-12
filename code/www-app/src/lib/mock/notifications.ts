import { daysAgo } from '@/lib/utils';

export type NotificationType = 'expedition' | 'like' | 'reponse' | 'rappel';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

export const initialNotifications: AppNotification[] = [
  {
    id: 'n1',
    type: 'expedition',
    title: 'Votre box d’août est en préparation 📦',
    body: 'La box Aquarelle « Carnet de voyage » sera expédiée le 28 juillet.',
    createdAt: daysAgo(0, 2),
    read: false,
  },
  {
    id: 'n2',
    type: 'like',
    title: 'Léa R. a aimé votre commentaire',
    body: '« Je compte à voix haute à chaque nœud 😄 … »',
    createdAt: daysAgo(0, 5),
    read: false,
  },
  {
    id: 'n3',
    type: 'reponse',
    title: 'Hugo T. a répondu à votre sujet',
    body: '« Superbe ! Tes torsades sont hyper régulières… »',
    createdAt: daysAgo(1),
    read: false,
  },
  {
    id: 'n4',
    type: 'rappel',
    title: 'Votre suspension vous attend 🪢',
    body: 'Plus que 2 étapes sur « Le motif chevron ». On s’y remet ?',
    createdAt: daysAgo(2),
    read: true,
  },
  {
    id: 'n5',
    type: 'expedition',
    title: 'Box de juillet livrée 🎉',
    body: 'Votre box Macramé « Suspension murale bohème » est arrivée.',
    createdAt: daysAgo(10),
    read: true,
  },
  {
    id: 'n6',
    type: 'like',
    title: '3 personnes ont aimé votre sujet',
    body: '« Bracelets heishi assortis mère-fille »',
    createdAt: daysAgo(15),
    read: true,
  },
  {
    id: 'n7',
    type: 'rappel',
    title: 'Série de 12 jours 🔥',
    body: 'Continuez comme ça, le badge « Série de 7 jours » est déjà à vous !',
    createdAt: daysAgo(20),
    read: true,
  },
];
