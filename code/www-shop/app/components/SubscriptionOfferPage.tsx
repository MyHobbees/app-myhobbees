import {Link} from 'react-router';
import {Check} from 'lucide-react';
import {AccordionList} from '~/components/AccordionList';
import {Reassurance} from '~/components/Reassurance';
import {SUBSCRIPTION_OFFER_FAQ, type SubscriptionOffer} from '~/lib/subscriptionOffers';

/**
 * Shared presentation for a subscription formula. Both /abonnements/box-creative
 * and /abonnements/box-app render this with their own `SubscriptionOffer` data —
 * see app/lib/subscriptionOffers.ts. Once real Shopify products/selling plans
 * exist for these formulas, `offer.future` and `offer.price` are where that data
 * plugs in; the CTAs below are the only spots that would switch from the
 * "notify me" links to a real add-to-cart / checkout flow.
 */
export function SubscriptionOfferPage({offer}: {offer: SubscriptionOffer}) {
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

          {offer.price ? (
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

          <Link className="button button-primary" to="/pages/contact">
            {offer.finalCtaLabel}
          </Link>

          <p className="subscription-offer-note">{offer.reassurance}</p>
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

      <section
        className="page-width subscription-offer-faq"
        aria-labelledby="offer-faq-title"
      >
        <h2 className="sr-only" id="offer-faq-title">
          Questions fréquentes sur cette formule
        </h2>
        <AccordionList
          items={SUBSCRIPTION_OFFER_FAQ.map((item) => ({
            title: item.title,
            content: <p>{item.content}</p>,
          }))}
        />
      </section>

      <Reassurance />

      <section
        className="page-width subscription-offer-final-cta"
        aria-labelledby="offer-final-cta-title"
      >
        <div className="section-heading centered">
          <h2 id="offer-final-cta-title">Prochaine étape</h2>
          <p>
            Les vrais abonnements Shopify arrivent bientôt. En attendant, sois
            informé·e dès l’ouverture de cette formule.
          </p>
        </div>
        <div className="subscription-offer-final-actions">
          <Link className="button button-primary" to="/pages/contact">
            {offer.finalCtaLabel}
          </Link>
          <Link className="button button-outline" to="/abonnements">
            Comparer les formules
          </Link>
        </div>
      </section>
    </article>
  );
}
