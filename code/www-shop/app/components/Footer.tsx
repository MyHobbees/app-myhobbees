import {Suspense} from 'react';
import {Await, NavLink} from 'react-router';
import {Mail} from 'lucide-react';
import type {FooterQuery, HeaderQuery} from 'storefrontapi.generated';
import {getMenuItemUrl} from '~/lib/menu';
import {shouldUseFallbackMenu} from '~/lib/storefront';

interface FooterProps {
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  publicStoreDomain: string;
}

type FooterMenuProps = {
  menu: FooterQuery['menu'] | null | undefined;
  primaryDomainUrl: FooterProps['header']['shop']['primaryDomain']['url'];
  publicStoreDomain: string;
};

export function Footer({
  footer: footerPromise,
  header,
  publicStoreDomain,
}: FooterProps) {
  return (
    <footer className="footer">
      <div className="footer-newsletter-band">
        <div className="footer-newsletter-inner">
          <div className="footer-band-columns">
            <section
              className="footer-app-download"
              aria-labelledby="footer-app-title"
            >
              <h2 id="footer-app-title">Télécharge l’application</h2>
              <p>
                Profite de tous les tutoriels associés à nos boxes en
                téléchargeant l’application !
              </p>
              <a className="button button-primary" href="#telecharger-app">
                Télécharger l’app
              </a>
            </section>

            <section
              className="footer-newsletter"
              aria-labelledby="newsletter-title"
            >
              <h2 id="newsletter-title">Rejoins la ruche !</h2>
              <p>
                Inscris toi à notre newsletter pour ne rater aucune nouveauté,
                promos, etc.
              </p>
              <form
                className="newsletter-form"
                aria-describedby="newsletter-note"
              >
                <label className="sr-only" htmlFor="newsletter-email">
                  Adresse e-mail
                </label>
                <input
                  autoComplete="email"
                  id="newsletter-email"
                  name="email"
                  placeholder="email@exemple.fr"
                  type="email"
                  disabled
                />
                <button type="submit" disabled>
                  Je m’inscris
                </button>
              </form>
              <p className="sr-only" id="newsletter-note">
                L’inscription sera bientôt disponible.
              </p>
            </section>
          </div>
          <ul className="footer-socials" aria-label="Réseaux sociaux">
            <li>
              <button
                type="button"
                className="footer-social-link"
                disabled
                aria-label="Instagram (bientôt disponible)"
              >
                <InstagramIcon />
              </button>
            </li>
            <li>
              <button
                type="button"
                className="footer-social-link"
                disabled
                aria-label="Pinterest (bientôt disponible)"
              >
                <PinterestIcon />
              </button>
            </li>
            <li>
              <button
                type="button"
                className="footer-social-link"
                disabled
                aria-label="Facebook (bientôt disponible)"
              >
                <FacebookIcon />
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-main">
        <div className="footer-main-inner">
          <section
            className="footer-sitemap"
            aria-labelledby="footer-sitemap-title"
          >
            <h2 id="footer-sitemap-title">Plan du site</h2>
            <Suspense
              fallback={
                <FooterSiteMenu
                  menu={null}
                  primaryDomainUrl={header.shop.primaryDomain.url}
                  publicStoreDomain={publicStoreDomain}
                />
              }
            >
              <Await resolve={footerPromise}>
                {(footer) => (
                  <FooterSiteMenu
                    menu={footer?.menu}
                    primaryDomainUrl={header.shop.primaryDomain.url}
                    publicStoreDomain={publicStoreDomain}
                  />
                )}
              </Await>
            </Suspense>
          </section>

          <section
            className="footer-contact"
            aria-labelledby="footer-contact-title"
          >
            <h2 id="footer-contact-title">Nous contacter</h2>
            <p>
              Une question ? Envie de devenir partenaires ?
              <br />
              Envoie nous un mail :
            </p>
            <a
              className="footer-contact-email"
              href="mailto:myhobbees@gmail.com"
            >
              <Mail aria-hidden="true" />
              myhobbees@gmail.com
            </a>
          </section>
        </div>

        <Suspense
          fallback={
            <FooterLegalMenu
              menu={null}
              primaryDomainUrl={header.shop.primaryDomain.url}
              publicStoreDomain={publicStoreDomain}
            />
          }
        >
          <Await resolve={footerPromise}>
            {(footer) => (
              <FooterLegalMenu
                menu={footer?.menu}
                primaryDomainUrl={header.shop.primaryDomain.url}
                publicStoreDomain={publicStoreDomain}
              />
            )}
          </Await>
        </Suspense>

        <p className="footer-copyright">
          © {new Date().getFullYear()} My Hobbees. Tous droits réservés
        </p>
      </div>
    </footer>
  );
}

