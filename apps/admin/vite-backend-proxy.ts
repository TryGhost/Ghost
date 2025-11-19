import type { Plugin, ProxyOptions } from "vite";
import type { IncomingMessage } from "http";

const GHOST_URL = process.env.GHOST_URL ?? "http://localhost:2368/";

/**
 * Resolves the configured Ghost site URL by calling the admin api site endpoint
 * with retries (up to 20 seconds).
 */
async function resolveGhostSiteUrl() {
    const MAX_ATTEMPTS = 20;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const siteEndpoint = new URL("/ghost/api/admin/site", GHOST_URL);
            const response = await fetch(siteEndpoint);
            const data = (await response.json()) as { site: { url: string } };
            return {
                url: data.site.url,
                host: new URL(data.site.url).host,
            };
        } catch (error) {
            if (attempt === MAX_ATTEMPTS) throw error;
            await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
    }

    throw new Error("Failed to resolve Ghost site URL");
}

/**
 * Creates proxy configuration for Ghost Admin API requests. Rewrites cookies
 * and headers to work with Ghost's security middleware.
 */
function createAdminApiProxy(site: {
    url: string;
    host: string;
}): Record<string, ProxyOptions> {
    // When running the dev server against the backend on HTTPS, we need to
    // remove the same site and secure flags from the cookie. Otherwise, the
    // browser won't set it correctly since the dev server is running on HTTP.
    const rewriteCookies = (proxyRes: IncomingMessage) => {
        const cookies = proxyRes.headers["set-cookie"];
        if (Array.isArray(cookies)) {
            proxyRes.headers["set-cookie"] = cookies.map((cookie) => {
                return cookie
                    .split(";")
                    .filter((v) => v.trim().toLowerCase() !== "secure")
                    .filter((v) => v.trim().toLowerCase() !== "samesite=none")
                    .join("; ");
            });
        }
    };

    return {
        "^/ghost/api/.*": {
            target: site.url,
            changeOrigin: true,
            followRedirects: true,
            autoRewrite: true,
            cookieDomainRewrite: {
                "*": site.host,
            },
            configure(proxy) {
                proxy.on("proxyRes", rewriteCookies);
            },
        },
    };
}

/**
 * Creates proxy configuration for Ember Admin assets.
 */
function createEmberAssetsProxy(site: {
    url: string;
    host: string;
}): Record<string, ProxyOptions> {
    return {
        "^/ghost/assets/.*": {
            target: site.url,
            changeOrigin: true,
        },
        "^/ghost/ember-cli-live-reload.js": {
            target: site.url,
            changeOrigin: true,
        },
    };
}

/**
 * Vite plugin that injects proxy configurations for:
 * 1. Ghost Admin API - proxies /ghost/api requests to the Ghost backend
 * 2. Ember Assets - proxies /ghost/assets and ember-cli-live-reload.js
 */
export function ghostBackendProxyPlugin(): Plugin {
    let siteUrl!: { url: string; host: string };

    return {
        name: "ghost-backend-proxy",

        async configResolved(config) {
            // Only resolve backend URL for dev/preview, not for builds or tests
            if (config.command !== 'serve' || config.mode === 'test') return;

            try {
                // We expect this to succeed immediately, but if the backend
                // server is getting started, it might need some time.
                // In that case, this lets the user know in case we're barking
                // up the wrong tree (aka the GHOST_URL is wrong.)
                const timeout = setTimeout(() => {
                    config.logger.info(`Trying to reach Ghost Admin API at ${GHOST_URL}...`);
                }, 1000);

                siteUrl = await resolveGhostSiteUrl();
                clearTimeout(timeout);

                config.logger.info(`👻 Using backend url: ${siteUrl.url}`);
            } catch (error) {
                config.logger
                    .error(`Could not reach Ghost Admin API at: ${GHOST_URL}

Ensure the Ghost backend is running. If needed, set the GHOST_URL environment variable to the correct URL.
    `);

                throw error;
            }
        },

        configureServer(server) {
            if (!siteUrl) return;

            server.config.server.proxy = {
                ...server.config.server.proxy,
                ...createAdminApiProxy(siteUrl),
                ...createEmberAssetsProxy(siteUrl),
            };
        },

        configurePreviewServer(server) {
            if (!siteUrl) return;

            server.config.preview.proxy = {
                ...server.config.preview.proxy,
                ...createAdminApiProxy(siteUrl),
            };
        },
    } as const satisfies Plugin;
}
