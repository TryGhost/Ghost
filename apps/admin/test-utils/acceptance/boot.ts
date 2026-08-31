import { HttpResponse } from 'msw';
import {
  activeThemeResponse,
  browseResponse,
  configResponse,
  currentUserResponse,
  settingsResponse,
  siteResponse,
} from '@tryghost/test-data';

import { registerAdminApiHandler, registerRoute } from './worker';

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
      response: currentUserResponse(),
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
      // canned reply would wipe the client's write — echo the body.
      response: async (request: Request) => {
        const body = (await request.clone().json()) as { users?: Array<Record<string, unknown>> };
        const { users } = currentUserResponse();
        return { users: [{ ...users[0], ...body.users?.[0] }] };
      },
    },
  } satisfies Record<string, BootRequestConfig>;
}

export type BootRequestName = keyof ReturnType<typeof defaultBootRequests>;

/** Per-entry overrides, merged onto the named default; the default's method/path stay. */
export type BootOverrides = Partial<
  Record<BootRequestName, Partial<Pick<BootRequestConfig, 'response' | 'responseStatus'>>>
>;

/** "METHOD path" descriptions of the boot table, for the worker's 418 route listing. */
export function defaultBootRoutes(): string[] {
  return Object.values(defaultBootRequests()).map(({ method, path }) => `${method} ${path}`);
}

type LabsFlags = Record<string, boolean>;
type BootOverride = NonNullable<BootOverrides[BootRequestName]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseLabsSettingValue(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string') {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

// Unrecognized bodies (error envelopes, non-objects) pass through untouched;
// recognized ones are clone-and-merged — never mutate a test-owned object.
function mergeLabsIntoConfigBody(body: unknown, labs: LabsFlags): unknown {
  if (!isRecord(body) || !isRecord(body.config)) {
    return body;
  }
  const existing = isRecord(body.config.labs) ? body.config.labs : {};
  return { ...body, config: { ...body.config, labs: { ...existing, ...labs } } };
}

function mergeLabsIntoSettingsBody(body: unknown, labs: LabsFlags): unknown {
  if (!isRecord(body) || !Array.isArray(body.settings)) {
    return body;
  }
  let found = false;
  const settings = body.settings.map((entry: unknown) => {
    if (!isRecord(entry) || entry.key !== 'labs') {
      return entry;
    }
    found = true;
    return { ...entry, value: JSON.stringify({ ...parseLabsSettingValue(entry.value), ...labs }) };
  });
  if (!found) {
    settings.push(...settingsResponse({ labs }).settings.filter(({ key }) => key === 'labs'));
  }
  return { ...body, settings };
}

function withMergedLabs(
  override: BootOverride,
  merge: (body: unknown) => unknown,
  fallback: () => unknown,
): BootOverride {
  const { response } = override;
  if (response === undefined) {
    return { ...override, response: fallback() };
  }
  if (typeof response === 'function') {
    return {
      ...override,
      response: async (request: Request) =>
        merge(await (response as (request: Request) => unknown)(request)),
    };
  }
  return { ...override, response: merge(response) };
}

/**
 * The `labs` render option compiled onto the boot overrides: `browseConfig`/
 * `browseSettings` overrides get the flags merged into their responses
 * (flags named in `labs` win); absent entries get the canned test-data
 * responses with the flags applied.
 */
export function composeLabsBootOverrides(labs: LabsFlags, boot: BootOverrides = {}): BootOverrides {
  return {
    ...boot,
    browseConfig: withMergedLabs(
      boot.browseConfig ?? {},
      (body) => mergeLabsIntoConfigBody(body, labs),
      () => configResponse({ labs }),
    ),
    browseSettings: withMergedLabs(
      boot.browseSettings ?? {},
      (body) => mergeLabsIntoSettingsBody(body, labs),
      () => settingsResponse({ labs }),
    ),
  };
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
export function installBootOverrides(overrides: BootOverrides): void {
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
