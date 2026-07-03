import {Suspense} from 'react';
import {Await, Link, useLoaderData} from 'react-router';
import type {Route} from './+types/_index';
import type {RecommendedProductsQuery} from 'storefrontapi.generated';
import {ProductItem} from '~/components/ProductItem';
import {MockShopNotice} from '~/components/MockShopNotice';
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

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

function loadCriticalData({context}: Route.LoaderArgs) {
  return {
    isMockShop: isMockShop(context.env.PUBLIC_STORE_DOMAIN),
  };
}

function loadDeferredData({context}: Route.LoaderArgs) {
  const recommendedProducts = context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY)
    .catch((error: Error) => {
      console.error(error);
      return null;
    });

  return {recommendedProducts};
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
      <MonthlyBox
        products={data.recommendedProducts}
        isMockShop={data.isMockShop}
      />
      <HowItWorks />
      <Reassurance />
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
          <Link className="button button-primary" to="/abonnements">
            Découvrir les abonnements
          </Link>
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
          <div className="hero-note">
            <span aria-hidden="true">✦</span>
            <strong>Une nouvelle surprise</strong>
            <small>à découvrir chaque mois</small>
          </div>
        </div>
      </div>
    </section>
  );
}

function MonthlyBox({
  products,
  isMockShop,
}: {
  products: Promise<RecommendedProductsQuery | null>;
  isMockShop: boolean;
}) {
  return (
    <section className="monthly-box" aria-labelledby="monthly-box-title">
      <div className="page-width monthly-box-grid">
        <div className="section-intro">
          <p className="eyebrow">La sélection My Hobbees</p>
          <h2 id="monthly-box-title">Découvre la box surprise du mois</h2>
          <p>
            Une box créative surprise, pensée pour te faire découvrir une
            nouvelle activité chaque mois.
          </p>
          <Link className="text-link" to="/abonnements">
            Comparer les abonnements <span aria-hidden="true">→</span>
          </Link>
        </div>
        <Suspense fallback={<ProductCardSkeleton />}>
          <Await resolve={products}>
            {(response) => {
              const product = response?.products.nodes[0];

              return product ? (
                <ProductItem
                  product={product}
                  featured
                  demo={isMockShop}
                  loading="eager"
                />
              ) : (
                <div className="empty-product-state">
                  <span aria-hidden="true">🐝</span>
                  <h3>La prochaine box se prépare</h3>
                  <p>Reviens bientôt pour découvrir la nouvelle surprise.</p>
                </div>
              );
            }}
          </Await>
        </Suspense>
      </div>
    </section>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="product-card-skeleton" aria-label="Chargement du produit">
      <div />
      <span />
      <span />
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      title: 'Choisis tes envies',
      description:
        'Indique les univers créatifs que tu aimerais découvrir.',
      icon: 'heart' as const,
    },
    {
      title: 'Reçois ta surprise',
      description: 'Nous préparons une box pensée pour te faire créer.',
      icon: 'box' as const,
    },
    {
      title: 'Crée à ton rythme',
      description:
        'Suis le guide, découvre et profite de ton moment créatif.',
      icon: 'sparkle' as const,
    },
  ];

  return (
    <section className="how-it-works" aria-labelledby="how-title">
      <div className="page-width">
        <div className="section-heading centered">
          <p className="eyebrow">Simple, doux et surprenant</p>
          <h2 id="how-title">Comment ça marche ?</h2>
        </div>
        <ol className="steps-grid">
          {steps.map((step, index) => (
            <li key={step.title} className="step-card">
              <span className="step-number">0{index + 1}</span>
              <span className="step-icon">
                <StepIcon type={step.icon} />
              </span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function StepIcon({type}: {type: 'heart' | 'box' | 'sparkle'}) {
  if (type === 'heart') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M20.8 5.7a5.2 5.2 0 0 0-7.4 0L12 7.1l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 21l8.8-7.9a5.2 5.2 0 0 0 0-7.4Z" />
      </svg>
    );
  }

  if (type === 'box') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="m4 7 8-4 8 4-8 4-8-4Z" />
        <path d="m4 7 8 4v10l-8-4V7Zm16 0-8 4v10l8-4V7Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 2c.5 5.5 2.5 7.5 8 8-5.5.5-7.5 2.5-8 8-.5-5.5-2.5-7.5-8-8 5.5-.5 7.5-2.5 8-8Z" />
      <path d="M19 16c.2 2.1.9 2.8 3 3-2.1.2-2.8.9-3 3-.2-2.1-.9-2.8-3-3 2.1-.2 2.8-.9 3-3Z" />
    </svg>
  );
}

function Reassurance() {
  const items = [
    {
      icon: '✓',
      title: 'Tout est inclus',
      description: 'Le matériel et le guide sont réunis dans ta box.',
    },
    {
      icon: '✦',
      title: 'Accessible aux débutants',
      description: 'Chaque activité est pensée pour se lancer sereinement.',
    },
    {
      icon: '↻',
      title: 'Une surprise chaque mois',
      description: 'Un nouvel univers créatif pour nourrir ta curiosité.',
    },
  ];

  return (
    <section className="reassurance" aria-label="Les avantages My Hobbees">
      <div className="page-width reassurance-grid">
        {items.map((item) => (
          <article key={item.title} className="reassurance-item">
            <span aria-hidden="true" className="reassurance-icon">
              {item.icon}
            </span>
            <div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 1, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
` as const;
