export function MockShopNotice() {
  return (
    <section
      className="mock-shop-notice"
      aria-labelledby="mock-shop-notice-heading"
    >
      <div className="inner">
        <h2 id="mock-shop-notice-heading">Mode démonstration</h2>
        <p>
          Les produits affichés viennent de mock.shop, car aucune boutique
          Shopify n’est encore connectée.
        </p>
        <p>
          Pour connecter une boutique, lance{' '}
          <code>npx shopify hydrogen link</code> dans le terminal.
        </p>
      </div>
    </section>
  );
}
