import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {
  ProductItemFragment,
  CollectionItemFragment,
  RecommendedProductFragment,
} from 'storefrontapi.generated';
import {useVariantUrl} from '~/lib/variants';

export function ProductItem({
  product,
  loading,
  featured = false,
}: {
  product:
    | CollectionItemFragment
    | ProductItemFragment
    | RecommendedProductFragment;
  loading?: 'eager' | 'lazy';
  featured?: boolean;
}) {
  const variantUrl = useVariantUrl(product.handle);
  const image = product.featuredImage;
  return (
    <Link
      className={`product-item${featured ? ' product-item--featured' : ''}`}
      key={product.id}
      prefetch="intent"
      to={variantUrl}
    >
      <div className="product-item-media">
        {image ? (
          <Image
            alt={image.altText || product.title}
            aspectRatio="1/1"
            data={image}
            loading={loading}
            sizes="(min-width: 45em) 400px, 100vw"
          />
        ) : (
          <div className="product-media-fallback" aria-hidden="true">
            <span>✂</span>
            <span>✦</span>
            <span>🧶</span>
          </div>
        )}
      </div>
      <div className="product-item-content">
        {featured ? <span className="product-badge">Box du mois</span> : null}
        <h3>{product.title}</h3>
        <p className="product-item-price">
          <Money data={product.priceRange.minVariantPrice} />
        </p>
        {featured ? (
          <span className="button button-primary product-item-cta">
            Découvrir cette box
          </span>
        ) : null}
      </div>
    </Link>
  );
}
