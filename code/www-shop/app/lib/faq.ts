export interface FaqItem {
  answer: string;
  question: string;
}

export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    question: 'Qu’est-ce que My Hobbees ?',
    answer:
      'My Hobbees est une box créative surprise pensée pour t’aider à découvrir de nouvelles activités, apprendre à ton rythme et prendre du temps pour toi.',
  },
  {
    question: 'Que contient une box ?',
    answer:
      'Chaque box contient le matériel nécessaire pour réaliser un projet, les outils adaptés, un guide pas à pas et quelques surprises My Hobbees.',
  },
  {
    question: 'Est-ce adapté aux débutants ?',
    answer:
      'Oui. Les box sont pensées pour être accessibles, même si tu n’as jamais pratiqué l’activité proposée.',
  },
  {
    question: 'Est-ce que je connais l’activité avant de recevoir ma box ?',
    answer:
      'Tu choisis les univers créatifs qui t’attirent, puis nous préparons une activité surprise adaptée à tes envies.',
  },
  {
    question: 'À quelle fréquence vais-je recevoir une box ?',
    answer:
      'Le principe My Hobbees est de recevoir une nouvelle box créative chaque mois dans le cadre de l’abonnement.',
  },
  {
    question: 'Puis-je acheter une box sans abonnement ?',
    answer:
      'Certaines box pourront être proposées à l’unité dans une sélection de box populaires. Pour le MVP, My Hobbees fonctionne principalement autour de la box surprise.',
  },
  {
    question: 'Comment contacter My Hobbees ?',
    answer:
      'Tu peux nous contacter via notre page de contact ou à l’adresse e-mail indiquée sur la boutique.',
  },
];

/** A short, universally-relevant subset shown by `FaqSection` across marketing pages. */
export const FAQ_TEASER_ITEMS: readonly FaqItem[] = FAQ_ITEMS.slice(0, 3);
