import * as serverBuild from 'virtual:react-router/server-build';
import {handleRequest} from '~/lib/handle-request';

/**
 * Custom server entry for Vercel's React Router preset: a plain
 * `(request) => Response` function (no Workers-style `env`/`executionContext`
 * module format), per https://vercel.com/docs/frameworks/frontend/react-router.
 */
export default function handler(request: Request): Promise<Response> {
  return handleRequest(request, serverBuild);
}
