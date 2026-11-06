import {redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/products.$handle';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductImage} from '~/components/ProductImage';
import {ProductForm} from '~/components/ProductForm';
import {AccordionList} from '~/components/AccordionList';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {isMockShop} from '~/lib/storefront';
import {
  getSubscriptionCtaLabel,
  getSubscriptionKind,
  type SubscriptionKind,
} from '~/lib/subscriptions';

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: `${data?.product.title ?? 'Produit'} | My Hobbees`},
    {
      rel: 'canonical',
      href: `/products/${data?.product.handle}`,
    },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{product}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, {handle, data: product});

  return {
    isMockShop: isMockShop(context.env.PUBLIC_STORE_DOMAIN),
    product,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context, params}: Route.LoaderArgs) {
  // Put any API calls that is not critical to be available on first page render
  // For example: product reviews, product recommendations, social feeds.

  return {};
}

export default function Product() {
  const {isMockShop, product} = useLoaderData<typeof loader>();

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Sets the search param to the selected variant without navigation
  // only when no search params are set in the url
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  // Get the product options array
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const {title, descriptionHtml} = product;
  const subscriptionKind = isMockShop
    ? null
    : getSubscriptionKind(product);
  const addToCartLabel = isMockShop
    ? 'Ajouter le produit de démonstration'
    : getSubscriptionCtaLabel(subscriptionKind);

  return (
    <div className="product">
      <ProductImage image={selectedVariant?.image} />
      <div className="product-main">
        {isMockShop ? (
          <span className="product-badge">Produit de démonstration</span>
        ) : null}
        <h1>{title}</h1>
        <ProductPrice
          price={selectedVariant?.price}
          compareAtPrice={selectedVariant?.compareAtPrice}
        />
        <br />
        <ProductForm
          addToCartLabel={addToCartLabel}
          productOptions={productOptions}
          selectedVariant={selectedVariant}
        />
        <br />
        <br />
        <p>
          <strong>
            {subscriptionKind ? 'Cette formule' : 'Description du produit'}
          </strong>
        </p>
        <br />
        <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
        <br />
        {subscriptionKind ? (
          <ProductSubscriptionDetails kind={subscriptionKind} />
        ) : null}
      </div>
      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </div>
  );
}

function ProductSubscriptionDetails({kind}: {kind: SubscriptionKind}) {
  const items = [
    {
      title: 'Ce qui est inclus',
      content: (
        <p>
          Retrouve dans la description de la formule le contenu de la box et
          les services inclus dans ton abonnement mensuel.
        </p>
      ),
    },
    {
      title: 'Pour quel niveau ?',
      content: (
        <p>
          Les activités My Hobbees sont pensées pour être accessibles aux
          débutants et progresser à son rythme.
        </p>
      ),
    },
    {
      title: 'Livraison et retours',
      content: (
        <p>
          Les modalités applicables sont précisées lors de la commande et dans
          les politiques de livraison et de remboursement de la boutique.
        </p>
      ),
    },
    {
      title: 'Accès à l’application My Hobbees',
      content: (
        <p>
          {kind === 'box-app'
            ? 'Cette formule inclut l’accès à l’application My Hobbees lorsqu’elle sera disponible.'
            : 'Selon la formule choisie, tu pourras accéder à l’application My Hobbees pour suivre des tutoriels vidéo, retrouver tes contenus et échanger avec la communauté.'}
        </p>
      ),
    },
  ];

  return (
    <section
      className="product-subscription-details"
      aria-labelledby="product-details-title"
    >
      <h2 id="product-details-title">En savoir plus sur la formule</h2>
      <AccordionList items={items} />
    </section>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    productType
    tags
    subscriptionTier: metafield(namespace: "custom", key: "subscription_tier") {
      value
    }
    descriptionHtml
    description
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;
