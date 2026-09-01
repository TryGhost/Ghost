import { HttpResponse } from 'msw';
import type { Action } from '@tryghost/admin-x-framework/api/actions';
import type { Integration } from '@tryghost/admin-x-framework/api/integrations';
import {
  activeThemeResponse,
  browseResponse,
  currentUserResponse,
  settingsResponse,
  type Automation,
  type Comment,
  type Label,
  type Member,
  type Newsletter,
  type Offer,
  type Post,
  type SettingsResponse,
  type StaffInvite,
  type StaffRole,
  type StaffUser,
  type Tag,
  type Theme,
  type Tier,
} from '@tryghost/test-data';

import {
  fakeAdminEndpoint,
  record418,
  registerAdminApiHandler,
  registerRoute,
  type EndpointCapture,
} from './worker';

export interface BrowseQuery {
  /** Full request URL, for raw assertions on encoding. */
  url: string;
  /** Decoded ?filter param (NQL), if present. */
  filter?: string;
  /** Decoded ?search param, if present. */
  search?: string;
  /** Decoded ?order param (e.g. "created_at desc"), if present. */
  order?: string;
  page: number;
  limit: number | 'all';
}

export interface ResourceCapture {
  /** Every matched browse request, oldest first. */
  requests: BrowseQuery[];
  readonly lastRequest: BrowseQuery | undefined;
}

/** The entities to serve: one world for every request, or per-request via a function of the parsed query. */
export type RespondWith<TEntity> = TEntity[] | ((query: BrowseQuery) => TEntity[]);

/** How much query behavior the fake implements — see THE RULE on `defineResource`. */
export type ResourceSemantics<TEntity> =
  | {
      kind: 'declared-query';
      /** The filter component keys `select` consumes (e.g. `["visibility"]`); anything else responds 418. */
      covers: string[];
      /** Trivial declared query semantics applied to the declared entities before pagination. */
      select: (entities: TEntity[], query: BrowseQuery) => TEntity[];
    }
  | { kind: 'passthrough' };

export interface ResourceOptions<TEntity> {
  /** Admin API path segment and envelope key, e.g. 'tags' → GET /tags/. */
  resource: string;
  /** Envelope key when it differs from the path segment (e.g. 'members/custom_fields' → members_custom_fields). */
  envelopeKey?: string;
  semantics: ResourceSemantics<TEntity>;
  /** Browse paths to leave to lower-priority handlers (shell chrome like the sidebar count probe). */
  skip?: (apiPath: string) => boolean;
}

function parseBrowseQuery(request: Request): BrowseQuery {
  const url = new URL(request.url);
  const params = url.searchParams;
  const rawLimit = params.get('limit');

  return {
    url: request.url,
    filter: params.get('filter') ?? undefined,
    search: params.get('search') ?? undefined,
    order: params.get('order') ?? undefined,
    page: Number(params.get('page') ?? '1'),
    limit: rawLimit === 'all' ? 'all' : rawLimit ? Number(rawLimit) : 15,
  };
}

/**
 * Split the filter into top-level `+` components and return those whose key
 * `covers` doesn't include; components that aren't a simple `key:value` count
 * as uncovered (NQL grouping is out of scope).
 */
function uncoveredFilterComponents(filter: string | undefined, covers: string[]): string[] {
  if (!filter) {
    return [];
  }

  const components: string[] = [];
  let componentStart = 0;
  let quote: "'" | '"' | undefined;

  for (let index = 0; index < filter.length; index += 1) {
    const character = filter[index];

    if (quote) {
      if (character === quote && filter[index - 1] !== '\\') {
        quote = undefined;
      }
    } else if (character === "'" || character === '"') {
      quote = character;
    } else if (character === '+') {
      components.push(filter.slice(componentStart, index));
      componentStart = index + 1;
    }
  }

  components.push(filter.slice(componentStart));

  return components.filter((component) => {
    const key = component.match(/^([\w.]+):/)?.[1];
    return !key || !covers.includes(key);
  });
}

