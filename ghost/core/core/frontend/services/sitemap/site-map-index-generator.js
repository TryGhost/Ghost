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
        this.maxPerPage = options.maxPerPage;
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
            const noOfPages = Math.ceil(Object.keys(resourceType.nodeLookup).length / this.maxPerPage);
            const pages = [];
            for (let i = 0; i < noOfPages; i++) {
                const page = i === 0 ? '' : `-${i + 1}`;
                const url = urlUtils.urlFor({relativeUrl: '/sitemap-' + resourceType.name + page + '.xml'}, true);
                const lastModified = resourceType.lastModified;

                pages.push({
                    sitemap: [
                        {loc: url},
                        {lastmod: moment(lastModified).toISOString()}
                    ]
                });
            }

            return pages;
        }).flat();
    }
}

module.exports = SiteMapIndexGenerator;
