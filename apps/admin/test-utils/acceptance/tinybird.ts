import { buildTinybirdPipeRows, configResponse, settingsResponse, type ConfigResponse, type TinybirdPipeInputs, type TinybirdPipeName } from "@tryghost/test-data";

import type { BootOverrides } from "./boot";
import { TINYBIRD_ORIGIN, fakeAdminEndpoint, fakeEndpoint, registerRoute, type EndpointCapture } from "./worker";

/**
 * Web-analytics data flows through Tinybird: the browser fetches a JWT from
 * the Admin API (`GET /tinybird/token/`), then queries pipe endpoints on the
 * Tinybird origin directly. Both legs are faked here — the token with an
 * admin-endpoint fake, the pipes with external-URL fakes on the blocklisted
 * `TINYBIRD_ORIGIN` (worker.ts).
 */

/** The `config.stats.id` pipes receive as their `site_uuid` param. */
export const TINYBIRD_SITE_UUID = "tinybird-site-uuid";

/** Config boot response with a Tinybird stats block, so the stats views treat Tinybird as provisioned. */
function statsEnabledConfigResponse(): ConfigResponse {
    const response = configResponse();
    response.config.stats = { id: TINYBIRD_SITE_UUID, endpoint: TINYBIRD_ORIGIN };
    return response;
}

/**
 * Boot overrides switching web analytics on: `config.stats` and the
 * `web_analytics_enabled` setting move in lockstep (the client reads both,
 * like the `labs` sugar's settings + config pair). Spread and extend when a
 * spec needs further boot overrides.
 */
export function webAnalyticsBootOverrides(): BootOverrides {
    return {
        browseConfig: { response: statsEnabledConfigResponse() },
        browseSettings: { response: settingsResponse({ settings: { web_analytics_enabled: true } }) },
    };
}

let tokenSerial = 0;

/**
 * Serves the Admin API token request the Tinybird client makes before any
 * pipe query. Each call mints a fresh token: the Tinybird client's SWR cache
 * keys on the full pipe URL (token included) and outlives the render, so a
 * repeated token would let one test's pipe responses satisfy the next test's
 * queries without a request.
 */
export function fakeTinybirdToken(): EndpointCapture {
    tokenSerial += 1;
    return fakeAdminEndpoint("GET", "/tinybird/token/", { tinybird: { token: `tinybird-test-token-${tokenSerial}` } });
}

export interface TinybirdPipeQuery {
    /** Full request URL. */
    url: string;
    /** The request's query params (site_uuid, date_from, filters, ...). */
    params: URLSearchParams;
}

export interface TinybirdPipeCapture {
    /** Every request the pipe served, oldest first. */
    requests: TinybirdPipeQuery[];
    readonly lastRequest: TinybirdPipeQuery | undefined;
}

function toPipeQuery(url: string): TinybirdPipeQuery {
    return { url, params: new URL(url).searchParams };
}

/**
 * Fake one Tinybird pipe (e.g. `"api_kpis"`) for the current test. THE RULE
 * from resources.ts applies: the declared rows are served for every request,
 * never filtered by the query — assert the captured query params instead.
 */
export function fakeTinybirdPipe<Pipe extends TinybirdPipeName>(pipe: Pipe, inputs: Array<TinybirdPipeInputs[Pipe]>): TinybirdPipeCapture {
    const rows = buildTinybirdPipeRows(pipe, inputs);
    const url = `${TINYBIRD_ORIGIN}/v0/pipes/${pipe}.json`;
    registerRoute("GET", url);
    const capture = fakeEndpoint("GET", url, {
        meta: [],
        data: rows,
        rows: rows.length,
        statistics: { elapsed: 0.001, rows_read: rows.length, bytes_read: 0 },
    });

    return {
        get requests() {
            return capture.requests.map(({ url: requestUrl }) => toPipeQuery(requestUrl));
        },
        get lastRequest() {
            const last = capture.lastRequest;
            return last && toPipeQuery(last.url);
        },
    };
}