/**
 * Define a fake for one admin API list resource. The returned function
 * registers a handler owning the resource's browse URL: it records each
 * parsed query on the returned capture and serves the declared entities in
 * the Ghost list envelope (which slices pagination itself).
 *
 * THE RULE: a resource fake may implement trivial declared query behaviors —
 * only echoing back a slice of exactly what the spec declared (a field
 * match, page/limit slicing) — but NEVER NQL. Two semantics:
 *
 *   - `{kind: "passthrough"}` — serves exactly the declared entities, never
 *     interprets the query. For NQL-filtered lists the spec declares the
 *     response (per-request via a function of the query) and asserts the
 *     outgoing filter string: that serialization is the behavior under test,
 *     and re-implementing NQL in the fake would test the fake.
 *   - `{kind: "declared-query", covers, select}` — `select` applies the
 *     trivial behaviors; filter components outside `covers` respond 418
 *     instead of silently serving the full world.
 */
export function defineResource<TEntity>({
  resource,
  envelopeKey = resource,
  semantics,
  skip,
}: ResourceOptions<TEntity>) {
  return function fakeResource(respondWith: RespondWith<TEntity>): ResourceCapture {
    const requests: BrowseQuery[] = [];

    registerRoute('GET', `/${resource}/?…`);
    registerAdminApiHandler((request, apiPath) => {
      const isBrowse =
        request.method === 'GET' &&
        (apiPath === `/${resource}/` || apiPath.startsWith(`/${resource}/?`));
      if (!isBrowse || skip?.(apiPath)) {
        return undefined;
      }

      const query = parseBrowseQuery(request);
      requests.push(query);

      const declared = typeof respondWith === 'function' ? respondWith(query) : respondWith;

      let matching = declared;
      if (semantics.kind === 'declared-query') {
        const uncovered = uncoveredFilterComponents(query.filter, semantics.covers);
        if (uncovered.length > 0) {
          record418(
            `${request.method} ${apiPath} — filter component(s) not covered by declared semantics: ${uncovered.join(', ')}`,
          );
          return new HttpResponse(
            [
              `Declared semantics for '${resource}' only cover ${semantics.covers.map((key) => `\`${key}:\``).join(', ')};`,
              `this request's filter contains: ${uncovered.join(', ')}.`,
              'Use passthrough mode (declare the response with a function of the query) for this spec.',
            ].join(' '),
            { status: 418 },
          );
        }
        matching = semantics.select(declared, query);
      }

      return HttpResponse.json(
        browseResponse(envelopeKey, matching, {
          page: query.page,
          limit: query.limit,
        }),
      );
    });

    return {
      requests,
      get lastRequest() {
        return requests[requests.length - 1];
      },
    };
  };
}

/** Tags list fake: declared-query semantics for the tags tabs and remote tag pickers. */
export const fakeTags = defineResource<Tag>({
  resource: 'tags',
  semantics: {
    kind: 'declared-query',
    covers: ['visibility', 'tags.name'],
    select: (tags, { filter }) => {
      const visibility = filter?.match(/(?:^|\+)visibility:(\w+)/)?.[1];
      return visibility ? tags.filter((tag) => tag.visibility === visibility) : tags;
    },
  },
});

/** Automations list fake: the browse request carries no query the fake would need to interpret. */
export const fakeAutomations = defineResource<Automation>({
  resource: 'automations',
  semantics: { kind: 'passthrough' },
});

/**
 * Comments list fake (passthrough): the main list and the thread sidebar's
 * reply queries share this browse endpoint, differing only in the NQL filter
 * — declare per-request responses with a function of the query. The
 * single-comment read (`GET /comments/<id>/`) is not a browse path; declare
 * it with `fakeAdminEndpoint` when the thread sidebar is under test.
 */
export const fakeComments = defineResource<Comment>({
  resource: 'comments',
  semantics: { kind: 'passthrough' },
});

