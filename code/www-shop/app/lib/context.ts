import {createHydrogenContext} from '@shopify/hydrogen';
import {AppSession} from '~/lib/session';
import {CART_QUERY_FRAGMENT} from '~/lib/fragments';
import type {CartApiQueryFragment} from 'storefrontapi.generated';

interface Env {
  SESSION_SECRET: string;
  PUBLIC_STORE_DOMAIN: string;
  PUBLIC_STOREFRONT_API_TOKEN: string;
  PUBLIC_STOREFRONT_ID: string;
  PUBLIC_CHECKOUT_DOMAIN: string;
  PUBLIC_POSTHOG_KEY: string;
  PUBLIC_POSTHOG_HOST: string;
  // Required by Hydrogen's `HydrogenEnv`, unused (no Customer Account API login configured yet).
  PRIVATE_STOREFRONT_API_TOKEN: string;
  PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: string;
  PUBLIC_CUSTOMER_ACCOUNT_API_URL: string;
  SHOP_ID: string;
}

// Define the additional context object
const additionalContext = {
  // Additional context for custom properties, CMS clients, 3P SDKs, etc.
  // These will be available as both context.propertyName and context.get(propertyContext)
  // Example of complex objects that could be added:
  // cms: await createCMSClient(env),
  // reviews: await createReviewsClient(env),
} as const;

// Automatically augment HydrogenAdditionalContext with the additional context type
type AdditionalContextType = typeof additionalContext;

declare global {
  interface HydrogenAdditionalContext extends AdditionalContextType {}

  // Augment HydrogenCustomCartFragment with the codegen'd cart fragment type so
  // that context.cart.get() and all cart mutations return the extended cart type.
  interface HydrogenCustomCartFragment extends CartApiQueryFragment {}

  // Extend Hydrogen's base Env with our own custom env vars (not part of HydrogenEnv).
  interface Env {
    PUBLIC_POSTHOG_KEY: string;
    PUBLIC_POSTHOG_HOST: string;
  }
}

/**
 * Creates Hydrogen context for React Router 7.16.x, running on Node (Vercel).
 * Returns HydrogenRouterContextProvider with hybrid access patterns.
 *
 * No `cache`/`waitUntil` here: both are optional in `createHydrogenContext`
 * and rely on runtime APIs (the Cache API, Workers' ExecutionContext) that
 * only exist on Oxygen/Workers, not on a Node server.
 */
export async function createHydrogenRouterContext(request: Request) {
  const env: Env = {
    SESSION_SECRET: process.env.SESSION_SECRET ?? '',
    PUBLIC_STORE_DOMAIN: process.env.PUBLIC_STORE_DOMAIN ?? '',
    PUBLIC_STOREFRONT_API_TOKEN: process.env.PUBLIC_STOREFRONT_API_TOKEN ?? '',
    PUBLIC_STOREFRONT_ID: process.env.PUBLIC_STOREFRONT_ID ?? '',
    PUBLIC_CHECKOUT_DOMAIN: process.env.PUBLIC_CHECKOUT_DOMAIN ?? '',
    PUBLIC_POSTHOG_KEY: process.env.PUBLIC_POSTHOG_KEY ?? '',
    PUBLIC_POSTHOG_HOST: process.env.PUBLIC_POSTHOG_HOST ?? '',
    PRIVATE_STOREFRONT_API_TOKEN: process.env.PRIVATE_STOREFRONT_API_TOKEN ?? '',
    PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID:
      process.env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID ?? '',
    PUBLIC_CUSTOMER_ACCOUNT_API_URL:
      process.env.PUBLIC_CUSTOMER_ACCOUNT_API_URL ?? '',
    SHOP_ID: process.env.SHOP_ID ?? '',
  };

  if (!env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }

  const session = await AppSession.init(request, [env.SESSION_SECRET]);

  const storefrontConfigured = Boolean(
    env.PUBLIC_STORE_DOMAIN && env.PUBLIC_STOREFRONT_API_TOKEN,
  );
  const resolvedEnv = storefrontConfigured
    ? env
    : {...env, PUBLIC_STORE_DOMAIN: '', PUBLIC_STOREFRONT_API_TOKEN: ''};

  const hydrogenContext = createHydrogenContext(
    {
      env: resolvedEnv,
      request,
      session,
      // Or detect from URL path based on locale subpath, cookies, or any other strategy
      i18n: {language: 'FR', country: 'FR'},
      cart: {
        queryFragment: CART_QUERY_FRAGMENT,
      },
    },
    additionalContext,
  );

  return hydrogenContext;
}
