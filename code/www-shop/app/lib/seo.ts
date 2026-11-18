/**
 * Shared, framework-agnostic SEO building blocks: absolute canonical URLs,
 * Open Graph/Twitter meta entries, and a schema.org Organization/WebSite
 * JSON-LD serializer. Plain functions so both `root.tsx`'s loader and any
 * route's loader/meta function can use them without a React dependency.
 */

export function canonicalUrl(request: Request, path?: string): string {
  const url = new URL(request.url);
  const pathname = path ?? url.pathname;
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const origin = process.env.PUBLIC_SITE_URL
    ? new URL(process.env.PUBLIC_SITE_URL).origin
    : url.origin;
  return `${origin}${normalizedPath}`;
}

export interface OpenGraphTagsOptions {
  title: string;
  description?: string;
  url: string;
  image?: string;
  type?: 'website' | 'product' | 'article';
}

export type MetaTagEntry =
  | {property: string; content: string}
  | {name: string; content: string};

export function buildOpenGraphTags(
  opts: OpenGraphTagsOptions,
): MetaTagEntry[] {
  const tags: MetaTagEntry[] = [
    {property: 'og:title', content: opts.title},
    ...(opts.description
      ? [{property: 'og:description', content: opts.description}]
      : []),
    {property: 'og:url', content: opts.url},
    {property: 'og:type', content: opts.type ?? 'website'},
    {
      name: 'twitter:card',
      content: opts.image ? 'summary_large_image' : 'summary',
    },
    {name: 'twitter:title', content: opts.title},
    ...(opts.description
      ? [{name: 'twitter:description', content: opts.description}]
      : []),
  ];

  if (opts.image) {
    tags.push({property: 'og:image', content: opts.image});
    tags.push({name: 'twitter:image', content: opts.image});
  }

  return tags;
}

export interface OrganizationJsonLdShop {
  name: string;
  description?: string | null;
  url: string;
  logo?: string | null;
}

export function organizationJsonLd(shop: OrganizationJsonLdShop): string {
  const organization: Record<string, unknown> = {
    '@type': 'Organization',
    name: shop.name,
    url: shop.url,
  };
  if (shop.description) organization.description = shop.description;
  if (shop.logo) organization.logo = shop.logo;

  const website: Record<string, unknown> = {
    '@type': 'WebSite',
    name: shop.name,
    url: shop.url,
  };

  return escapeJsonLdForHtml(
    JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [organization, website],
    }),
  );
}

/**
 * Escapes a JSON-LD string for safe inlining into a raw `<script>` tag via
 * `dangerouslySetInnerHTML`, where React does not sanitize the content.
 * Guards against premature `</script>` termination and HTML-sensitive
 * characters, plus the U+2028/U+2029 line/paragraph separators that are
 * valid in JSON but illegal inside a JS string literal in some parsers.
 */
function escapeJsonLdForHtml(json: string): string {
  return json
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
