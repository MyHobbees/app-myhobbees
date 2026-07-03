import {Link} from 'react-router';
import type {Route} from './+types/faq';
import {EditorialHero} from '~/components/EditorialHero';

export const meta: Route.MetaFunction = () => [
  {title: 'FAQ \u2014 My Hobbees'},
  {
    name: 'description',
    content:
      'Retrouve les réponses aux questions fréquentes sur les box créatives surprise My Hobbees.',
  },
];

const FAQ_ITEMS = [
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
] as const;

export default function FaqPage() {
  return (
    <article className="editorial-page faq-page" aria-labelledby="faq-title">
      <EditorialHero
        description="Tout ce que tu dois savoir avant de recevoir ta box surprise."
        headingId="faq-title"
        title="Questions fréquentes"
      />

      <section className="page-width faq-content" aria-label="Réponses aux questions fréquentes">
        <div className="faq-list">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>

        <div className="faq-contact">
          <h2>Tu as encore une question ?</h2>
          <Link className="button button-secondary" to="/pages/contact">
            Nous contacter
          </Link>
        </div>
      </section>
    </article>
  );
}
