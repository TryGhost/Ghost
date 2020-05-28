const _ = require('lodash');
const xml = require('xml');
const moment = require('moment');
const urlUtils = require('../../../shared/url-utils');
const localUtils = require('./utils');

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
            const lastModified = resourceType.lastModified;

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
