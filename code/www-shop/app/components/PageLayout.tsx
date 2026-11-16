import {Await} from 'react-router';
import {Suspense} from 'react';
import type {
  CartApiQueryFragment,
  FooterQuery,
  HeaderQuery,
} from 'storefrontapi.generated';
import {Aside} from '~/components/Aside';
import {Footer} from '~/components/Footer';
import {
  CartToggle,
  Header,
  HeaderCtaLink,
  HeaderMenu,
} from '~/components/Header';
import {CartMain} from '~/components/CartMain';

interface PageLayoutProps {
  cart: Promise<CartApiQueryFragment | null>;
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  publicStoreDomain: string;
  children?: React.ReactNode;
}

export function PageLayout({
  cart,
  children = null,
  footer,
  header,
  publicStoreDomain,
}: PageLayoutProps) {
  return (
    <Aside.Provider>
      <CartAside cart={cart} />
      <MobileMenuAside cart={cart} />
      {header && (
        <Header header={header} cart={cart} publicStoreDomain={publicStoreDomain} />
      )}
      <main>{children}</main>
      <Footer
        footer={footer}
        header={header}
        publicStoreDomain={publicStoreDomain}
      />
    </Aside.Provider>
  );
}

function CartAside({cart}: {cart: PageLayoutProps['cart']}) {
  return (
    <Aside type="cart" heading="PANIER">
      <Suspense fallback={<p>Chargement du panier…</p>}>
        <Await resolve={cart}>
          {(cart) => <CartMain cart={cart} layout="aside" />}
        </Await>
      </Suspense>
    </Aside>
  );
}

function MobileMenuAside({cart}: {cart: PageLayoutProps['cart']}) {
  return (
    <Aside type="mobile" heading="MENU">
      <HeaderMenu viewport="mobile" />
      <div className="mobile-menu-actions">
        <HeaderCtaLink placement="mobile_menu" />
        <CartToggle cart={cart} />
      </div>
    </Aside>
  );
}
