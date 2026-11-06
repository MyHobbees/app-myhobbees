import {Suspense} from 'react';
import {Await, Link, NavLink, useAsyncValue} from 'react-router';
import {Menu, ShoppingCart} from 'lucide-react';
import {
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {capture} from '~/lib/posthog';

interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  publicStoreDomain: string;
}

type Viewport = 'desktop' | 'mobile';

/**
 * The main navigation is owned by the site (not the Shopify admin menu): the
 * shop products surface inside the site's own pages, so the header always
 * links to those pages regardless of what the Shopify "main-menu" contains.
 */
const SITE_MENU_ITEMS = [
  {title: 'Accueil', to: '/', end: true},
  {title: 'Nos boxes', to: '/collections/all', end: false},
  {title: 'Nos abonnements', to: '/abonnements', end: false},
  {title: 'Qui sommes-nous', to: '/qui-sommes-nous', end: false},
] as const;

export function Header({header, cart, publicStoreDomain}: HeaderProps) {
  return (
    <>
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
        <HeaderMenu viewport="desktop" />
        <HeaderCtas cart={cart} />
      </header>
    </>
  );
}

export function HeaderMenu({viewport}: {viewport: Viewport}) {
  const className = `header-menu header-menu-${viewport}`;
  const {close} = useAside();

  const itemClassName = ({
    isActive,
    isPending,
  }: {
    isActive: boolean;
    isPending: boolean;
  }) =>
    [
      'header-menu-item',
      isActive ? 'is-active' : '',
      isPending ? 'is-pending' : '',
    ]
      .filter(Boolean)
      .join(' ');

  return (
    <nav className={className} aria-label="Navigation principale">
      {SITE_MENU_ITEMS.map((item) => (
        <NavLink
          className={itemClassName}
          end={item.end}
          key={item.to}
          onClick={close}
          prefetch="intent"
          to={item.to}
        >
          {item.title}
        </NavLink>
      ))}
    </nav>
  );
}

function HeaderCtas({cart}: Pick<HeaderProps, 'cart'>) {
  return (
    <nav className="header-ctas" aria-label="Actions rapides">
      <HeaderMenuMobileToggle />
      <Link
        className="header-action button button-primary"
        prefetch="intent"
        to="/me-prevenir"
        onClick={() => capture('fake_door_click', {placement: 'header'})}
      >
        Me prévenir
      </Link>
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

function CartBadge({count}: {count: number}) {
  const {open} = useAside();
  const {publish, shop, cart, prevCart} = useAnalytics();

  return (
    <a
      aria-label={`Panier, ${count} article${count > 1 ? 's' : ''}`}
      className="header-action button button-secondary button-icon"
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
