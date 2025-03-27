const config = require('../../../shared/config');
const Manager = require('./SiteMapManager');
const manager = new Manager();

// Responsible for handling requests for sitemap files
module.exports = function handler(siteApp) {
    const verifyResourceType = function verifyResourceType(req, res, next) {
        const resourceWithoutPage = req.params.resource.replace(/-\d+$/, '');
        if (!Object.prototype.hasOwnProperty.call(manager, resourceWithoutPage)) {
            return res.sendStatus(404);
        }

        next();
    };

    siteApp.get('/sitemap.xml', function sitemapXML(req, res) {
        res.set({
            'Cache-Control': 'public, max-age=' + config.get('caching:sitemap:maxAge'),
            'Content-Type': 'text/xml'
        });

        res.send(manager.getIndexXml());
    });

    siteApp.get('/sitemap-:resource.xml', verifyResourceType, function sitemapResourceXML(req, res) {
        const type = req.params.resource.replace(/-\d+$/, '');
        const pageParam = (req.params.resource.match(/-(\d+)$/) || [null, null])[1];
        const page = pageParam ? parseInt(pageParam, 10) : 1;

        const content = manager.getSiteMapXml(type, page);
        // Prevent x-1.xml as it is a duplicate of x.xml and empty sitemaps
        // (except for the first page so that at least one sitemap exists per type)
        if (pageParam === '1' || content === null) {
            return res.sendStatus(404);
        }

        res.set({
            'Cache-Control': 'public, max-age=' + config.get('caching:sitemap:maxAge'),
            'Content-Type': 'text/xml'
        });

        res.send(content);
    });
};
