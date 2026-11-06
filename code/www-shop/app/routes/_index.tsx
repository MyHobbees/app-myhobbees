import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/_index';
import {DreamStepIcon} from '~/components/DreamStepIcon';
import {MockShopNotice} from '~/components/MockShopNotice';
import {Reassurance} from '~/components/Reassurance';
import {FaqSection} from '~/components/FaqSection';
import {capture} from '~/lib/posthog';
import {isMockShop} from '~/lib/storefront';
import boxMyHobbees from '~/assets/box-my-hobbees.png';

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'My Hobbees - Découvre un nouveau hobby à ton rythme'},
    {
      name: 'description',
      content:
        'My Hobbees propose des box créatives surprise pour découvrir de nouvelles activités, apprendre à ton rythme et prendre du temps pour toi.',
    },
  ];
};

export async function loader({context}: Route.LoaderArgs) {
  return {
    isMockShop: isMockShop(context.env.PUBLIC_STORE_DOMAIN),
  };
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="home">
      {data.isMockShop ? (
        <div className="page-width mock-notice-wrapper">
          <MockShopNotice />
        </div>
      ) : null}
      <Hero />
      <DreamSection />
      <MissionSection />
      <AppPromoSection />
      <Reassurance />
      <FaqSection />
    </div>
  );
}

function Hero() {
  return (
    <section className="home-hero" aria-labelledby="hero-title">
      <div className="page-width hero-grid">
        <div className="hero-content">
          <p className="eyebrow">Ta parenthèse créative, livrée chez toi</p>
          <h1 id="hero-title">Découvre un nouveau hobby à ton rythme</h1>
          <p className="hero-description">
            Des box créatives clés en main pour t’inspirer, apprendre et
            prendre du temps pour toi.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/abonnements">
              Découvrir nos abonnements
            </Link>
            <Link className="button button-outline" to="/collections/all">
              Découvrir nos boxes
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <img
            alt="Box créative surprise My Hobbees"
            decoding="async"
            height="1254"
            loading="eager"
            src={boxMyHobbees}
            width="1254"
          />
        </div>
      </div>
    </section>
  );
}

const DREAM_STEPS = [
  {
    number: 1,
    title: 'Choisis tes envies',
    description: 'Indique les univers créatifs que tu aimerais découvrir.',
  },
  {
    number: 2,
    title: 'Reçois ta surprise',
    description: 'Nous préparons une box pensée pour te faire créer.',
  },
  {
    number: 3,
    title: 'Crée à ton rythme',
    description: 'Suis le guide, découvre et profite de ton moment créatif.',
  },
] as const;

function DreamSection() {
  return (
    <section className="dream-section" aria-labelledby="dream-title">
      <div className="dream-section-inner">
        <div className="section-heading centered">
          <p className="dream-eyebrow">Simple, doux et surprenant</p>
          <h2 className="dream-title" id="dream-title">
            Le tout en un rêve !
          </h2>
          <p className="dream-intro">
            Chaque box est pensée comme un petit moment à toi : tu choisis
            tes envies, on prépare la surprise, tu crées à ton rythme.
          </p>
        </div>
        <ol className="dream-steps">
          <svg
            aria-hidden="true"
            className="dream-steps-path"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 1104 200"
          >
            <path
              d="M184 140 C 340 -20, 420 -20, 552 110 S 780 240, 920 80"
              stroke="var(--color-dream-path)"
              strokeDasharray="2 10"
              strokeLinecap="round"
              strokeWidth="2.5"
            />
          </svg>
          {DREAM_STEPS.map((step) => (
            <li
              className={`dream-step dream-step--${step.number}`}
              key={step.number}
            >
              <span className="dream-step-circle">
                <span className="dream-step-badge">
                  <span className="dream-step-badge-inner">{step.number}</span>
                </span>
                <DreamStepIcon step={step.number} />
              </span>
              <h3 className="dream-step-title">{step.title}</h3>
              <p className="dream-step-text">{step.description}</p>
            </li>
          ))}
        </ol>
        <div className="dream-cta">
          <Link className="button button-primary" to="/abonnements">
            Découvrir nos abonnements
          </Link>
        </div>
      </div>
    </section>
  );
}

function MissionSection() {
  return (
    <section className="mission-section" aria-labelledby="mission-title">
      <div className="page-width section-heading centered">
        <h2 id="mission-title">Notre mission : t’aider à trouver ta passion</h2>
        <p>
          Nous croyons que la créativité se découvre en essayant, pas en
          cherchant le matériel parfait. My Hobbees prépare tout pour que tu
          puisses simplement commencer.
        </p>
        <Link className="button button-primary" to="/abonnements">
          Découvrir nos abonnements
        </Link>
      </div>
    </section>
  );
}

function AppPromoSection() {
  return (
    <section className="app-promo" aria-labelledby="app-promo-title">
      <div className="page-width app-promo-grid">
        <div className="app-promo-content">
          <h2 id="app-promo-title">
            Plus qu’une box, profite de tout un parcours !
          </h2>
          <p>
            L’application My Hobbees prolonge l’expérience avec des
            tutoriels vidéo, un suivi de ta progression et une communauté
            créative.
          </p>
          <a
            className="button button-primary"
            href="#telecharger-app"
            onClick={() => capture('app_click', {placement: 'home'})}
          >
            Télécharger l’app
          </a>
        </div>
        <div className="app-promo-visual" aria-hidden="true">
          <span>Aperçu de l’application à venir</span>
        </div>
      </div>
    </section>
  );
}
