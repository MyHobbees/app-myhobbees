import type {Route} from './+types/abonnements.box-app';
import {SubscriptionOfferPage} from '~/components/SubscriptionOfferPage';
import {SUBSCRIPTION_OFFERS} from '~/lib/subscriptionOffers';

const offer = SUBSCRIPTION_OFFERS['box-app'];

export const meta: Route.MetaFunction = () => [
  {title: `${offer.seo.title}`},
  {name: 'description', content: offer.seo.description},
];

export default function BoxAppOfferPage() {
  return <SubscriptionOfferPage offer={offer} />;
}
