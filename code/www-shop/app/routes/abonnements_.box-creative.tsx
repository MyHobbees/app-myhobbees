import {useLoaderData} from 'react-router';
import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';
import type {Route} from './+types/abonnements_.box-creative';
import {
  SubscriptionOfferPage,
  type SubscriptionOfferPurchase,
} from '~/components/SubscriptionOfferPage';
import {SUBSCRIPTION_OFFERS} from '~/lib/subscriptionOffers';
import {isMockShop} from '~/lib/storefront';
import {buildOpenGraphTags, canonicalUrl} from '~/lib/seo';

const offer = SUBSCRIPTION_OFFERS['box-creative'];

export const meta: Route.MetaFunction = ({data}) => [
  {title: `${offer.seo.title}`},
  {name: 'description', content: offer.seo.description},
  ...(data?.canonicalUrl
    ? [
        {tagName: 'link' as const, rel: 'canonical', href: data.canonicalUrl},
        ...buildOpenGraphTags({
          title: offer.seo.title,
          description: offer.seo.description,
          url: data.canonicalUrl,
          type: 'website',
        }),
      ]
    : []),
];

type OfferMoney = Pick<MoneyV2, 'amount' | 'currencyCode'>;

interface OfferProductQueryData {
  product: {
    variants: {
      nodes: Array<{
        id: string;
        availableForSale: boolean;
        price: OfferMoney;
        sellingPlanAllocations: {
          nodes: Array<{
            sellingPlan: {id: string};
            priceAdjustments: Array<{price: OfferMoney}>;
          }>;
        };
      }>;
    };
  } | null;
}

export async function loader({context, request}: Route.LoaderArgs) {
  const url = canonicalUrl(request, '/abonnements/box-creative');
  const handle = offer.future.productHandle;
  if (!handle || isMockShop(context.env.PUBLIC_STORE_DOMAIN)) {
    return {purchase: null, canonicalUrl: url};
  }

  let data: OfferProductQueryData;
  try {
    data = await context.storefront.query<OfferProductQueryData>(
      OFFER_PRODUCT_QUERY,
      {variables: {handle}},
    );
  } catch {
    return {purchase: null, canonicalUrl: url};
  }

  const variant = data.product?.variants.nodes[0];
  if (!variant) {
    return {purchase: null, canonicalUrl: url};
  }

  const allocations = variant.sellingPlanAllocations.nodes;
  const allocation =
    allocations.find(
      (node) => node.sellingPlan.id === offer.future.sellingPlanId,
    ) ?? allocations[0];

  const purchase: SubscriptionOfferPurchase = {
    available: variant.availableForSale,
    merchandiseId: variant.id,
    price: allocation?.priceAdjustments[0]?.price ?? variant.price,
    sellingPlanId: allocation?.sellingPlan.id ?? null,
  };
  return {purchase, canonicalUrl: url};
}

export default function BoxCreativeOfferPage() {
  const {purchase} = useLoaderData<typeof loader>();
  return <SubscriptionOfferPage offer={offer} purchase={purchase} />;
}

const OFFER_PRODUCT_QUERY = `#graphql
  query SubscriptionOfferProduct(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      variants(first: 1) {
        nodes {
          id
          availableForSale
          price {
            amount
            currencyCode
          }
          sellingPlanAllocations(first: 5) {
            nodes {
              sellingPlan {
                id
              }
              priceAdjustments {
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  }
` as const;
