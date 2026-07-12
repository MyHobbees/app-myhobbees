import type {Route} from './+types/abonnements.app-only';
import {SubscriptionOfferPage} from '~/components/SubscriptionOfferPage';
import {SUBSCRIPTION_OFFERS} from '~/lib/subscriptionOffers';

const offer = SUBSCRIPTION_OFFERS['app-only'];

export const meta: Route.MetaFunction = () => [
  {title: `${offer.seo.title}`},
  {name: 'description', content: offer.seo.description},
];

export default function AppOnlyOfferPage() {
  return <SubscriptionOfferPage offer={offer} />;
}