function FooterSiteMenu({menu, primaryDomainUrl, publicStoreDomain}: FooterMenuProps) {
  const useFallbackMenu = shouldUseFallbackMenu(
    publicStoreDomain,
    menu?.items.length ?? 0,
  );
  const items = useFallbackMenu
    ? FALLBACK_SITE_MENU.items
    : (menu?.items.filter((item) => item.type !== 'SHOP_POLICY') ??
      FALLBACK_SITE_MENU.items);

  return (
    <nav className="footer-menu" aria-label="Plan du site">
      {items.map((item) => (
        <FooterLink
          key={item.id}
          item={item}
          primaryDomainUrl={primaryDomainUrl}
          publicStoreDomain={publicStoreDomain}
        />
      ))}
    </nav>
  );
}

function FooterLegalMenu({menu, primaryDomainUrl, publicStoreDomain}: FooterMenuProps) {
  const useFallbackMenu = shouldUseFallbackMenu(
    publicStoreDomain,
    menu?.items.length ?? 0,
  );
  // Privacy Policy is excluded here: it's a distinct document from the
  // French "mentions légales" notice, which isn't a Shopify policy type and
  // is instead a static page at /policies (see policies._index.tsx).
  const items = useFallbackMenu
    ? FALLBACK_LEGAL_MENU.items
    : (menu?.items.filter(
        (item) => item.type === 'SHOP_POLICY' && item.title !== 'Privacy Policy',
      ) ?? FALLBACK_LEGAL_MENU.items);

  return (
    <nav className="footer-legal" aria-label="Informations légales">
      {items.map((item) => (
        <FooterLink
          key={item.id}
          item={item}
          primaryDomainUrl={primaryDomainUrl}
          publicStoreDomain={publicStoreDomain}
        />
      ))}
      <NavLink end prefetch="intent" to="/policies">
        Mentions légales
      </NavLink>
    </nav>
  );
}

function FooterLink({
  item,
  primaryDomainUrl,
  publicStoreDomain,
}: {
  item: {id: string; title: string; url?: string | null};
  primaryDomainUrl: FooterProps['header']['shop']['primaryDomain']['url'];
  publicStoreDomain: string;
}) {
  if (!item.url) return null;

  const url = getMenuItemUrl(item.url, primaryDomainUrl, publicStoreDomain);
  const isExternal = !url.startsWith('/');

  return isExternal ? (
    <a href={url} rel="noopener noreferrer" target="_blank">
      {getFooterItemTitle(item.title)}
    </a>
  ) : (
    <NavLink end prefetch="intent" to={url}>
      {getFooterItemTitle(item.title)}
    </NavLink>
  );
}

const FOOTER_TITLE_TRANSLATIONS: Record<string, string> = {
  'Privacy Policy': 'Politique de confidentialité',
  'Refund Policy': 'Politique de remboursement',
  'Shipping Policy': 'Politique de livraison',
  'Terms of Service': 'CGU',
};

function getFooterItemTitle(title: string) {
  return FOOTER_TITLE_TRANSLATIONS[title] ?? title;
}

const FALLBACK_SITE_MENU = {
  id: 'my-hobbees-fallback-footer-site',
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
      title: 'Nos abonnements',
      type: 'HTTP',
      url: '/abonnements',
      items: [],
    },
    {
      id: 'fallback-boxes',
      resourceId: null,
      tags: [],
      title: 'Nos boxes',
      type: 'HTTP',
      url: '/collections/all',
      items: [],
    },
    {
      id: 'fallback-about',
      resourceId: null,
      tags: [],
      title: 'Qui sommes-nous',
      type: 'HTTP',
      url: '/qui-sommes-nous',
      items: [],
    },
  ],
};

const FALLBACK_LEGAL_MENU = {
  id: 'my-hobbees-fallback-footer-legal',
  items: [
    {
      id: 'fallback-terms',
      resourceId: null,
      tags: [],
      title: 'CGU',
      type: 'SHOP_POLICY',
      url: '/policies/terms-of-service',
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
  ],
};

/* Lucide doesn't ship brand marks, so these three social glyphs are
   hand-drawn to match the app's lucide stroke style (24px, round caps). */
function InstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PinterestIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 20c.6-2.3 1.7-6.7 1.7-6.7" />
      <path d="M11.2 13.3a2.5 2.5 0 0 0 2.6 1.5c2 0 3.4-1.9 3.4-4.5a4.4 4.4 0 0 0-4.6-4.4A4.7 4.7 0 0 0 7.9 10.4c0 1.4.6 2.6 1.7 3.1" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15.5 21v-8h2.4l.4-3h-2.8V8.1c0-.87.24-1.46 1.5-1.46h1.4V4.14A19 19 0 0 0 16.3 4c-2.1 0-3.6 1.28-3.6 3.64V10H10v3h2.7v8Z" />
    </svg>
  );
}
