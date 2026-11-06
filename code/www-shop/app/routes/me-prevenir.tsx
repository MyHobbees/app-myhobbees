import {useEffect} from 'react';
import {
  data,
  Form,
  Link,
  useActionData,
  useLoaderData,
  useLocation,
  useNavigation,
} from 'react-router';
import type {Route} from './+types/me-prevenir';
import {EditorialHero} from '~/components/EditorialHero';
import {readAttribution} from '~/lib/attribution';
import {capture} from '~/lib/posthog';
import {
  SUBSCRIPTION_OFFERS,
  type SubscriptionOfferSlug,
} from '~/lib/subscriptionOffers';

const ACTIVITIES = ['Crochet', 'Couture', 'Peinture', 'Autre'] as const;

const ACQUISITION_CHANNELS = [
  'Instagram',
  'TikTok',
  'Recherche Google',
  'Bouche-à-oreille',
  'Autre',
] as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ActionResponse =
  | {
      ok: true;
      activities: string[];
      acquisitionChannel: string;
      subscriptionInterest: string;
      offer: string | null;
    }
  | {ok: false; error: string};

export const meta: Route.MetaFunction = () => [
  {title: 'Sois prévenu·e du lancement — My Hobbees'},
  {
    name: 'description',
    content:
      'Laisse ton email pour être prévenu·e dès l’ouverture des box créatives et des abonnements My Hobbees.',
  },
];

export async function loader({request}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const offerSlug = url.searchParams.get('offer');
  const offer = offerSlug
    ? (SUBSCRIPTION_OFFERS[offerSlug as SubscriptionOfferSlug] ?? null)
    : null;

  return {
    offer,
    offers: Object.values(SUBSCRIPTION_OFFERS),
  };
}

export async function action({request, context}: Route.ActionArgs) {
  const url = new URL(request.url);
  const formData = await request.formData();

  const email = String(formData.get('email') ?? '').trim();
  const activities = formData.getAll('activities').map((value) => String(value));
  const acquisitionChannel = String(
    formData.get('acquisition_channel') ?? '',
  ).trim();
  const subscriptionInterest = String(
    formData.get('subscription_interest') ?? '',
  ).trim();
  const offer = url.searchParams.get('offer');

  if (
    !email ||
    !EMAIL_PATTERN.test(email) ||
    activities.length === 0 ||
    !acquisitionChannel ||
    !subscriptionInterest
  ) {
    return data(
      {
        ok: false,
        error:
          'Merci de renseigner un email valide et de répondre aux trois questions.',
      },
      {status: 400},
    );
  }

  // This page is usually reached via an in-site link or a same-origin form
  // POST, so its own URL/Referer rarely carry the visitor's original utm_*
  // or external referrer — fall back to what root.tsx's loader captured on
  // first landing (see app/lib/attribution.ts).
  const stored = await readAttribution(request);

  try {
    const response = await fetch(`${context.env.API_BASE_URL}/v1/leads`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        email,
        activities,
        acquisition_channel: acquisitionChannel,
        subscription_interest: subscriptionInterest,
        utm_source: url.searchParams.get('utm_source') || stored?.utmSource || '',
        utm_medium: url.searchParams.get('utm_medium') || stored?.utmMedium || '',
        utm_campaign: url.searchParams.get('utm_campaign') || stored?.utmCampaign || '',
        referrer: stored?.referrer || request.headers.get('Referer') || '',
      }),
    });

    if (!response.ok) {
      throw new Error('La sauvegarde a échoué. Réessaie dans quelques instants.');
    }
  } catch (error) {
    return data(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : 'Une erreur est survenue.',
      },
      {status: 502},
    );
  }

  return data({
    ok: true,
    activities,
    acquisitionChannel,
    subscriptionInterest,
    offer,
  });
}

export default function MePrevenir() {
  const {offer, offers} = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionResponse>();
  const {state} = useNavigation();
  const location = useLocation();
  const submitting = state !== 'idle';

  useEffect(() => {
    if (actionData?.ok) {
      capture('lead_form_submitted', {
        activities: actionData.activities,
        acquisition_channel: actionData.acquisitionChannel,
        subscription_interest: actionData.subscriptionInterest,
        offer: actionData.offer,
      });
    }
  }, [actionData]);

  return (
    <article
      className="editorial-page me-prevenir-page"
      aria-labelledby="me-prevenir-title"
    >
      <EditorialHero
        description="Nos box créatives arrivent bientôt. Laisse-nous ton email pour être prévenu·e dès l’ouverture et nous aider à préparer le lancement."
        headingId="me-prevenir-title"
        title="Sois prévenu·e dès le lancement"
      />

      <section
        className="page-width editorial-section me-prevenir-offers"
        aria-labelledby="me-prevenir-offers-title"
      >
        <div className="section-heading centered">
          <h2 id="me-prevenir-offers-title">Les abonnements à venir</h2>
          <p>
            Découvre le détail des formules en préparation sur la page{' '}
            <Link className="text-link" to="/abonnements">
              Nos abonnements
            </Link>
            .
          </p>
        </div>
        <ul className="steps-grid me-prevenir-offers-grid">
          {offers.map((item) => (
            <li className="step-card about-value-card" key={item.slug}>
              <h3>{item.title}</h3>
              <p>{item.tagline}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="page-width editorial-section me-prevenir-form-section"
        aria-labelledby="me-prevenir-form-title"
      >
        {actionData?.ok ? (
          <div className="notice-callout me-prevenir-confirmation">
            <div className="inner">
              <h2 id="me-prevenir-form-title">Merci, c’est noté !</h2>
              <p>
                Nous te préviendrons par email dès l’ouverture des box et des
                abonnements.
              </p>
            </div>
          </div>
        ) : (
          <Form
            action={`${location.pathname}${location.search}`}
            className="me-prevenir-form"
            method="post"
          >
            <h2 id="me-prevenir-form-title">Être informé·e du lancement</h2>

            <label htmlFor="email">Email</label>
            <input
              autoComplete="email"
              id="email"
              name="email"
              placeholder="ton@email.fr"
              required
              type="email"
            />

            <fieldset>
              <legend>Quelles activités t’intéressent ?</legend>
              {ACTIVITIES.map((activity) => (
                <label key={activity}>
                  <input name="activities" type="checkbox" value={activity} />
                  {activity}
                </label>
              ))}
            </fieldset>

            <label htmlFor="acquisition_channel">Comment nous as-tu connu ?</label>
            <select
              defaultValue=""
              id="acquisition_channel"
              name="acquisition_channel"
              required
            >
              <option disabled value="">
                Choisis une réponse
              </option>
              {ACQUISITION_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>

            <label htmlFor="subscription_interest">
              Quel abonnement t’intéresse le plus ?
            </label>
            <select
              defaultValue={offer?.title ?? ''}
              id="subscription_interest"
              name="subscription_interest"
              required
            >
              <option disabled value="">
                Choisis une réponse
              </option>
              {offers.map((item) => (
                <option key={item.slug} value={item.title}>
                  {item.title}
                </option>
              ))}
              <option value="Je ne sais pas encore">
                Je ne sais pas encore
              </option>
            </select>

            {actionData && !actionData.ok ? (
              <p className="me-prevenir-form-error" role="alert">
                <mark>
                  <small>{actionData.error}</small>
                </mark>
              </p>
            ) : null}

            <button
              className="button button-primary"
              disabled={submitting}
              type="submit"
            >
              {submitting ? 'Envoi…' : 'Être informé·e'}
            </button>
          </Form>
        )}
      </section>
    </article>
  );
}
