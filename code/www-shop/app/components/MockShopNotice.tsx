export function MockShopNotice() {
  return (
    <section
      className="notice-callout"
      aria-labelledby="mock-shop-notice-heading"
    >
      <div className="inner">
        <h2 id="mock-shop-notice-heading">Mode démonstration</h2>
        <p>
          Les produits affichés viennent de mock.shop, car aucune boutique
          Shopify My Hobbees n’est encore connectée.
        </p>
        <p className="notice-callout-secondary">
          Les produits, collections et menus réels apparaîtront après la
          connexion de la boutique Shopify.
        </p>
      </div>
    </section>
  );
}
