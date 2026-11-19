import type {Route} from './+types/abonnements_.box-app';
import {SubscriptionOfferPage} from '~/components/SubscriptionOfferPage';
import {SUBSCRIPTION_OFFERS} from '~/lib/subscriptionOffers';
import {buildOpenGraphTags, canonicalUrl} from '~/lib/seo';

const offer = SUBSCRIPTION_OFFERS['box-app'];

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
  return {
    canonicalUrl: canonicalUrl(request, '/abonnements/box-app'),
  };
}

export default function BoxAppOfferPage() {
  return <SubscriptionOfferPage offer={offer} />;
}
