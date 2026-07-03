import {Suspense} from 'react';
import {Await, NavLink, useAsyncValue} from 'react-router';
import {Hexagon, Menu, Search, ShoppingCart, UserRound} from 'lucide-react';
import {
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {getMenuItemUrl} from '~/lib/menu';
import {shouldUseFallbackMenu} from '~/lib/storefront';

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
      <div className="announcement-bar">
        <Hexagon aria-hidden="true" size={16} />
        <span>Livraison offerte dès 59 € d’achat</span>
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
  const useFallbackMenu = shouldUseFallbackMenu(
    publicStoreDomain,
    menu?.items.length ?? 0,
  );
  const items = useFallbackMenu
    ? FALLBACK_HEADER_MENU.items
    : (menu?.items ?? FALLBACK_HEADER_MENU.items);

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
        <UserRound aria-hidden="true" />
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
      <Menu aria-hidden="true" />
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
      <Search aria-hidden="true" />
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
      <ShoppingCart aria-hidden="true" />
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
  ],
};
