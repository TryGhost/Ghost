import { HttpResponse } from "msw";
import { browseResponse, type Automation, type Label, type Member, type Tag, type Tier } from "@tryghost/test-data";

import { record418, registerAdminApiHandler, registerRoute } from "./worker";

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
    limit: number | "all";
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
        order: params.get("order") ?? undefined,
        page: Number(params.get("page") ?? "1"),
        limit: rawLimit === "all" ? "all" : rawLimit ? Number(rawLimit) : 15,
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

    return filter.split("+").filter((component) => {
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
export function defineResource<TEntity>({ resource, semantics, skip }: ResourceOptions<TEntity>) {
    return function fakeResource(respondWith: RespondWith<TEntity>): ResourceCapture {
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

/** Tags list fake: declared-query semantics covering the `visibility` filter the tags tabs send. */
export const fakeTags = defineResource<Tag>({
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

/** Automations list fake: the browse request carries no query the fake would need to interpret. */
export const fakeAutomations = defineResource<Automation>({
    resource: "automations",
    semantics: { kind: "passthrough" },
});

/** The sidebar's global member-count probe — shell chrome, served by the boot table. */
const MEMBER_COUNT_PROBE_PATH = "/members/?limit=1";

const membersResource = defineResource<Member>({
    resource: "members",
    semantics: { kind: "passthrough" },
    // Leave the sidebar count probe to the boot table so it never pollutes
    // `lastRequest` assertions.
    skip: (apiPath) => apiPath === MEMBER_COUNT_PROBE_PATH,
});

// Members-page chrome: the filter bar mounts with the page and probes these lookups.
const labelsResource = defineResource<Label>({ resource: "labels", semantics: { kind: "passthrough" } });
const tiersResource = defineResource<Tier>({ resource: "tiers", semantics: { kind: "passthrough" } });
const offersResource = defineResource({ resource: "offers", semantics: { kind: "passthrough" } });
const newslettersResource = defineResource({ resource: "newsletters", semantics: { kind: "passthrough" } });

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
 * `options.labels`, tiers from `options.tiers`; offers/newsletters empty.
 */
export function fakeMembers(members: RespondWith<Member>, { labels = [], tiers = [] }: FakeMembersOptions = {}): ResourceCapture {
    const embeddedLabels = Array.isArray(members) ? members.flatMap((m) => m.labels) : [];
    const labelsById = new Map([...embeddedLabels, ...labels].map((l) => [l.id, l]));

    labelsResource([...labelsById.values()]);
    tiersResource(tiers);
    offersResource([]);
    newslettersResource([]);
    return membersResource(members);
}