/** The sidebar's global member-count probe — shell chrome, served by the boot table. */
const MEMBER_COUNT_PROBE_PATH = '/members/?limit=1';

const membersResource = defineResource<Member>({
  resource: 'members',
  semantics: { kind: 'passthrough' },
  // Leave the sidebar count probe to the boot table so it never pollutes
  // `lastRequest` assertions.
  skip: (apiPath) => apiPath === MEMBER_COUNT_PROBE_PATH,
});

/**
 * Member custom-field DEFINITIONS fake (passthrough): serves the declared
 * field definitions (`@tryghost/admin-x-framework/api/member-custom-fields`
 * shape) for every browse — the plain read and Settings' archived-inclusive
 * `?filter=status:[active,archived]` variant alike; assert the outgoing
 * filter, not served subsets. Values ride the member read payload, and the
 * create/edit/reorder/delete mutations are one-off endpoints — declare those
 * with `fakeAdminEndpoint`. A spec observing the list grow across a create
 * declares that growth itself via the function form (`() => fields`).
 */
const memberCustomFieldsResource = defineResource({
  resource: 'members/custom_fields',
  envelopeKey: 'members_custom_fields',
  semantics: { kind: 'passthrough' },
});

// Whether a spec declared its own definitions. `fakeMembers` serves an empty list on
// behalf of the many specs that never mention custom fields, and handlers registered
// later win, so seeding unconditionally would silently replace a list the spec had
// already declared — and its capture would then never see a request.
let memberCustomFieldsDeclared = false;

export const fakeMemberCustomFields: typeof memberCustomFieldsResource = (respondWith) => {
  memberCustomFieldsDeclared = true;
  return memberCustomFieldsResource(respondWith);
};

/** Called by the harness between tests, alongside the fake API reset. */
export function resetDeclaredResources(): void {
  memberCustomFieldsDeclared = false;
}

// Members-page chrome: the filter bar mounts with the page and probes these lookups.
const labelsResource = defineResource<Label>({
  resource: 'labels',
  semantics: { kind: 'passthrough' },
});
const newslettersResource = defineResource<Newsletter>({
  resource: 'newsletters',
  semantics: { kind: 'passthrough' },
});

/**
 * Posts list fake (passthrough): the analytics screens browse this endpoint
 * with NQL filters (`status:[published,sent]` for the latest post, `id:<id>`
 * for post analytics) — declare the response and assert the outgoing filter.
 * The single-post read (`GET /posts/<id>/`) is not a browse path; declare it
 * with `fakeAdminEndpoint`.
 */
export const fakePosts = defineResource<Post>({
  resource: 'posts',
  semantics: { kind: 'passthrough' },
});

/**
 * Pages list fake (passthrough). The pages list screen browses this endpoint
 * once per status bucket, exactly as the posts one does — declare the response
 * (a function of the query, if a test needs each bucket to differ) and assert
 * the outgoing filters.
 */
export const fakePages = defineResource<Post>({
  resource: 'pages',
  semantics: { kind: 'passthrough' },
});

/** Tiers list fake (passthrough): serves the declared tiers and captures every browse request. */
export const fakeTiers = defineResource<Tier>({
  resource: 'tiers',
  semantics: { kind: 'passthrough' },
});

/** Offers list fake (passthrough): serves the declared offers and captures every browse request. */
export const fakeOffers = defineResource<Offer>({
  resource: 'offers',
  semantics: { kind: 'passthrough' },
});

/** Labels list fake (passthrough): serves declared labels and captures browse filters/search. */
export const fakeLabels = labelsResource;

/** Newsletters list fake (passthrough): serves declared newsletters and captures pagination. */
export const fakeNewsletters = newslettersResource;

export interface FakeMembersOptions {
  /**
   * Extra labels for the filter-bar lookup, additive to those embedded in
   * array-form members — and the only way to serve labels with the
   * function form.
   */
  labels?: Label[];
  /** Tiers for the filter-bar lookup; the tier filter appears once >1 paid tier is served. */
  tiers?: Tier[];
}

