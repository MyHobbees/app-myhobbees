import {Suspense} from 'react';
import {Await, NavLink} from 'react-router';
import type {FooterQuery, HeaderQuery} from 'storefrontapi.generated';
import {getMenuItemUrl} from '~/lib/menu';
import {shouldUseFallbackMenu} from '~/lib/storefront';

interface FooterProps {
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  publicStoreDomain: string;
}

export function Footer({
  footer: footerPromise,
  header,
  publicStoreDomain,
}: FooterProps) {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <section className="footer-brand" aria-labelledby="footer-brand-title">
          <p className="footer-eyebrow">La créativité en box</p>
          <h2 id="footer-brand-title">My Hobbees</h2>
          <p>
            Des moments créatifs clés en main pour découvrir, apprendre et
            prendre du temps pour soi.
          </p>
        </section>

        <section
          className="footer-newsletter"
          aria-labelledby="newsletter-title"
        >
          <h2 id="newsletter-title">Rejoins la ruche !</h2>
          <p>
            Reçois nos idées créatives, nouveautés et surprises directement
            dans ta boîte mail.
          </p>
          <form className="newsletter-form" aria-describedby="newsletter-note">
            <label className="sr-only" htmlFor="newsletter-email">
              Adresse e-mail
            </label>
            <input
              autoComplete="email"
              id="newsletter-email"
              name="email"
              placeholder="ton@email.fr"
              type="email"
              disabled
            />
            <button type="submit" disabled>
              Je m’inscris
            </button>
          </form>
          <p className="newsletter-note" id="newsletter-note">
            L’inscription sera bientôt disponible.
          </p>
        </section>

        <section className="footer-links" aria-labelledby="footer-links-title">
          <h2 id="footer-links-title">Informations</h2>
          <Suspense
            fallback={
              <FooterMenu
                menu={null}
                primaryDomainUrl={header.shop.primaryDomain.url}
                publicStoreDomain={publicStoreDomain}
              />
            }
          >
            <Await resolve={footerPromise}>
              {(footer) => (
                <FooterMenu
                  menu={footer?.menu}
                  primaryDomainUrl={header.shop.primaryDomain.url}
                  publicStoreDomain={publicStoreDomain}
                />
              )}
            </Await>
          </Suspense>
        </section>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} My Hobbees</p>
        <p>Imaginé avec soin pour tes moments créatifs.</p>
      </div>
    </footer>
  );
}

function FooterMenu({
  menu,
  primaryDomainUrl,
  publicStoreDomain,
}: {
  menu: FooterQuery['menu'] | null | undefined;
  primaryDomainUrl: FooterProps['header']['shop']['primaryDomain']['url'];
  publicStoreDomain: string;
}) {
  const useFallbackMenu = shouldUseFallbackMenu(
    publicStoreDomain,
    menu?.items.length ?? 0,
  );
  const items = useFallbackMenu
    ? FALLBACK_FOOTER_MENU.items
    : (menu?.items ?? FALLBACK_FOOTER_MENU.items);

  return (
    <nav className="footer-menu" aria-label="Informations légales">
      {items.map((item) => {
        if (!item.url) return null;

        const url = getMenuItemUrl(
          item.url,
          primaryDomainUrl,
          publicStoreDomain,
        );
        const isExternal = !url.startsWith('/');

        return isExternal ? (
          <a href={url} key={item.id} rel="noopener noreferrer" target="_blank">
            {getFooterItemTitle(item.title)}
          </a>
        ) : (
          <NavLink end key={item.id} prefetch="intent" to={url}>
            {getFooterItemTitle(item.title)}
          </NavLink>
        );
      })}
    </nav>
  );
}

const FOOTER_TITLE_TRANSLATIONS: Record<string, string> = {
  'Privacy Policy': 'Politique de confidentialité',
  'Refund Policy': 'Politique de remboursement',
  'Shipping Policy': 'Politique de livraison',
  'Terms of Service': 'Conditions générales',
};

function getFooterItemTitle(title: string) {
  return FOOTER_TITLE_TRANSLATIONS[title] ?? title;
}

const FALLBACK_FOOTER_MENU = {
  id: 'my-hobbees-fallback-footer',
  items: [
    {
      id: 'fallback-home',
      resourceId: null,
      tags: [],
      title: 'Accueil',
      type: 'HTTP',
      url: '/',
      items: [],
    },
    {
      id: 'fallback-subscriptions',
      resourceId: null,
      tags: [],
      title: 'Les abonnements',
      type: 'HTTP',
      url: '/abonnements',
      items: [],
    },
    {
      id: 'fallback-about',
      resourceId: null,
      tags: [],
      title: 'Qui sommes-nous ?',
      type: 'HTTP',
      url: '/qui-sommes-nous',
      items: [],
    },
    {
      id: 'fallback-faq',
      resourceId: null,
      tags: [],
      title: 'FAQ',
      type: 'HTTP',
      url: '/faq',
      items: [],
    },
    {
      id: 'fallback-privacy',
      resourceId: null,
      tags: [],
      title: 'Politique de confidentialité',
      type: 'SHOP_POLICY',
      url: '/policies/privacy-policy',
      items: [],
    },
    {
      id: 'fallback-refund',
      resourceId: null,
      tags: [],
      title: 'Politique de remboursement',
      type: 'SHOP_POLICY',
      url: '/policies/refund-policy',
      items: [],
    },
    {
      id: 'fallback-shipping',
      resourceId: null,
      tags: [],
      title: 'Politique de livraison',
      type: 'SHOP_POLICY',
      url: '/policies/shipping-policy',
      items: [],
    },
    {
      id: 'fallback-terms',
      resourceId: null,
      tags: [],
      title: 'Conditions générales',
      type: 'SHOP_POLICY',
      url: '/policies/terms-of-service',
      items: [],
    },
  ],
};
