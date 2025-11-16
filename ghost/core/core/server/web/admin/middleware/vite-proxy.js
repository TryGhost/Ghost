const debug = require('@tryghost/debug')('web:admin:vite-proxy');
const httpProxy = require('http-proxy-3');

/**
 * Creates proxy middleware for forwarding requests to Vite dev server
 * Includes WebSocket support for HMR (Hot Module Replacement)
 * 
 * @param {string} viteDevServerUrl - URL of the Vite dev server (e.g., http://localhost:5173)
 * @returns {Object} Object containing middleware function and upgrade handler
 */
function createViteProxy(viteDevServerUrl) {
    const proxy = httpProxy.createProxyServer({
        target: viteDevServerUrl + '/ghost',
        changeOrigin: true,
        prependPath: true,
        ws: true // Enable WebSocket proxying for HMR
    });

    /**
     * Generic proxy middleware for all Vite requests
     * Automatically prepends /ghost to URLs (except for Vite special routes starting with /@)
     */
    const proxyMiddleware = function proxyMiddleware(req, res, next) {
        const originalUrl = req.url;
        proxy.web(req, res, {}, (err) => {
            if (err) {
                debug('Vite proxy error:', err);
                req.url = originalUrl; // Restore original URL
                next(err);
            }
        });
    };

    /**
     * WebSocket upgrade handler for HMR
     * Should be attached to the server's 'upgrade' event
     */
    const upgradeHandler = function upgradeHandler(req, socket, head) {
        if (req.url.startsWith('/ghost')) {
            proxy.ws(req, socket, head, (err) => {
                if (err) {
                    debug('WebSocket proxy error:', err);
                }
            });
        }
    };

    return {
        middleware: proxyMiddleware,
        upgradeHandler: upgradeHandler
    };
}

module.exports = createViteProxy;

