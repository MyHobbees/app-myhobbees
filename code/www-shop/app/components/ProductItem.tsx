import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import {Palette, Scissors, Sparkles} from 'lucide-react';
import type {
  ProductItemFragment,
  CollectionItemFragment,
} from 'storefrontapi.generated';
import {useVariantUrl} from '~/lib/variants';

export function ProductItem({
  product,
  loading,
  featured = false,
  demo = false,
}: {
  product: CollectionItemFragment | ProductItemFragment;
  loading?: 'eager' | 'lazy';
  featured?: boolean;
  demo?: boolean;
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
            <Scissors />
            <Sparkles />
            <Palette />
          </div>
        )}
      </div>
      <div className="product-item-content">
        {demo ? (
          <span className="product-badge">Produit de démonstration</span>
        ) : null}
        <h3>{product.title}</h3>
        <p className="product-item-price">
          <Money data={product.priceRange.minVariantPrice} />
        </p>
        {featured ? (
          <span className="button button-primary product-item-cta">
            {demo
              ? 'Voir le produit de démonstration'
              : 'Découvrir cette box'}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
