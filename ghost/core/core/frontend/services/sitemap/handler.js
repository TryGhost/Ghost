const config = require('../../../shared/config');
const Manager = require('./site-map-manager');
const manager = new Manager();

// Responsible for handling requests for sitemap files
// The sitemap names a request may address. Checking own-properties on the
// manager would accept any field the class happens to carry.
const RESOURCE_TYPES = new Set(['posts', 'pages', 'tags', 'authors', 'users', 'index']);

module.exports = function handler(siteApp) {
    const verifyResourceType = function verifyResourceType(req, res, next) {
        const resourceWithoutPage = req.params.resource.replace(/-\d+$/, '');
        if (!RESOURCE_TYPES.has(resourceWithoutPage)) {
            return res.sendStatus(404);
        }

        next();
    };

    const sendXml = function sendXml(res, content) {
        res.set({
            'Cache-Control': 'public, max-age=' + config.get('caching:sitemap:maxAge'),
            'Content-Type': 'text/xml'
        });

        res.send(content);
    };

    // The XML reads are async: with a lazy URL backend the manager builds
    // its index on first read. Express 4 does not forward async handler
    // rejections, so each body is fully wrapped — a failed build or render
    // becomes an error response instead of a hung socket.
    siteApp.get('/sitemap.xml', async function sitemapXML(req, res, next) {
        try {
            sendXml(res, await manager.getIndexXml());
        } catch (err) {
            next(err);
        }
    });

    siteApp.get('/sitemap-:resource.xml', verifyResourceType, async function sitemapResourceXML(req, res, next) {
        try {
            const type = req.params.resource.replace(/-\d+$/, '');
            const pageParam = req.params.resource.match(/-(\d+)$/)?.[1];
            const page = pageParam ? parseInt(pageParam, 10) : 1;

            const content = await manager.getSiteMapXml(type, page);
            // Prevent x-1.xml as it is a duplicate of x.xml and empty sitemaps
            // (except for the first page so that at least one sitemap exists per type)
            if (pageParam === '1' || content === null) {
                return res.sendStatus(404);
            }

            sendXml(res, content);
        } catch (err) {
            next(err);
        }
    });
};
