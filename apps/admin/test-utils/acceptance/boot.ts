import { HttpResponse } from 'msw';
import {
  activeThemeResponse,
  browseResponse,
  configResponse,
  currentUserResponse,
  settingsResponse,
  siteResponse,
} from '@tryghost/test-data';

import {
  fakeAdminEndpoint,
  registerAdminApiHandler,
  registerRoute,
  type EndpointCapture,
} from './worker';

type CurrentUser = ReturnType<typeof currentUserResponse>;

// Ghost persists a user edit, so a client that re-reads before writing sees its
// own earlier writes. Hold the faked user for the duration of one test rather
// than minting a fresh copy per request, or a second write would be based on a
// user missing the first.
let currentUser: CurrentUser | null = null;

function fakedCurrentUser(): CurrentUser {
  currentUser ??= currentUserResponse();
  return currentUser;
}

/**
 * Replaces the faked user, so a boot override and later writes share one copy.
 * Takes a copy: a spec builds its user objects up front and reuses them in its
 * assertions, which a faked write must not reach into.
 */
export function seedFakedCurrentUser(response: CurrentUser): void {
  currentUser = structuredClone(response);
}

/**
 * Applies a faked user edit, the way Ghost persists one.
 *
 * Only an edit of the current user is kept: a staff edit of somebody else that
 * reaches this handler would otherwise assign that user's fields, id included,
 * over the one `/users/me/` serves for the rest of the test.
 */
export function applyFakedUserEdit(body: unknown, url?: string): CurrentUser {
  const edited = (body as { users?: Array<Record<string, unknown>> } | undefined)?.users?.[0] ?? {};
  const user = fakedCurrentUser().users[0];

  if (url && !editsCurrentUser(url, user)) {
    return { users: [{ ...user, ...edited }] };
  }

  Object.assign(user, edited);

  return { users: [user] };
}

function editsCurrentUser(url: string, user: { id?: string }): boolean {
  const editedId = /\/users\/([^/]+)\//.exec(url)?.[1];

  return editedId === undefined || editedId === 'me' || editedId === user.id;
}

/** Drops the faked user's state between tests. */
export function resetFakedCurrentUser(): void {
  currentUser = null;
}

/**
 * The requests the admin shell fires on boot regardless of route, handled by
 * default so specs never mention them. Override per test keyed by entry
 * name: `renderAdminApp("/", {boot: {browseMe: {response: ...}}})`. Canned
 * responses come from @tryghost/test-data; this harness must not import test
 * data from admin-x-framework.
 */
export interface BootRequestConfig {
  method: string;
  path: string | RegExp;
  /** The JSON response — or a function of the request for the rare entry that must react to its payload. */
  response: unknown;
  responseStatus?: number;
}

// A function so every lookup serves freshly-minted responses — mutations
// can't leak between tests.
export function defaultBootRequests() {
  return {
    browseSettings: {
      method: 'GET',
      path: /^\/settings\/\?group=/,
      response: settingsResponse(),
    },
    browseConfig: {
      method: 'GET',
      path: '/config/',
      response: configResponse(),
    },
    browseSite: {
      method: 'GET',
      path: '/site/',
      response: siteResponse(),
    },
    browseMe: {
      method: 'GET',
      path: '/users/me/?include=roles',
      response: () => fakedCurrentUser(),
    },
    browseMembersCount: {
      method: 'GET',
      path: '/members/?limit=1',
      response: browseResponse('members', [], { limit: 1 }),
    },
    browseActiveTheme: {
      method: 'GET',
      path: '/themes/active/',
      response: activeThemeResponse(),
    },
    editUserPreferences: {
      method: 'PUT',
      path: /^\/users\/\w+\/\?include=roles/,
      // The framework caches this response as the current user, so a
      // canned reply would wipe the client's write — echo the body, and
      // keep it for the reads that follow.
      response: async (request: Request) =>
        applyFakedUserEdit(await request.clone().json(), request.url),
    },
  } satisfies Record<string, BootRequestConfig>;
}

export type BootRequestName = keyof ReturnType<typeof defaultBootRequests>;

/** Per-entry overrides, merged onto the named default; the default's method/path stay. */
export type BootOverrides = Partial<
  Record<BootRequestName, Partial<Pick<BootRequestConfig, 'response' | 'responseStatus'>>>
>;

/**
 * Captures the preference writes a spec wants to assert on, and keeps them, so
 * the reads that follow serve the written state like Ghost does. A capture that
 * only echoed the body would leave Admin re-reading a user without its own
 * earlier writes.
 */
export function fakePreferenceEdits(): EndpointCapture {
  return fakeAdminEndpoint('PUT', /^\/users\/\w+\/\?include=roles/, ({ body, url }) =>
    applyFakedUserEdit(body, url),
  );
}

/** "METHOD path" descriptions of the boot table, for the worker's 418 route listing. */
export function defaultBootRoutes(): string[] {
  return Object.values(defaultBootRequests()).map(({ method, path }) => `${method} ${path}`);
}

function matches(config: BootRequestConfig, method: string, apiPath: string): boolean {
  if (config.method !== method) {
    return false;
  }
  return typeof config.path === 'string' ? config.path === apiPath : config.path.test(apiPath);
}

async function respond(config: BootRequestConfig, request: Request): Promise<Response> {
  const body =
    typeof config.response === 'function'
      ? await (config.response as (request: Request) => Promise<unknown>)(request)
      : config.response;

  return HttpResponse.json(body as Record<string, unknown>, {
    status: config.responseStatus ?? 200,
  });
}

/** The persistent lowest-priority resolver for the boot table; runtime handlers and overrides win. */
export async function defaultBootResolver(
  request: Request,
  apiPath: string,
): Promise<Response | undefined> {
  const config = Object.values(defaultBootRequests()).find((entry) =>
    matches(entry, request.method, apiPath),
  );
  return config ? await respond(config, request) : undefined;
}

/** Register per-test boot overrides (higher priority than the defaults). */
export function installBootOverrides(requestedOverrides: BootOverrides): void {
  let overrides = requestedOverrides;
  // A spec that overrides the user hands over a static response object; seed
  // the mutable copy from it and serve that, so the writes that follow are
  // visible to the reads that follow them.
  const seededUser = overrides.browseMe?.response;
  if (seededUser && typeof seededUser !== 'function') {
    seedFakedCurrentUser(seededUser as CurrentUser);
    overrides = {
      ...overrides,
      browseMe: { ...overrides.browseMe, response: () => fakedCurrentUser() },
    };
  }

  const defaults = defaultBootRequests();
  const entries = Object.entries(overrides)
    .filter(([, override]) => Boolean(override))
    .map(([name, override]) => ({ ...defaults[name as BootRequestName], ...override }));

  for (const config of entries) {
    registerRoute(config.method, config.path);
  }

  registerAdminApiHandler(async (request, apiPath) => {
    const config = entries.find((entry) => matches(entry, request.method, apiPath));
    return config ? await respond(config, request) : undefined;
  });
}
