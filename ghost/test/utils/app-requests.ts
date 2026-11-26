import type { AppPermissionKey } from '@tryghost/app-contracts';
import {
  checkAdminApiRequest,
  type AdminApiRequestCheck,
  type FetchMethod,
} from '@tryghost/app-contracts/bridge';

const API_ROOT = new URL('https://site.example/ghost/api/admin/');

/** A request as an app asks Admin's bridge to make it: a path within the Admin API. */
export interface AppRequest {
  method: FetchMethod;
  /** As an app writes it, from the API's root: `/posts/?limit=5` */
  path: string;
  body?: unknown;
}

export interface AppAnswer {
  status: number;
  body: any;
}

type Agent = Record<string, (path: string) => any>;

/**
 * Sends requests to the Admin API with an app's token, for an app approved for `scopes`: past
 * Admin's bridge, as the app wrote them, or through its check, as Admin sends them. The apps
 * suites share it, so a test of what the bridge does and a test of what the server does without
 * it send the same request.
 */
export function appRequests(agent: Agent, token: string, scopes: readonly AppPermissionKey[]) {
  async function send(method: FetchMethod, path: string, body: unknown): Promise<AppAnswer> {
    let request = agent[method.toLowerCase()](path.replace(/^\//, '')).header(
      'Authorization',
      `Bearer ${token}`,
    );
    if (body !== undefined) {
      request = request.body(body);
    }
    const response = await request;
    return { status: response.statusCode, body: response.body };
  }

  /** What Admin's bridge makes of the request, before anything is sent. */
  const check = ({ method, path, body }: AppRequest): AdminApiRequestCheck =>
    checkAdminApiRequest(
      { path, method, body: body === undefined ? undefined : JSON.stringify(body) },
      API_ROOT,
      new Set(scopes),
    );

  return {
    check,

    /** The server's answer to the request as the app wrote it, without the bridge. */
    raw: ({ method, path, body }: AppRequest) => send(method, path, body),

    /** As Admin sends it: refused by the bridge, or the server's answer to what the bridge sent. */
    async bridged(
      request: AppRequest,
    ): Promise<AppAnswer | { refused: 'invalid_path' | 'blocked' }> {
      const checked = check(request);
      if (checked.problem) {
        return { refused: checked.problem };
      }
      return send(request.method, `${checked.pathname}${checked.url.search}`, request.body);
    },
  };
}
