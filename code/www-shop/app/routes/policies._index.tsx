import {useLoaderData, Link} from 'react-router';
import {ArrowRight} from 'lucide-react';
import type {Route} from './+types/policies._index';
import type {PoliciesQuery, PolicyItemFragment} from 'storefrontapi.generated';
import {EditorialHero} from '~/components/EditorialHero';

export async function loader({context}: Route.LoaderArgs) {
  const data: PoliciesQuery = await context.storefront.query(POLICIES_QUERY);

  const shopPolicies = data.shop;
  const policies: PolicyItemFragment[] = [
    shopPolicies?.privacyPolicy,
    shopPolicies?.shippingPolicy,
    shopPolicies?.termsOfService,
    shopPolicies?.refundPolicy,
    shopPolicies?.subscriptionPolicy,
  ].filter((policy): policy is PolicyItemFragment => policy != null);

  return {policies};
}

export default function Policies() {
  const {policies} = useLoaderData<typeof loader>();

  return (
    <article className="editorial-page policies-page" aria-labelledby="policies-title">
      <EditorialHero
        description="Retrouve les conditions générales, la politique de remboursement, de livraison et de confidentialité de la boutique My Hobbees."
        headingId="policies-title"
        title="Informations légales"
      />

      <section
        className="page-width policies-content"
        aria-labelledby="policies-list-title"
      >
        <h2 className="sr-only" id="policies-list-title">
          Politiques de la boutique
        </h2>
        {policies.length ? (
          <ul className="policy-list">
            {policies.map((policy) => (
              <li key={policy.id}>
                <Link className="policy-list-link" to={`/policies/${policy.handle}`}>
                  {policy.title}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="policies-empty">
            Les politiques de la boutique (conditions générales, remboursement,
            livraison, confidentialité) seront disponibles ici dès qu’elles
            seront renseignées dans Shopify.
          </p>
        )}
      </section>

      <section
        className="page-width notice-callout legal-notice"
        aria-labelledby="legal-notice-title"
      >
        <div className="inner">
          <h2 id="legal-notice-title">Mentions légales</h2>
          <p>
            Ces informations doivent être complétées avec les données réelles
            de l’entreprise avant la mise en ligne publique de la boutique.
          </p>
          <dl className="legal-notice-fields">
            <div>
              <dt>Éditeur du site</dt>
              <dd>
                [Raison sociale] — [Forme juridique] au capital de [Montant] €
                — SIRET [Numéro SIRET] — RCS [Ville] [Numéro RCS]
              </dd>
            </div>
            <div>
              <dt>Siège social</dt>
              <dd>[Adresse complète du siège social]</dd>
            </div>
            <div>
              <dt>Directeur de la publication</dt>
              <dd>[Nom du directeur de publication]</dd>
            </div>
            <div>
              <dt>Contact</dt>
              <dd>[Adresse e-mail de contact]</dd>
            </div>
            <div>
              <dt>Hébergement</dt>
              <dd>
                [Nom de l’hébergeur] — [Adresse de l’hébergeur] — [Contact de
                l’hébergeur]
              </dd>
            </div>
          </dl>
          <p className="notice-callout-secondary">
            Le contenu du site (textes, visuels, logo) est la propriété de My
            Hobbees, sauf mention contraire, et ne peut être reproduit sans
            autorisation préalable.
          </p>
        </div>
      </section>
    </article>
  );
}

const POLICIES_QUERY = `#graphql
  fragment PolicyItem on ShopPolicy {
    id
    title
    handle
  }
  query Policies ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    shop {
      privacyPolicy {
        ...PolicyItem
      }
      shippingPolicy {
        ...PolicyItem
      }
      termsOfService {
        ...PolicyItem
      }
      refundPolicy {
        ...PolicyItem
      }
      subscriptionPolicy {
        id
        title
        handle
      }
    }
  }
` as const;
