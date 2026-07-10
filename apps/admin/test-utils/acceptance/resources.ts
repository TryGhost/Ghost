import { HttpResponse } from "msw";
import {
    activeThemeResponse,
    browseResponse,
    currentUserResponse,
    settingsResponse,
    type Label,
    type Member,
    type SettingsResponse,
    type Tag,
} from "@tryghost/test-data";

import { record418, registerAdminApiHandler, registerRoute } from "./worker";

/**
 * Resource handlers: declare the world, let the handler serve it.
 *
 * THE RULE: a resource handler may implement *trivial declared* query
 * behaviors — ones where the handler only echoes back a slice of exactly what
 * the spec declared (a `visibility` field match, page/limit slicing) — but
 * NEVER NQL. For NQL-filtered lists (members `?filter=`, `?search=`) the spec
 * declares the response and asserts the outgoing filter string instead,
 * because that serialization IS the behavior under test; re-implementing NQL
 * in the mock would test the mock.
 *
 * Each resource states which side of that line it is on via `semantics`:
 *
 *   - `{kind: "passthrough"}` — serves exactly the declared entities and
 *     never interprets the query. Per-request responses are declared with a
 *     function of the parsed query.
 *   - `{kind: "declared-query", covers, select}` — `select` applies the
 *     trivial declared behaviors; any filter component outside `covers`
 *     responds 418 instead of silently serving the full world.
 */

export interface BrowseQuery {
    /** Full request URL, for raw assertions on encoding. */
    url: string;
    /** Decoded ?filter param (NQL), if present. */
    filter?: string;
    /** Decoded ?search param, if present. */
    search?: string;
    page: number;
    limit: number | "all";
}

export interface ResourceCapture {
    /** Every matched browse request, oldest first. */
    requests: BrowseQuery[];
    readonly lastRequest: BrowseQuery | undefined;
}

/** The entities to serve: one world for every request, or per-request via a function of the parsed query. */
export type RespondWith<TEntity> = TEntity[] | ((query: BrowseQuery) => TEntity[]);

/** Explicit, greppable statement of how much query behavior a resource mock implements (see THE RULE above). */
export type ResourceSemantics<TEntity> =
    | {
          kind: "declared-query";
          /** The filter component keys `select` consumes (e.g. `["visibility"]`); anything else responds 418. */
          covers: string[];
          /** Trivial declared query semantics applied to the declared entities before pagination. */
          select: (entities: TEntity[], query: BrowseQuery) => TEntity[];
      }
    | { kind: "passthrough" };

export interface ResourceOptions<TEntity> {
    /** Admin API path segment and envelope key, e.g. 'tags' → GET /tags/. */
    resource: string;
    semantics: ResourceSemantics<TEntity>;
    /** Browse paths to leave to lower-priority handlers (shell chrome like the sidebar count probe). */
    skip?: (apiPath: string) => boolean;
}

function parseBrowseQuery(request: Request): BrowseQuery {
    const url = new URL(request.url);
    const params = url.searchParams;
    const rawLimit = params.get("limit");

    return {
        url: request.url,
        filter: params.get("filter") ?? undefined,
        search: params.get("search") ?? undefined,
        page: Number(params.get("page") ?? "1"),
        limit: rawLimit === "all" ? "all" : rawLimit ? Number(rawLimit) : 15,
    };
}

/**
 * Strict declared-query filter parsing: split the NQL into top-level `+`
 * components and return the ones whose key `covers` does not include. NQL
 * grouping is out of scope on purpose — a component that doesn't parse as a
 * simple `key:value` also counts as uncovered.
 */
function uncoveredFilterComponents(filter: string | undefined, covers: string[]): string[] {
    if (!filter) {
        return [];
    }

    return filter.split("+").filter((component) => {
        const key = component.match(/^([\w.]+):/)?.[1];
        return !key || !covers.includes(key);
    });
}

