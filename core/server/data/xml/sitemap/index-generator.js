const _ = require('lodash'),
    xml = require('xml'),
    moment = require('moment'),
    urlService = require('../../../services/url'),
    localUtils = require('./utils');

const XMLNS_DECLS = {
    _attr: {
        xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9'
    }
};

class SiteMapIndexGenerator {
    constructor(options) {
        options = options || {};
        this.types = options.types;
    }

    getXml() {
        const urlElements = this.generateSiteMapUrlElements(),
            data = {
                // Concat the elements to the _attr declaration
                sitemapindex: [XMLNS_DECLS].concat(urlElements)
            };

        // Return the xml
        return localUtils.getDeclarations() + xml(data);
    }

    generateSiteMapUrlElements() {
        return _.map(this.types, (resourceType) => {
            var url = urlService.utils.urlFor({relativeUrl: '/sitemap-' + resourceType.name + '.xml'}, true),
                lastModified = resourceType.lastModified;

            return {
                sitemap: [
                    {loc: url},
                    {lastmod: moment(lastModified).toISOString()}
                ]
            };
        });
    }
}

module.exports = SiteMapIndexGenerator;
