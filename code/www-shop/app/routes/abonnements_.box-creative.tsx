import {useLoaderData} from 'react-router';
import type {Route} from './+types/abonnements_.box-creative';
import {SubscriptionOfferPage} from '~/components/SubscriptionOfferPage';
import {SUBSCRIPTION_OFFERS} from '~/lib/subscriptionOffers';
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

export async function loader({request}: Route.LoaderArgs) {
  const url = canonicalUrl(request, '/abonnements/box-creative');
  // No real checkout available yet: always show the "me prévenir" CTA, regardless
  // of what's published on the connected Shopify store.
  return {purchase: null, canonicalUrl: url};
}

export default function BoxCreativeOfferPage() {
  const {purchase} = useLoaderData<typeof loader>();
  return <SubscriptionOfferPage offer={offer} purchase={purchase} />;
}
