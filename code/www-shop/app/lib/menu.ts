function getDomainHost(domain: string) {
  if (!domain) return null;

  try {
    const url = domain.includes('://') ? domain : `https://${domain}`;
    return new URL(url).host;
  } catch {
    return null;
  }
}

export function getMenuItemUrl(
  url: string,
  primaryDomainUrl: string,
  publicStoreDomain: string,
) {
  if (url.startsWith('/')) return url;

  const menuUrl = new URL(url, primaryDomainUrl);
  const primaryHost = getDomainHost(primaryDomainUrl);
  const publicHost = getDomainHost(publicStoreDomain);
  const isInternal =
    menuUrl.host === primaryHost ||
    menuUrl.host === publicHost ||
    menuUrl.hostname.endsWith('.myshopify.com');

  if (!isInternal) return url;

  return `${menuUrl.pathname}${menuUrl.search}${menuUrl.hash}`;
}
