import { HttpResponse } from "msw";
import { browseResponse, type Label, type Member, type Tag } from "@tryghost/test-data";

import { record418, registerAdminApiHandler, registerRoute } from "./worker";

/**
 * Resource fakes: declare the world, let the fake serve it.
 *
 * THE RULE: a resource fake may implement *trivial declared* query
 * behaviors — ones where the fake only echoes back a slice of exactly what
 * the spec declared (a `visibility` field match, page/limit slicing) — but
 * NEVER NQL. For NQL-filtered lists (members `?filter=`, `?search=`) the spec
 * declares the response and asserts the outgoing filter string instead,
 * because that serialization IS the behavior under test; re-implementing NQL
 * in the fake would test the fake.
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

/** Explicit, greppable statement of how much query behavior a resource fake implements (see THE RULE above). */
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
 * Define a fake for one admin API list resource. The returned function
 * registers a handler that owns the resource's browse URL: it parses the
 * query, records it on the returned capture (for outgoing-NQL assertions),
 * applies the resource's declared semantics and wraps the result in the Ghost
 * list envelope (which slices pagination itself). Unmatched paths fall
 * through to the boot table / 418 catch-all.
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

/**
 * Declared-world fake for the tags list: give it every tag that exists and
 * it serves whichever slice the app asks for — the `visibility` filter the
 * tags screen tabs send, plus page/limit slicing (trivial declared semantics
 * only, see THE RULE above).
 */
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

/** The sidebar's global member-count probe — shell chrome, served by the boot table. */
const MEMBER_COUNT_PROBE_PATH = "/members/?limit=1";

const membersResource = defineResource<Member>({
    resource: "members",
    // EXPLICIT mode: the fake never interprets queries (see THE RULE above).
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

export interface FakeMembersOptions {
    /**
     * Extra labels served to the members page filter bar's label lookup, in
     * addition to the labels embedded in array-form declared members (which
     * are always served). Only needed for labels attached to no declared
     * member — and required for any labels at all when the members are
     * declared with a function.
     */
    labels?: Label[];
}

/**
 * Explicit-mode fake for the members list: serves exactly the declared
 * entities and captures every browse request so specs can assert the outgoing
 * NQL (`lastRequest.filter`, `lastRequest.search`, raw `lastRequest.url`).
 * Pass an array to serve the same world for every request, or a function of
 * the parsed query to declare per-request responses, e.g.
 * `({search}) => (search ? [] : allMembers)`.
 *
 * Also serves the members page's filter-bar lookups (labels/tiers/offers/
 * newsletters) so specs don't have to mention page chrome. The label lookup
 * is derived from the declared world — labels embedded in array-form members
 * plus any extra `options.labels`.
 */
export function fakeMembers(members: RespondWith<Member>, { labels = [] }: FakeMembersOptions = {}): ResourceCapture {
    const embeddedLabels = Array.isArray(members) ? members.flatMap((m) => m.labels) : [];
    const labelsById = new Map([...embeddedLabels, ...labels].map((l) => [l.id, l]));

    labelsResource([...labelsById.values()]);
    tiersResource([]);
    offersResource([]);
    newslettersResource([]);
    return membersResource(members);
}
