import {createCookie} from 'react-router';

/**
 * First-touch acquisition attribution. UTM params and the external referrer
 * only exist on the request that lands the visitor on the site — by the time
 * they reach /me-prevenir (often via an in-site link with no query string,
 * or a same-origin form POST whose Referer is just that page), both are
 * gone. Captured once in root.tsx's loader and read back wherever needed.
 */
export const attributionCookie = createCookie('mh_attribution', {
  path: '/',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 30,
});

export interface Attribution {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  referrer: string;
}

export async function readAttribution(
  request: Request,
): Promise<Attribution | null> {
  const value = await attributionCookie.parse(request.headers.get('Cookie'));
  return (value as Attribution | null) ?? null;
}

export function captureAttribution(
  url: URL,
  referrer: string,
): Attribution | null {
  const utmSource = url.searchParams.get('utm_source') ?? '';
  const utmMedium = url.searchParams.get('utm_medium') ?? '';
  const utmCampaign = url.searchParams.get('utm_campaign') ?? '';
  if (!utmSource && !utmMedium && !utmCampaign && !referrer) return null;
  return {utmSource, utmMedium, utmCampaign, referrer};
}
