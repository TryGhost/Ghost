var _       = require('lodash'),
    utils   = require('../../../utils'),
    sitemap = require('./index');

// Responsible for handling requests for sitemap files
module.exports = function handler(blogApp) {
    var resourceTypes = ['posts', 'authors', 'tags', 'pages'],
        verifyResourceType = function verifyResourceType(req, res, next) {
            if (!_.includes(resourceTypes, req.params.resource)) {
                return res.sendStatus(404);
            }

            next();
        },
        getResourceSiteMapXml = function getResourceSiteMapXml(type, page) {
            return sitemap.getSiteMapXml(type, page);
        };

    blogApp.get('/sitemap.xml', function sitemapXML(req, res) {
        res.set({
            'Cache-Control': 'public, max-age=' + utils.ONE_HOUR_S,
            'Content-Type': 'text/xml'
        });
        res.send(sitemap.getIndexXml());
    });

    blogApp.get('/sitemap-:resource.xml', verifyResourceType, function sitemapResourceXML(req, res) {
        var type = req.params.resource,
            page = 1,
            siteMapXml = getResourceSiteMapXml(type, page);

        res.set({
            'Cache-Control': 'public, max-age=' + utils.ONE_HOUR_S,
            'Content-Type': 'text/xml'
        });
        res.send(siteMapXml);
    });
};
