import {Link} from 'react-router';
import {Check, Minus} from 'lucide-react';
import type {Route} from './+types/abonnements';
import {EditorialHero} from '~/components/EditorialHero';
import {FaqSection} from '~/components/FaqSection';

export const meta: Route.MetaFunction = () => [
  {
    title:
      'Les abonnements My Hobbees \u2014 Box créative et application',
  },
  {
    name: 'description',
    content:
      'Choisis ton abonnement My Hobbees : une box créative surprise chaque mois, avec ou sans accès à l’application et à la communauté créative.',
  },
];

const PLANS = [
  {
    title: 'Parcours d’apprentissage',
    description:
      'Progresse à ton rythme grâce à l’application My Hobbees, sans recevoir de box physique.',
    features: [
      'Accès complet à l’application My Hobbees',
      'Tutoriels vidéo pas à pas',
      'Suivi de ta progression',
      'Accès à la communauté créative',
      'Défis et inspirations créatives chaque mois',
      'Contenus exclusifs liés à chaque activité',
    ],
    cta: 'Découvrir l’application',
    to: '/abonnements/app-only',
    featured: false,
  },
  {
    badge: 'Recommandé',
    title: 'Formule complète',
    description:
      'Reçois ta box créative surprise et profite de l’expérience My Hobbees complète dans l’application.',
    features: [
      'Tout ce qui est inclus dans la box créative',
      'Tutoriels vidéo pas à pas',
      'Suivi de ta progression',
      'Accès à la communauté',
      'Défis et inspirations créatives',
      'Contenus exclusifs liés à ton activité',
    ],
    cta: 'Profiter de l’expérience complète',
    to: '/abonnements/box-app',
    featured: true,
  },
  {
    title: 'Box créative surprise',
    description:
      'Reçois chaque mois une box surprise avec le matériel, les outils et le guide nécessaires pour découvrir une nouvelle activité créative.',
    features: [
      'Une activité créative surprise chaque mois',
      'Le matériel nécessaire',
      'Un guide pas à pas',
      'Des activités adaptées aux débutants',
      'Une petite surprise My Hobbees',
    ],
    cta: 'Découvrir nos boxes',
    to: '/abonnements/box-creative',
    featured: false,
  },
] as const;

const COMPARISON_ROWS = [
  ['Box créative chaque mois', false, true, true],
  ['Matériel inclus', false, true, true],
  ['Guide pas à pas', false, true, true],
  ['Tutoriels vidéo', true, true, false],
  ['Suivi de progression', true, true, false],
  ['Communauté My Hobbees', true, true, false],
  ['Défis créatifs', true, true, false],
  ['Contenus exclusifs', true, true, false],
] as const;

const STEPS = [
  'Tu choisis tes envies créatives.',
  'Nous préparons ta prochaine activité surprise.',
  'Tu crées à ton rythme, seul·e ou avec la communauté.',
] as const;

export default function SubscriptionsPage() {
  return (
    <article
      className="editorial-page subscriptions-page"
      aria-labelledby="subscriptions-title"
    >
      <EditorialHero
        description="Chaque mois, reçois une activité créative surprise pensée pour te faire découvrir, apprendre et prendre du temps pour toi."
        headingId="subscriptions-title"
        note="Sans pression, à ton rythme, avec tout le nécessaire pour créer."
        title="Choisis ta formule My Hobbees"
        tone="blush"
      />

      <section
        className="page-width subscriptions-plans-section"
        aria-labelledby="plans-title"
      >
        <h2 className="sr-only" id="plans-title">
          Les formules d’abonnement
        </h2>
        <div className="subscriptions-plans">
          {PLANS.map((plan) => (
            <article
              className={`subscription-plan${
                plan.featured ? ' subscription-plan--featured' : ''
              }`}
              key={plan.title}
            >
              {'badge' in plan ? (
                <div className="subscription-plan-heading">
                  <span className="product-badge">{plan.badge}</span>
                </div>
              ) : null}
              <h3>{plan.title}</h3>
              <p>{plan.description}</p>
              <ul className="subscription-feature-list">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                className={`button ${plan.featured ? 'button-primary' : 'button-secondary'}`}
                to={plan.to}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>
        <p className="subscriptions-app-note">
          L’accès à l’application My Hobbees sera activé avec ton abonnement
          lorsque la version mobile sera disponible.
        </p>
      </section>

      <section
        className="page-width subscription-comparison-section"
        aria-labelledby="comparison-title"
      >
        <div className="section-heading centered">
          <h2 id="comparison-title">Compare les formules</h2>
        </div>
        <div className="subscription-comparison-scroll">
          <table className="subscription-comparison">
            <thead>
              <tr>
                <th scope="col">Fonctionnalité</th>
                <th scope="col">Parcours d’apprentissage</th>
                <th scope="col">Formule complète</th>
                <th scope="col">Box créative surprise</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map(([feature, appOnly, complete, box]) => (
                <tr key={feature}>
                  <th scope="row">{feature}</th>
                  <Availability included={appOnly} />
                  <Availability included={complete} />
                  <Availability included={box} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="how-it-works" aria-labelledby="subscription-how-title">
        <div className="page-width">
          <div className="section-heading centered">
            <h2 id="subscription-how-title">Une surprise pensée pour toi</h2>
          </div>
          <ol className="steps-grid">
            {STEPS.map((step, index) => (
              <li className="step-card subscription-step" key={step}>
                <span className="step-number">0{index + 1}</span>
                <h3>{step}</h3>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="page-width future-boxes" aria-labelledby="future-boxes-title">
        <h2 id="future-boxes-title">Envie d’une box précise ?</h2>
        <p>
          Certaines créations pourront bientôt être disponibles à l’unité dans
          notre sélection de box populaires.
        </p>
        <button disabled type="button">
          Bientôt disponible
        </button>
      </section>

      <FaqSection />
    </article>
  );
}

function Availability({included}: {included: boolean}) {
  const Icon = included ? Check : Minus;

  return (
    <td>
      <span className={included ? 'is-included' : 'is-not-included'}>
        <Icon aria-hidden="true" />
        <span className="sr-only">{included ? 'Inclus' : 'Non inclus'}</span>
      </span>
    </td>
  );
}