/**
 * Members list fake (passthrough): serves the declared members and captures
 * every browse request for outgoing-NQL assertions. Also serves the page's
 * filter-bar lookups — labels from the declared members plus
 * `options.labels`, tiers from `options.tiers`; offers, newsletters and custom
 * field definitions empty.
 *
 * Every members screen asks the server which custom fields the publisher has defined,
 * because that list is what decides whether custom fields appear in the filter bar at all.
 * This harness fails any test that makes a request nothing has stubbed, so an empty list is
 * stubbed here on behalf of the many specs that have nothing to do with custom fields. A
 * spec that wants some calls `fakeMemberCustomFields` after this one.
 */
export function fakeMembers(
  members: RespondWith<Member>,
  { labels = [], tiers = [] }: FakeMembersOptions = {},
): ResourceCapture {
  const embeddedLabels = Array.isArray(members) ? members.flatMap((m) => m.labels) : [];
  const labelsById = new Map([...embeddedLabels, ...labels].map((l) => [l.id, l]));

  labelsResource([...labelsById.values()]);
  fakeTiers(tiers);
  fakeOffers([]);
  newslettersResource([]);
  if (!memberCustomFieldsDeclared) {
    memberCustomFieldsResource([]);
  }
  return membersResource(members);
}

// Settings-screen chrome: the settings app renders EVERY settings group on
// one page (routes only scroll/expand), so all of these fire on any
// /settings/* mount regardless of which screen a spec is about.
export const fakeUsers = defineResource<StaffUser>({
  resource: 'users',
  semantics: { kind: 'passthrough' },
});
export const fakeInvites = defineResource<StaffInvite>({
  resource: 'invites',
  semantics: { kind: 'passthrough' },
});
export const fakeRoles = defineResource<StaffRole>({
  resource: 'roles',
  semantics: { kind: 'passthrough' },
});
const themesResource = defineResource({ resource: 'themes', semantics: { kind: 'passthrough' } });
/** Themes list fake (passthrough): installed/active state is declared by the spec. */
export const fakeThemes = themesResource;

/**
 * Successful theme-archive upload fake: POST /themes/upload/ answers with the
 * declared themes (gscan errors/warnings included, via the `theme` builder)
 * and captures every upload request. Error statuses and the
 * `?copy_settings_from=` variant carry bespoke response semantics — declare
 * those with `fakeAdminEndpoint`.
 */
export function fakeThemeUpload(themes: Theme[]): EndpointCapture {
  return fakeAdminEndpoint('POST', '/themes/upload/', { themes });
}

const automatedEmailsResource = defineResource({
  resource: 'automated_emails',
  semantics: { kind: 'passthrough' },
});
/**
 * Automated-emails list fake (passthrough): serves the declared rows
 * (`@tryghost/admin-x-framework/api/automated-emails` shape) for the browse.
 * The row mutations and the design/senders/preview/verifications subpaths are
 * one-off endpoints — declare those with `fakeAdminEndpoint`.
 */
export const fakeAutomatedEmails = automatedEmailsResource;
const recommendationsResource = defineResource({
  resource: 'recommendations',
  semantics: { kind: 'passthrough' },
});
const integrationsResource = defineResource<Integration>({
  resource: 'integrations',
  semantics: { kind: 'passthrough' },
});
/** Integrations list fake (passthrough): serves configured built-in/custom integrations and captures browse requests. */
export const fakeIntegrations = integrationsResource;
/** History actions fake (passthrough): specs declare filtered responses and assert the outgoing NQL. */
export const fakeActions = defineResource<Omit<Action, 'context'> & { context: string }>({
  resource: 'actions',
  semantics: { kind: 'passthrough' },
});

