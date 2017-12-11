var _       = require('lodash'),
    xml     = require('xml'),
    moment  = require('moment'),
    urlService = require('../../../services/url'),
    localUtils   = require('./utils'),
    RESOURCES,
    XMLNS_DECLS;

RESOURCES = ['pages', 'posts', 'authors', 'tags'];

XMLNS_DECLS = {
    _attr: {
        xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9'
    }
};

function SiteMapIndexGenerator(opts) {
    // Grab the other site map generators from the options
    _.extend(this, _.pick(opts, RESOURCES));
}

_.extend(SiteMapIndexGenerator.prototype, {
    getIndexXml: function () {
        var urlElements = this.generateSiteMapUrlElements(),
            data = {
                // Concat the elements to the _attr declaration
                sitemapindex: [XMLNS_DECLS].concat(urlElements)
            };

        // Return the xml
        return localUtils.getDeclarations() + xml(data);
    },

    generateSiteMapUrlElements: function () {
        var self = this;

        return _.map(RESOURCES, function (resourceType) {
            var url = urlService.utils.urlFor({
                    relativeUrl: '/sitemap-' + resourceType + '.xml'
                }, true),
                lastModified = self[resourceType].lastModified;

            return {
                sitemap: [
                    {loc: url},
                    {lastmod: moment(lastModified).toISOString()}
                ]
            };
        });
    }
});

module.exports = SiteMapIndexGenerator;
