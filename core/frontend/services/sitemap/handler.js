const config = require('../../../server/config'),
    Manager = require('./manager'),
    manager = new Manager();

// Responsible for handling requests for sitemap files
module.exports = function handler(siteApp) {
    const verifyResourceType = function verifyResourceType(req, res, next) {
        if (!Object.prototype.hasOwnProperty.call(manager, req.params.resource)) {
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
        var type = req.params.resource,
            page = 1;

        res.set({
            'Cache-Control': 'public, max-age=' + config.get('caching:sitemap:maxAge'),
            'Content-Type': 'text/xml'
        });

        res.send(manager.getSiteMapXml(type, page));
    });
};