/**
 * Declares the world the settings area's page chrome reads at mount — every
 * settings group renders on one page, so this covers the requests ALL
 * /settings/* specs trigger: the staff section (users/invites/roles), design
 * (themes), membership (tiers/newsletters), growth (recommendations, offers,
 * referrer stats) and advanced (integrations, automated emails).
 *
 * Defaults are the minimal believable world: the boot table's owner as the
 * only staff user, the canned active theme, and empty lists everywhere else.
 * Screen-specific data a spec asserts on is declared in the spec — a fake
 * registered after this one wins (e.g. `fakeOffers([...])`).
 */
export function fakeSettingsScreens(): void {
  fakeUsers(currentUserResponse().users as unknown as StaffUser[]);
  fakeInvites([]);
  fakeRoles([]);
  themesResource(activeThemeResponse().themes);
  fakeTiers([]);
  fakeOffers([]);
  newslettersResource([]);
  automatedEmailsResource([]);
  recommendationsResource([]);
  integrationsResource([]);

  // Two endpoints defineResource can't express:
  //  - /incoming_recommendations/ responds under the `recommendations` key
  //    (useBrowseIncomingRecommendations crashes on any other envelope);
  //  - /stats/referrers/ (growth's "Top sources") isn't a list envelope.
  registerRoute('GET', '/incoming_recommendations/?…');
  registerRoute('GET', '/stats/referrers/');
  registerAdminApiHandler((request, apiPath) => {
    if (request.method !== 'GET') {
      return undefined;
    }
    if (
      apiPath === '/incoming_recommendations/' ||
      apiPath.startsWith('/incoming_recommendations/?')
    ) {
      return HttpResponse.json(browseResponse('recommendations', [], { limit: 5 }));
    }
    if (apiPath === '/stats/referrers/') {
      return HttpResponse.json({ stats: [] });
    }
    return undefined;
  });
}

/**
 * Declares the chrome every posts/pages list mount reads: the batched
 * analytics counts the metric columns request, and the tag/author worlds the
 * filter bar and its slug lookups probe. Screen-specific data a spec asserts
 * on is declared in the spec — a fake registered after this one wins.
 */
export function fakePostsListScreen(): void {
  fakeAdminEndpoint('POST', '/stats/posts-visitor-counts/', {
    stats: [{ data: { visitor_counts: {} } }],
  });
  fakeAdminEndpoint('POST', '/stats/posts-member-counts/', {
    stats: [{ data: { member_counts: {} } }],
  });
  fakeTags([]);
  fakeUsers([]);
  fakeAdminEndpoint('GET', /^\/tags\/\?.*slug/, { tags: [] });
  fakeAdminEndpoint('GET', /^\/users\/\?.*slug/, { users: [] });
}

type SettingsPutBody = { settings: Array<{ key: string; value: string | boolean | null }> };

export interface EditSettingsCapture {
  /** Every PUT /settings/ body, oldest first. */
  requests: SettingsPutBody[];
  readonly lastRequest: SettingsPutBody | undefined;
}

/**
 * Handles PUT /settings/ the way Ghost does — echoes back the full settings
 * world with the submitted keys applied — and captures every request body so
 * specs can assert exactly what the UI saved.
 */
export function fakeEditSettings(): EditSettingsCapture {
  const requests: SettingsPutBody[] = [];

  registerRoute('PUT', '/settings/');
  registerAdminApiHandler(async (request, apiPath) => {
    if (request.method !== 'PUT' || apiPath !== '/settings/') {
      return undefined;
    }

    const body = (await request.json()) as SettingsPutBody;
    requests.push(body);

    const overrides = Object.fromEntries(body.settings.map(({ key, value }) => [key, value]));
    // The fixture accepts Labs separately; otherwise it overwrites the saved
    // JSON with defaults and a feature toggle immediately appears unchecked.
    const labs =
      typeof overrides.labs === 'string'
        ? (JSON.parse(overrides.labs) as Record<string, boolean>)
        : undefined;
    const response: SettingsResponse = settingsResponse({ settings: overrides, labs });
    return HttpResponse.json(response);
  });

  return {
    requests,
    get lastRequest() {
      return requests[requests.length - 1];
    },
  };
}
