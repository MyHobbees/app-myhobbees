import {Suspense} from 'react';
import {Await, Link, useLoaderData} from 'react-router';
import {
  ArrowRight,
  BadgeCheck,
  Heart,
  PackageCheck,
  PackageOpen,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
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
            <span aria-hidden="true">
              <Sparkles />
            </span>
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
            Comparer les abonnements <ArrowRight aria-hidden="true" />
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
                  <PackageOpen aria-hidden="true" />
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
      Icon: Heart,
    },
    {
      title: 'Reçois ta surprise',
      description: 'Nous préparons une box pensée pour te faire créer.',
      Icon: PackageOpen,
    },
    {
      title: 'Crée à ton rythme',
      description:
        'Suis le guide, découvre et profite de ton moment créatif.',
      Icon: Sparkles,
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
          {steps.map(({description, Icon, title}, index) => (
            <li key={title} className="step-card">
              <span className="step-number">0{index + 1}</span>
              <span className="step-icon">
                <Icon aria-hidden="true" />
              </span>
              <h3>{title}</h3>
              <p>{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Reassurance() {
  const items = [
    {
      Icon: PackageCheck,
      title: 'Tout est inclus',
      description: 'Le matériel et le guide sont réunis dans ta box.',
    },
    {
      Icon: BadgeCheck,
      title: 'Accessible aux débutants',
      description: 'Chaque activité est pensée pour se lancer sereinement.',
    },
    {
      Icon: RefreshCw,
      title: 'Une surprise chaque mois',
      description: 'Un nouvel univers créatif pour nourrir ta curiosité.',
    },
  ];

  return (
    <section className="reassurance" aria-label="Les avantages My Hobbees">
      <div className="page-width reassurance-grid">
        {items.map(({description, Icon, title}) => (
          <article key={title} className="reassurance-item">
            <span aria-hidden="true" className="reassurance-icon">
              <Icon />
            </span>
            <div>
              <h3>{title}</h3>
              <p>{description}</p>
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
