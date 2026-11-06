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
        referrer: stored?.referrer ?? '',
      }),
    });

    if (!response.ok) {
      throw new Error(`leads endpoint responded with ${response.status}`);
    }
  } catch (error) {
    console.error('me-prevenir: lead submission failed', error);
    return data(
      {ok: false, error: 'La sauvegarde a échoué. Réessaie dans quelques instants.'},
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
      capture('waitlist_signup', {
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
      <section className="me-prevenir-hero">
        <h1 className="me-prevenir-title" id="me-prevenir-title">
          Sois prévenu·e dès le lancement
        </h1>
        <p className="me-prevenir-intro">
          Nos box créatives arrivent bientôt. Laisse-nous ton email pour être
          prévenu·e dès l’ouverture et nous aider à préparer le lancement.
        </p>

        <div className="me-prevenir-card">
          {actionData?.ok ? (
            <div className="notice-callout me-prevenir-confirmation">
              <div className="inner">
                <h2>Merci, c’est noté !</h2>
                <p>
                  Nous te préviendrons par email dès l’ouverture des box et
                  des abonnements.
                </p>
              </div>
            </div>
          ) : (
            <Form
              action={`${location.pathname}${location.search}`}
              className="me-prevenir-form"
              method="post"
            >
              <div className="me-prevenir-field">
                <FieldBadge number={1} />
                <label className="me-prevenir-field-body">
                  <span>Email</span>
                  <input
                    autoComplete="email"
                    className="me-prevenir-input"
                    name="email"
                    placeholder="ton@email.fr"
                    required
                    type="email"
                  />
                </label>
              </div>

              <div className="me-prevenir-field">
                <FieldBadge number={2} />
                <fieldset className="me-prevenir-field-body">
                  <legend>Quelles activités t’intéressent ?</legend>
                  <div className="me-prevenir-chips">
                    {ACTIVITIES.map((activity) => (
                      <label className="me-prevenir-chip" key={activity}>
                        <input
                          className="sr-only"
                          name="activities"
                          type="checkbox"
                          value={activity}
                        />
                        {activity}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              <div className="me-prevenir-field">
                <FieldBadge number={3} />
                <fieldset className="me-prevenir-field-body">
                  <legend>Quel abonnement t’intéresse le plus ?</legend>
                  <p className="me-prevenir-offers-note">
                    Découvre le détail des formules en préparation sur la
                    page{' '}
                    <Link className="me-prevenir-offers-link" to="/abonnements">
                      Nos abonnements
                    </Link>
                    .
                  </p>
                  <div className="me-prevenir-offer-cards">
                    {offers.map((item) => (
                      <label className="me-prevenir-offer-card" key={item.slug}>
                        <input
                          className="sr-only"
                          defaultChecked={offer?.slug === item.slug}
                          name="subscription_interest"
                          type="radio"
                          value={item.title}
                        />
                        <span aria-hidden="true" className="me-prevenir-offer-radio" />
                        <span className="me-prevenir-offer-title">{item.title}</span>
                        <span className="me-prevenir-offer-text">{item.tagline}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              <div className="me-prevenir-field">
                <FieldBadge number={4} />
                <label className="me-prevenir-field-body">
                  <span>Comment nous as-tu connu ?</span>
                  <span className="me-prevenir-select-wrap">
                    <select
                      className="me-prevenir-select"
                      defaultValue=""
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
                    <span aria-hidden="true" className="me-prevenir-select-chevron">
                      ▾
                    </span>
                  </span>
                </label>
              </div>

              {actionData && !actionData.ok ? (
                <p className="me-prevenir-form-error" role="alert">
                  {actionData.error}
                </p>
              ) : null}

              <button
                className="button button-primary me-prevenir-submit"
                disabled={submitting}
                type="submit"
              >
                {submitting ? 'Envoi…' : 'Être informé·e'}
              </button>
            </Form>
          )}
        </div>
      </section>
    </article>
  );
}

function FieldBadge({number}: {number: 1 | 2 | 3 | 4}) {
  return (
    <span
      aria-hidden="true"
      className={`me-prevenir-field-badge me-prevenir-field-badge--${number}`}
    >
      {number}
    </span>
  );
}
