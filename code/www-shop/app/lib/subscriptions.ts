export type SubscriptionKind = 'box' | 'box-app';

interface SubscriptionSignals {
  productType?: string | null;
  subscriptionTier?: {value?: string | null} | null;
  tags?: readonly string[] | null;
}

const BOX_APP_SIGNALS = new Set([
  'box-app',
  'box_creative_app',
  'subscription-box-app',
  'subscription + app',
  'abonnement + application',
  'my-hobbees:subscription-box-app',
  'my hobbees subscription + app',
]);

const BOX_SIGNALS = new Set([
  'box',
  'box_creative',
  'subscription',
  'subscription-box',
  'abonnement',
  'my-hobbees:subscription-box',
  'my hobbees subscription',
]);

export function getSubscriptionKind({
  productType,
  subscriptionTier,
  tags,
}: SubscriptionSignals): SubscriptionKind | null {
  const signals = [subscriptionTier?.value, productType, ...(tags ?? [])]
    .filter((signal): signal is string => Boolean(signal))
    .map(normalizeSignal);

  if (signals.some((signal) => BOX_APP_SIGNALS.has(signal))) return 'box-app';
  if (signals.some((signal) => BOX_SIGNALS.has(signal))) return 'box';

  return null;
}

export function getSubscriptionCtaLabel(kind: SubscriptionKind | null) {
  if (kind === 'box-app') return 'Choisir l’expérience complète';
  if (kind === 'box') return 'Choisir cette formule';
  return 'Ajouter au panier';
}

function normalizeSignal(signal: string) {
  return signal.trim().toLocaleLowerCase('fr');
}
