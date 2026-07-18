import type {SubscriptionKind} from '~/lib/subscriptions';
import boxMyHobbees from '~/assets/box-my-hobbees.png';

export type SubscriptionOfferSlug = 'box-creative' | 'box-app' | 'app-only';

export interface SubscriptionOfferMedia {
  alt: string;
  src: string;
}

export interface SubscriptionOfferAppFeature {
  description: string;
  title: string;
}

export interface SubscriptionOfferAppExperience {
  disclaimer: string;
  features: readonly SubscriptionOfferAppFeature[];
  title: string;
}

export interface SubscriptionOfferEditorial {
  description: string;
  title: string;
}

/**
 * Not populated yet: no real Shopify variant/selling plan exists for these
 * formulas. Once one does, fill this in and `SubscriptionOfferPage` can
 * render a real price instead of the "tarif bientôt disponible" placeholder.
 */
export interface SubscriptionOfferPrice {
  amount: string;
  compareAtAmount?: string;
  currencyCode: string;
  intervalLabel: string;
}

/**
 * Lets a future Shopify product/selling plan be wired to this offer without
 * touching the page markup — see the "Préparation future Shopify" note in
 * SubscriptionOfferPage. `subscriptionKind` is nullable because the product
 * classification in ~/lib/subscriptions.ts only recognizes 'box' | 'box-app'
 * today — an app-only offer has no matching kind yet.
 */
export interface SubscriptionOfferFutureShopify {
  productHandle: string | null;
  sellingPlanId: string | null;
  subscriptionKind: SubscriptionKind | null;
}

export interface SubscriptionOffer {
  appExperience?: SubscriptionOfferAppExperience;
  badge: string;
  cadence: string;
  editorial?: SubscriptionOfferEditorial;
  finalCtaLabel: string;
  future: SubscriptionOfferFutureShopify;
  included: readonly string[];
  label?: string;
  media: SubscriptionOfferMedia;
  price?: SubscriptionOfferPrice;
  reassurance: string;
  seo: {description: string; title: string};
  slug: SubscriptionOfferSlug;
  tagline: string;
  title: string;
}

export const SUBSCRIPTION_OFFERS: Record<SubscriptionOfferSlug, SubscriptionOffer> = {
  'box-creative': {
    badge: 'L’ESSENTIEL',
    cadence: 'Une box créative surprise chaque mois',
    editorial: {
      title: 'Une parenthèse créative livrée chez toi',
      description:
        'Tu n’as pas besoin de chercher quoi acheter ni comment commencer. Nous préparons une box pensée pour t’accompagner dans une nouvelle activité, à ton rythme.',
    },
    finalCtaLabel: 'Être informé du lancement',
    future: {
      productHandle: null,
      sellingPlanId: null,
      subscriptionKind: 'box',
    },
    included: [
      'Une activité créative surprise chaque mois',
      'Le matériel nécessaire',
      'Les outils adaptés à l’activité',
      'Un guide pas à pas',
      'Des activités adaptées aux débutants',
      'Une petite surprise My Hobbees',
    ],
    media: {
      alt: 'Box créative surprise My Hobbees',
      src: boxMyHobbees,
    },
    reassurance:
      'Aucun paiement aujourd’hui : sois informé·e dès l’ouverture de cette formule.',
    seo: {
      title: 'Box créative surprise — My Hobbees',
      description:
        'Découvre la formule Box créative surprise My Hobbees : une activité créative, du matériel inclus et un guide pas à pas chaque mois.',
    },
    slug: 'box-creative',
    tagline:
      'Chaque mois, découvre une activité créative surprise pensée pour t’inspirer, apprendre et prendre du temps pour toi.',
    title: 'Box créative surprise',
  },
  'box-app': {
    appExperience: {
      title: 'L’expérience continue dans l’application',
      disclaimer:
        'L’application My Hobbees est actuellement en cours de développement. L’accès sera activé avec ton abonnement lors de sa disponibilité.',
      features: [
        {
          title: 'Tutoriels vidéo',
          description:
            'Retrouve les gestes, explications et astuces pour avancer à ton rythme.',
        },
        {
          title: 'Suivi de progression',
          description: 'Garde une trace de tes créations et de ce que tu as appris.',
        },
        {
          title: 'Communauté',
          description: 'Échange avec d’autres personnes qui découvrent et créent.',
        },
        {
          title: 'Défis créatifs',
          description: 'Trouve de nouvelles idées et garde l’envie d’essayer.',
        },
      ],
    },
    badge: 'L’EXPÉRIENCE COMPLÈTE',
    cadence: 'Une box créative surprise chaque mois + accès à l’application',
    finalCtaLabel: 'Être informé du lancement',
    future: {
      productHandle: null,
      sellingPlanId: null,
      subscriptionKind: 'box-app',
    },
    included: [
      'Tout ce qui est inclus dans la box créative',
      'Tutoriels vidéo pas à pas',
      'Suivi de ta progression',
      'Accès à la communauté',
      'Défis et inspirations créatives',
      'Contenus exclusifs liés à ton activité',
    ],
    label: 'Le plus complet',
    media: {
      alt: 'Box + accès à l’application My Hobbees',
      src: boxMyHobbees,
    },
    reassurance:
      'Aucun paiement aujourd’hui : sois informé·e dès l’ouverture de cette formule et de l’application.',
    seo: {
      title: 'Box + accès à l’application — My Hobbees',
      description:
        'Profite de la formule complète My Hobbees : une box créative surprise chaque mois, des tutoriels vidéo, une communauté et des contenus exclusifs.',
    },
    slug: 'box-app',
    tagline:
      'Reçois ta box créative surprise et prolonge l’expérience dans l’application My Hobbees.',
    title: 'Box + accès à l’application',
  },
  'app-only': {
    badge: '100% APPLICATION',
    cadence: 'Accès continu à l’application, sans box mensuelle',
    editorial: {
      title: 'Apprends à ton rythme, sans attendre la prochaine box',
      description:
        'Envie d’avancer tout de suite ? Le parcours d’apprentissage te donne accès à toutes les ressources de l’application My Hobbees, sans attendre l’envoi d’une box.',
    },
    finalCtaLabel: 'Être informé du lancement',
    future: {
      productHandle: null,
      sellingPlanId: null,
      subscriptionKind: null,
    },
    included: [
      'Accès complet à l’application My Hobbees',
      'Tutoriels vidéo pas à pas',
      'Suivi de ta progression',
      'Accès à la communauté créative',
      'Défis et inspirations créatives chaque mois',
      'Contenus exclusifs liés à chaque activité',
    ],
    media: {
      alt: 'Application My Hobbees',
      src: boxMyHobbees,
    },
    reassurance:
      'Aucun paiement aujourd’hui : sois informé·e dès l’ouverture de ce parcours.',
    seo: {
      title: 'Parcours d’apprentissage — My Hobbees',
      description:
        'Découvre le parcours d’apprentissage My Hobbees : l’application, ses tutoriels vidéo et sa communauté, sans box mensuelle.',
    },
    slug: 'app-only',
    tagline:
      'Progresse à ton rythme grâce à l’application My Hobbees, sans recevoir de box physique.',
    title: 'Parcours d’apprentissage',
  },
};
