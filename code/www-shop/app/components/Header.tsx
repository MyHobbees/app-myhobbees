import {Suspense} from 'react';
import {Await, NavLink, useAsyncValue} from 'react-router';
import {
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {getMenuItemUrl} from '~/lib/menu';

interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
}

type Viewport = 'desktop' | 'mobile';

export function Header({
  header,
  isLoggedIn,
  cart,
  publicStoreDomain,
}: HeaderProps) {
  return (
    <>
      <div className="announcement-bar" role="status">
        🐝 Livraison offerte dès 59 € d’achat
      </div>
      <header className="header">
        <NavLink
          aria-label="My Hobbees, accueil"
          className="brand"
          prefetch="intent"
          to="/"
          end
        >
          <span aria-hidden="true" className="brand-mark">
            MH
          </span>
          <strong>My Hobbees</strong>
        </NavLink>
        <HeaderMenu
          menu={header.menu}
          viewport="desktop"
          primaryDomainUrl={header.shop.primaryDomain.url}
          publicStoreDomain={publicStoreDomain}
        />
        <HeaderCtas isLoggedIn={isLoggedIn} cart={cart} />
      </header>
    </>
  );
}

export function HeaderMenu({
  menu,
  primaryDomainUrl,
  viewport,
  publicStoreDomain,
}: {
  menu: HeaderProps['header']['menu'];
  primaryDomainUrl: HeaderProps['header']['shop']['primaryDomain']['url'];
  viewport: Viewport;
  publicStoreDomain: HeaderProps['publicStoreDomain'];
}) {
  const className = `header-menu header-menu-${viewport}`;
  const {close} = useAside();
  const items = menu?.items.length ? menu.items : FALLBACK_HEADER_MENU.items;

  return (
    <nav className={className} aria-label="Navigation principale">
      {items.map((item) => {
        if (!item.url) return null;

        const to = getMenuItemUrl(
          item.url,
          primaryDomainUrl,
          publicStoreDomain,
        );

        return (
          <NavLink
            className={({isActive, isPending}) =>
              [
                'header-menu-item',
                isActive ? 'is-active' : '',
                isPending ? 'is-pending' : '',
              ]
                .filter(Boolean)
                .join(' ')
            }
            end={to === '/'}
            key={item.id}
            onClick={close}
            prefetch="intent"
            to={to}
          >
            {item.title}
          </NavLink>
        );
      })}
    </nav>
  );
}

function HeaderCtas({
  isLoggedIn,
  cart,
}: Pick<HeaderProps, 'isLoggedIn' | 'cart'>) {
  return (
    <nav className="header-ctas" aria-label="Actions rapides">
      <HeaderMenuMobileToggle />
      <SearchToggle />
      <NavLink
        aria-label="Mon compte"
        className="header-action"
        prefetch="intent"
        to="/account"
      >
        <AccountIcon />
        <span className="header-action-label">
          <Suspense fallback="Compte">
            <Await resolve={isLoggedIn} errorElement="Compte">
              {(isLoggedIn) => (isLoggedIn ? 'Mon compte' : 'Connexion')}
            </Await>
          </Suspense>
        </span>
      </NavLink>
      <CartToggle cart={cart} />
    </nav>
  );
}

function HeaderMenuMobileToggle() {
  const {open} = useAside();
  return (
    <button
      aria-label="Ouvrir le menu"
      className="header-action header-menu-mobile-toggle reset"
      onClick={() => open('mobile')}
      type="button"
    >
      <MenuIcon />
    </button>
  );
}

function SearchToggle() {
  const {open} = useAside();
  return (
    <button
      aria-label="Rechercher"
      className="header-action reset"
      onClick={() => open('search')}
      type="button"
    >
      <SearchIcon />
      <span className="header-action-label">Recherche</span>
    </button>
  );
}

function CartBadge({count}: {count: number}) {
  const {open} = useAside();
  const {publish, shop, cart, prevCart} = useAnalytics();

  return (
    <a
      aria-label={`Panier, ${count} article${count > 1 ? 's' : ''}`}
      className="header-action"
      href="/cart"
      onClick={(event) => {
        event.preventDefault();
        open('cart');
        publish('cart_viewed', {
          cart,
          prevCart,
          shop,
          url: window.location.href || '',
        } as CartViewPayload);
      }}
    >
      <CartIcon />
      <span className="header-action-label">Panier</span>
      <span aria-hidden="true" className="cart-count">
        {count}
      </span>
    </a>
  );
}

function CartToggle({cart}: Pick<HeaderProps, 'cart'>) {
  return (
    <Suspense fallback={<CartBadge count={0} />}>
      <Await resolve={cart}>
        <CartBanner />
      </Await>
    </Suspense>
  );
}

function CartBanner() {
  const originalCart = useAsyncValue() as CartApiQueryFragment | null;
  const cart = useOptimisticCart(originalCart);
  return <CartBadge count={cart?.totalQuantity ?? 0} />;
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 7H6" />
      <circle cx="10" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );
}

const FALLBACK_HEADER_MENU = {
  id: 'my-hobbees-fallback-menu',
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
      id: 'fallback-box',
      resourceId: null,
      tags: [],
      title: 'La box surprise',
      type: 'HTTP',
      url: '/collections/all',
      items: [],
    },
    {
      id: 'fallback-faq',
      resourceId: null,
      tags: [],
      title: 'FAQ',
      type: 'HTTP',
      url: '/pages/faq',
      items: [],
    },
  ],
};
