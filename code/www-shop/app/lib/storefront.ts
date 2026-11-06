function getStorefrontHostname(storeDomain?: string | null) {
  if (!storeDomain) return null;

  try {
    const url = storeDomain.includes('://')
      ? storeDomain
      : `https://${storeDomain}`;
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function isMockShop(storeDomain?: string | null) {
  const hostname = getStorefrontHostname(storeDomain);
  return !hostname || hostname === 'mock.shop' || hostname.endsWith('.mock.shop');
}

export function shouldUseFallbackMenu(
  storeDomain: string | null | undefined,
  menuItemCount: number,
) {
  return isMockShop(storeDomain) || menuItemCount === 0;
}
