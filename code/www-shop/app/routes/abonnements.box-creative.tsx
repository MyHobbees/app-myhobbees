import type {Route} from './+types/abonnements.box-creative';
import {SubscriptionOfferPage} from '~/components/SubscriptionOfferPage';
import {SUBSCRIPTION_OFFERS} from '~/lib/subscriptionOffers';

const offer = SUBSCRIPTION_OFFERS['box-creative'];

export const meta: Route.MetaFunction = () => [
  {title: `${offer.seo.title}`},
  {name: 'description', content: offer.seo.description},
];

export default function BoxCreativeOfferPage() {
  return <SubscriptionOfferPage offer={offer} />;
}
