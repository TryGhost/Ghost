import type { Plugin, ViteDevServer, PreviewServer } from "vite";

/**
 * Vite plugin that redirects admin deep-link URLs to hash-based URLs.
 *
 * Mirrors ghost/core/core/server/web/admin/middleware/redirect-admin-urls.js
 * so that direct navigation to paths like /ghost/posts/123 redirects to /ghost/#/posts/123
 *
 * By registering as a post-middleware, static assets and API requests are handled first,
 * and only unhandled requests trigger the redirect.
 */
export function deepLinksPlugin(): Plugin {
    function addRedirectMiddleware(server: ViteDevServer | PreviewServer) {
        const base = (server.config.base ?? "/ghost").replace(/\/$/, "");
        const pathRegex = new RegExp(`^${base}/(.+)`);

        return () => {
            server.middlewares.use((req, res, next) => {
                // Skip WebSocket upgrade requests (used for HMR)
                if (req.headers.upgrade?.toLowerCase() === 'websocket') {
                    next();
                    return;
                }

                // Skip root path with query string only (e.g. /ghost/?token=xxx for Vite HMR)
                const urlPath = req.originalUrl?.split('?')[0];
                if (urlPath === `${base}/` || urlPath === base) {
                    next();
                    return;
                }

                const match = req.originalUrl?.match(pathRegex);

                if (match) {
                    res.writeHead(302, { Location: `${base}/#/${match[1]}` });
                    res.end();
                    return;
                }

                next();
            });
        };
    }

    return {
        name: "deep-links",
        configureServer: addRedirectMiddleware,
        configurePreviewServer: addRedirectMiddleware,
    };
}
