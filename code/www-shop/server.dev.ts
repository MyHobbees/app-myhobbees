import * as http from 'node:http';
import {createRequestListener} from '@mjackson/node-fetch-server';
import {createServer as createViteServer} from 'vite';

/**
 * Local dev server. `react-router dev` alone cannot inject a custom
 * `getLoadContext` (the Hydrogen context) in this React Router version, so
 * `npm run dev` 500s on every route that touches `context.storefront`/`cart`
 * — see https://github.com/remix-run/react-router/discussions/14508. This
 * runs Vite in middleware mode for assets/HMR, then falls back to the same
 * `handleRequest` the production `server.ts` uses, reloading the server
 * build per request via `ssrLoadModule` so loader/action edits hot-reload.
 */
process.env.NODE_ENV ??= 'development';

const PORT = Number(process.env.PORT) || 3000;

const viteDevServer = await createViteServer({
  server: {middlewareMode: true},
  appType: 'custom',
});

const nodeHandler = createRequestListener(async (request) => {
  const build = await viteDevServer.ssrLoadModule(
    'virtual:react-router/server-build',
  );
  const {handleRequest} = await viteDevServer.ssrLoadModule(
    './app/lib/handle-request.ts',
  );
  return handleRequest(request, build);
});

const httpServer = http.createServer((req, res) => {
  viteDevServer.middlewares(req, res, () => nodeHandler(req, res));
});

httpServer.listen(PORT, () => {
  console.warn(`Dev server running on http://localhost:${PORT}`);
});
