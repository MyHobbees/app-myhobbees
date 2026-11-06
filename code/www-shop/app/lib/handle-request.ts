import {createRequestHandler, storefrontRedirect} from '@shopify/hydrogen';
import type {ServerBuild} from 'react-router';
import {createHydrogenRouterContext} from '~/lib/context';

/**
 * Shared between the production entry (`server.ts`, static `build` import)
 * and the local dev server (`server.dev.ts`, `build` reloaded per request via
 * Vite's `ssrLoadModule` for HMR) — same Hydrogen wiring either way.
 */
export async function handleRequest(
  request: Request,
  build: ServerBuild,
): Promise<Response> {
  try {
    const hydrogenContext = await createHydrogenRouterContext(request);

    const handleRouterRequest = createRequestHandler({
      build,
      mode: process.env.NODE_ENV,
      getLoadContext: () => hydrogenContext,
    });

    const response = await handleRouterRequest(request);

    if (hydrogenContext.session.isPending) {
      response.headers.set(
        'Set-Cookie',
        await hydrogenContext.session.commit(),
      );
    }

    if (response.status === 404) {
      /**
       * Check for redirects only when there's a 404 from the app.
       * If the redirect doesn't exist, then `storefrontRedirect`
       * will pass through the 404 response.
       */
      return storefrontRedirect({
        request,
        response,
        storefront: hydrogenContext.storefront,
      });
    }

    return response;
  } catch (error) {
    console.error(error);
    return new Response('An unexpected error occurred', {status: 500});
  }
}
