import { HttpResponse } from "msw";
import {
    activeThemeResponse,
    browseResponse,
    configResponse,
    currentUserResponse,
    settingsResponse,
    siteResponse,
} from "@tryghost/test-data";

import { registerAdminApiHandler, registerRoute } from "./worker";

/**
 * The requests the apps/admin shell fires on boot regardless of route: the
 * global data set (settings/config/site/me) plus the sidebar/layout extras
 * (members count, active theme check) and the fire-and-forget user-preferences
 * write (theme/navigation sync).
 *
 * These are handled by DEFAULT inside the harness — specs never mention them.
 * To change a boot response for one test, pass an override keyed by the entry
 * name below, e.g. `renderAdminApp("/", {boot: {browseMe: {response: ...}}})`.
 *
 * All canned responses come from `@tryghost/test-data` — that package is
 * the root of the dependency graph, so nothing in this harness imports
 * test data from admin-x-framework.
 */
export interface BootRequestConfig {
    method: string;
    path: string | RegExp;
    response: unknown;
    responseStatus?: number;
}

/**
 * A function rather than a const so the fixture accessors run per call —
 * every install/lookup serves freshly-minted response objects, so nothing a
 * test mutates can leak into the next one.
 */
export function defaultBootRequests() {
    return {
        browseSettings: {
            method: "GET",
            path: /^\/settings\/\?group=/,
            response: settingsResponse(),
        },
        browseConfig: {
            method: "GET",
            path: "/config/",
            response: configResponse(),
        },
        browseSite: {
            method: "GET",
            path: "/site/",
            response: siteResponse(),
        },
        browseMe: {
            method: "GET",
            path: "/users/me/?include=roles",
            response: currentUserResponse(),
        },
        browseMembersCount: {
            method: "GET",
            path: "/members/?limit=1",
            response: browseResponse("members", [], { limit: 1 }),
        },
        browseActiveTheme: {
            method: "GET",
            path: "/themes/active/",
            response: activeThemeResponse(),
        },
        editUserPreferences: {
            method: "PUT",
            path: /^\/users\/\w+\/\?include=roles/,
            response: currentUserResponse(),
        },
    } satisfies Record<string, BootRequestConfig>;
}

export type BootRequestName = keyof ReturnType<typeof defaultBootRequests>;

/**
 * Per-entry overrides for the boot table: `response`/`responseStatus` are
 * merged onto the named default, and matching keeps the DEFAULT's method and
 * path — the entry name is what keys.
 */
export type BootOverrides = Partial<Record<BootRequestName, Partial<Pick<BootRequestConfig, "response" | "responseStatus">>>>;

/** "METHOD path" descriptions of the boot table, for the worker's 418 route listing. */
export function defaultBootRoutes(): string[] {
    return Object.values(defaultBootRequests()).map(({ method, path }) => `${method} ${path}`);
}

function matches(config: BootRequestConfig, method: string, apiPath: string): boolean {
    if (config.method !== method) {
        return false;
    }
    return typeof config.path === "string" ? config.path === apiPath : config.path.test(apiPath);
}

function respond(config: BootRequestConfig): Response {
    return HttpResponse.json(config.response as Record<string, unknown>, {
        status: config.responseStatus ?? 200,
    });
}

/**
 * The persistent lowest-priority resolver for the boot table, installed once
 * at worker start. Resource handlers and boot overrides always win over it.
 * Rebuilds the table per request so every response is a fresh object.
 */
export function defaultBootResolver(request: Request, apiPath: string): Response | undefined {
    const config = Object.values(defaultBootRequests()).find((entry) => matches(entry, request.method, apiPath));
    return config ? respond(config) : undefined;
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

    registerAdminApiHandler((request, apiPath) => {
        const config = entries.find((entry) => matches(entry, request.method, apiPath));
        return config ? respond(config) : undefined;
    });
}
