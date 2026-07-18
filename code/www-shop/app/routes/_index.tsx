import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/_index';
import {MockShopNotice} from '~/components/MockShopNotice';
import {Reassurance} from '~/components/Reassurance';
import {FaqSection} from '~/components/FaqSection';
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
            <button
              aria-label="Découvrir nos boxes (bientôt disponible)"
              className="button button-outline"
              disabled
              type="button"
            >
              Découvrir nos boxes
            </button>
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

function DreamSection() {
  const steps = [
    {
      title: 'Choisis tes envies',
      description: 'Indique les univers créatifs que tu aimerais découvrir.',
    },
    {
      title: 'Reçois ta surprise',
      description: 'Nous préparons une box pensée pour te faire créer.',
    },
    {
      title: 'Crée à ton rythme',
      description:
        'Suis le guide, découvre et profite de ton moment créatif.',
    },
  ];

  return (
    <section className="dream-section" aria-labelledby="dream-title">
      <div className="page-width">
        <div className="section-heading centered">
          <p className="eyebrow">Simple, doux et surprenant</p>
          <h2 id="dream-title">Le tout en un rêve !</h2>
          <p>
            Chaque box est pensée comme un petit moment à toi : tu choisis
            tes envies, on prépare la surprise, tu crées à ton rythme.
          </p>
        </div>
        <ol className="steps-grid">
          {steps.map((step, index) => (
            <li className="product-item dream-card" key={step.title}>
              <div className="product-item-media">
                <img alt="" decoding="async" loading="lazy" src={boxMyHobbees} />
              </div>
              <div className="product-item-content">
                <span className="step-number">0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
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
          <a className="button button-primary" href="#telecharger-app">
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
