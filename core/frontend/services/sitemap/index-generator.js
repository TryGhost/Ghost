const _ = require('lodash');
const xml = require('xml');
const urlUtils = require('../../../shared/url-utils');
const localUtils = require('./utils');
const {DateTime} = require('luxon');

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
        const urlElements = this.generateSiteMapUrlElements();

        const data = {
            // Concat the elements to the _attr declaration
            sitemapindex: [XMLNS_DECLS].concat(urlElements)
        };

        // Return the xml
        return localUtils.getDeclarations() + xml(data);
    }

    generateSiteMapUrlElements() {
        return _.map(this.types, (resourceType) => {
            const url = urlUtils.urlFor({relativeUrl: '/sitemap-' + resourceType.name + '.xml'}, true);
            const lastModified = DateTime.fromJSDate(resourceType.lastModified).toFormat('yyyy-MM-dd HH:mm:ss');

            return {
                sitemap: [
                    {loc: url},
                    {lastmod: lastModified}
                ]
            };
        });
    }
}

module.exports = SiteMapIndexGenerator;
