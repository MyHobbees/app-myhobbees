import {Link} from 'react-router';
import {Money} from '@shopify/hydrogen';
import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';
import {Check} from 'lucide-react';
import {AddToCartButton} from '~/components/AddToCartButton';
import {useAside} from '~/components/Aside';
import {FaqSection} from '~/components/FaqSection';
import {Reassurance} from '~/components/Reassurance';
import type {SubscriptionOffer} from '~/lib/subscriptionOffers';
import {getSubscriptionCtaLabel} from '~/lib/subscriptions';

export interface SubscriptionOfferPurchase {
  available: boolean;
  merchandiseId: string;
  price: Pick<MoneyV2, 'amount' | 'currencyCode'>;
  sellingPlanId: string | null;
}

/**
 * Shared presentation for a subscription formula. Both /abonnements/box-creative
 * and /abonnements/box-app render this with their own `SubscriptionOffer` data —
 * see app/lib/subscriptionOffers.ts. When a real Shopify product/selling plan is
 * wired to the offer (`offer.future`), the route loader passes `purchase` and the
 * price + CTAs switch from the "notify me" links to a real add-to-cart flow.
 */
export function SubscriptionOfferPage({
  offer,
  purchase = null,
}: {
  offer: SubscriptionOffer;
  purchase?: SubscriptionOfferPurchase | null;
}) {
  return (
    <article
      className="editorial-page subscription-offer-page"
      aria-labelledby="offer-title"
    >
      <div className="product subscription-offer-hero">
        <div className="product-image subscription-offer-media">
          <img
            alt={offer.media.alt}
            decoding="async"
            loading="eager"
            src={offer.media.src}
          />
        </div>
        <div className="product-main">
          <div className="subscription-plan-heading">
            <span className="product-badge">{offer.badge}</span>
            {offer.label ? (
              <span className="subscription-plan-label">{offer.label}</span>
            ) : null}
          </div>
          <h1 id="offer-title">{offer.title}</h1>
          <p className="subscription-offer-tagline">{offer.tagline}</p>

          {purchase ? (
            <p className="subscription-offer-price">
              <Money as="span" data={purchase.price} /> par mois
            </p>
          ) : offer.price ? (
            <p className="subscription-offer-price">
              {offer.price.amount} {offer.price.currencyCode}{' '}
              {offer.price.intervalLabel}
            </p>
          ) : (
            <p className="subscription-offer-price subscription-offer-price--pending">
              Tarif bientôt disponible
            </p>
          )}

          <p className="subscription-offer-cadence">{offer.cadence}</p>

          <OfferCta offer={offer} purchase={purchase} />

          <p className="subscription-offer-note">
            {purchase
              ? 'Paiement sécurisé via le checkout Shopify. Une box créative livrée chaque mois.'
              : offer.reassurance}
          </p>
        </div>
      </div>

      <section
        className="page-width subscription-offer-included"
        aria-labelledby="offer-included-title"
      >
        <h2 id="offer-included-title">Ce qui est inclus</h2>
        <ul className="subscription-feature-list">
          {offer.included.map((item) => (
            <li key={item}>
              <Check aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {offer.editorial ? (
        <section className="page-width editorial-section subscription-offer-editorial">
          <div className="editorial-copy">
            <h2>{offer.editorial.title}</h2>
            <p>{offer.editorial.description}</p>
          </div>
        </section>
      ) : null}

      {offer.appExperience ? (
        <section
          className="page-width subscription-offer-app"
          aria-labelledby="offer-app-title"
        >
          <div className="section-heading centered">
            <h2 id="offer-app-title">{offer.appExperience.title}</h2>
          </div>
          <ul className="steps-grid subscription-offer-app-grid">
            {offer.appExperience.features.map((feature) => (
              <li className="step-card about-value-card" key={feature.title}>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </li>
            ))}
          </ul>
          <p className="subscription-offer-disclaimer">
            {offer.appExperience.disclaimer}
          </p>
        </section>
      ) : null}

      <Reassurance />

      <section
        className="page-width subscription-offer-final-cta"
        aria-labelledby="offer-final-cta-title"
      >
        <div className="section-heading centered">
          <h2 id="offer-final-cta-title">Prochaine étape</h2>
          <p>
            {purchase
              ? 'Choisis ta formule et reçois ta première box créative surprise chez toi.'
              : 'Les vrais abonnements Shopify arrivent bientôt. En attendant, sois informé·e dès l’ouverture de cette formule.'}
          </p>
        </div>
        <div className="subscription-offer-final-actions">
          <OfferCta offer={offer} purchase={purchase} />
          <Link className="button button-outline" to="/abonnements">
            Comparer les formules
          </Link>
        </div>
      </section>

      <FaqSection />
    </article>
  );
}

function OfferCta({
  offer,
  purchase,
}: {
  offer: SubscriptionOffer;
  purchase: SubscriptionOfferPurchase | null;
}) {
  const {open} = useAside();

  if (!purchase) {
    return (
      <Link className="button button-primary" to="/pages/contact">
        {offer.finalCtaLabel}
      </Link>
    );
  }

  return (
    <AddToCartButton
      className="button button-primary"
      disabled={!purchase.available}
      lines={[
        {
          merchandiseId: purchase.merchandiseId,
          quantity: 1,
          sellingPlanId: purchase.sellingPlanId ?? undefined,
        },
      ]}
      onClick={() => {
        open('cart');
      }}
    >
      {purchase.available
        ? getSubscriptionCtaLabel(offer.future.subscriptionKind)
        : 'Épuisé'}
    </AddToCartButton>
  );
}