/**
 * Define a mock for one admin API list resource. The returned function
 * registers a handler that owns the resource's browse URL: it parses the
 * query, records it on the returned capture (for outgoing-NQL assertions),
 * applies the resource's declared semantics and wraps the result in the Ghost
 * list envelope (which slices pagination itself). Unmatched paths fall
 * through to the boot table / 418 catch-all.
 */
export function defineResource<TEntity>({ resource, semantics, skip }: ResourceOptions<TEntity>) {
    return function mockResource(respondWith: RespondWith<TEntity>): ResourceCapture {
        const requests: BrowseQuery[] = [];

        registerRoute("GET", `/${resource}/?…`);
        registerAdminApiHandler((request, apiPath) => {
            const isBrowse = request.method === "GET" && (apiPath === `/${resource}/` || apiPath.startsWith(`/${resource}/?`));
            if (!isBrowse || skip?.(apiPath)) {
                return undefined;
            }

            const query = parseBrowseQuery(request);
            requests.push(query);

            const declared = typeof respondWith === "function" ? respondWith(query) : respondWith;

            let matching = declared;
            if (semantics.kind === "declared-query") {
                const uncovered = uncoveredFilterComponents(query.filter, semantics.covers);
                if (uncovered.length > 0) {
                    record418(`${request.method} ${apiPath} — filter component(s) not covered by declared semantics: ${uncovered.join(", ")}`);
                    return new HttpResponse(
                        [
                            `Declared semantics for '${resource}' only cover ${semantics.covers.map((key) => `\`${key}:\``).join(", ")};`,
                            `this request's filter contains: ${uncovered.join(", ")}.`,
                            "Use passthrough mode (declare the response with a function of the query) for this spec.",
                        ].join(" "),
                        { status: 418 }
                    );
                }
                matching = semantics.select(declared, query);
            }

            return HttpResponse.json(
                browseResponse(resource, matching, {
                    page: query.page,
                    limit: query.limit,
                })
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

/**
 * Declared-world handler for the tags list: give it every tag that exists and
 * it serves whichever slice the app asks for — the `visibility` filter the
 * tags screen tabs send, plus page/limit slicing (trivial declared semantics
 * only, see THE RULE above).
 */
export const mockTags = defineResource<Tag>({
    resource: "tags",
    semantics: {
        kind: "declared-query",
        covers: ["visibility"],
        select: (tags, { filter }) => {
            const visibility = filter?.match(/(?:^|\+)visibility:(\w+)/)?.[1];
            return visibility ? tags.filter((t) => t.visibility === visibility) : tags;
        },
    },
});

/** The sidebar's global member-count probe — shell chrome, served by the boot table. */
const MEMBER_COUNT_PROBE_PATH = "/members/?limit=1";

const membersResource = defineResource<Member>({
    resource: "members",
    // EXPLICIT mode: no fake filtering ever happens (see THE RULE above).
    semantics: { kind: "passthrough" },
    // Leave the sidebar count probe to the boot table so it never pollutes
    // `lastRequest` assertions.
    skip: (apiPath) => apiPath === MEMBER_COUNT_PROBE_PATH,
});

// Members-page chrome: the filter bar mounts with the page and probes these lookups.
const labelsResource = defineResource<Label>({ resource: "labels", semantics: { kind: "passthrough" } });
const tiersResource = defineResource({ resource: "tiers", semantics: { kind: "passthrough" } });
const offersResource = defineResource({ resource: "offers", semantics: { kind: "passthrough" } });
const newslettersResource = defineResource({ resource: "newsletters", semantics: { kind: "passthrough" } });

export interface MockMembersOptions {
    /** Labels served to the members page filter bar's label lookup (default none). */
    labels?: Label[];
}

/**
 * Explicit-mode handler for the members list: serves exactly the declared
 * entities and captures every browse request so specs can assert the outgoing
 * NQL (`lastRequest.filter`, `lastRequest.search`, raw `lastRequest.url`).
 * Pass an array to serve the same world for every request, or a function of
 * the parsed query to declare per-request responses, e.g.
 * `({search}) => (search ? [] : allMembers)`.
 *
 * Also serves the members page's filter-bar lookups (labels/tiers/offers/
 * newsletters) so specs don't have to mention page chrome.
 */
export function mockMembers(members: RespondWith<Member>, { labels = [] }: MockMembersOptions = {}): ResourceCapture {
    labelsResource(labels);
    tiersResource([]);
    offersResource([]);
    newslettersResource([]);
    return membersResource(members);
}

// Settings-screen chrome: admin-x-settings renders EVERY settings group on
// one page (routes only scroll/expand), so all of these fire on any
// /settings/* mount regardless of which screen a spec is about.
const usersResource = defineResource({ resource: "users", semantics: { kind: "passthrough" } });
const invitesResource = defineResource({ resource: "invites", semantics: { kind: "passthrough" } });
const rolesResource = defineResource({ resource: "roles", semantics: { kind: "passthrough" } });
const themesResource = defineResource({ resource: "themes", semantics: { kind: "passthrough" } });
const automatedEmailsResource = defineResource({ resource: "automated_emails", semantics: { kind: "passthrough" } });
const recommendationsResource = defineResource({ resource: "recommendations", semantics: { kind: "passthrough" } });
const integrationsResource = defineResource({ resource: "integrations", semantics: { kind: "passthrough" } });

/**
 * Declares the world the settings area's page chrome reads at mount — every
 * settings group renders on one page, so this covers the requests ALL
 * /settings/* specs trigger: the staff section (users/invites/roles), design
 * (themes), membership (tiers/newsletters), growth (recommendations, offers,
 * referrer stats) and advanced (integrations, automated emails).
 *
 * Defaults are the minimal believable world: the boot table's owner as the
 * only staff user, the canned active theme, and empty lists everywhere else.
 * Screen-specific data a spec asserts on should be declared in the spec, not
 * here.
 */
export function mockSettingsScreens(): void {
    usersResource(currentUserResponse().users);
    invitesResource([]);
    rolesResource([]);
    themesResource(activeThemeResponse().themes);
    tiersResource([]);
    offersResource([]);
    newslettersResource([]);
    automatedEmailsResource([]);
    recommendationsResource([]);
    integrationsResource([]);

    // Two endpoints defineResource can't express:
    //  - /incoming_recommendations/ responds under the `recommendations` key
    //    (useBrowseIncomingRecommendations crashes on any other envelope);
    //  - /stats/referrers/ (growth's "Top sources") isn't a list envelope.
    registerRoute("GET", "/incoming_recommendations/?…");
    registerRoute("GET", "/stats/referrers/");
    registerAdminApiHandler((request, apiPath) => {
        if (request.method !== "GET") {
            return undefined;
        }
        if (apiPath === "/incoming_recommendations/" || apiPath.startsWith("/incoming_recommendations/?")) {
            return HttpResponse.json(browseResponse("recommendations", [], { limit: 5 }));
        }
        if (apiPath === "/stats/referrers/") {
            return HttpResponse.json({ stats: [] });
        }
        return undefined;
    });
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
export function mockEditSettings(): EditSettingsCapture {
    const requests: SettingsPutBody[] = [];

    registerRoute("PUT", "/settings/");
    registerAdminApiHandler(async (request, apiPath) => {
        if (request.method !== "PUT" || apiPath !== "/settings/") {
            return undefined;
        }

        const body = (await request.json()) as SettingsPutBody;
        requests.push(body);

        const overrides = Object.fromEntries(body.settings.map(({ key, value }) => [key, value]));
        const response: SettingsResponse = settingsResponse({ settings: overrides });
        return HttpResponse.json(response);
    });

    return {
        requests,
        get lastRequest() {
            return requests[requests.length - 1];
        },
    };
}
