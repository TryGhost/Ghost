const _ = require('lodash');
const urlUtils = require('../../../shared/url-utils').default;
const sitemapXml = require('./sitemap-xml');

class SiteMapIndexGenerator {
  constructor(options) {
    options = options || {};
    this.types = options.types;
    this.maxPerPage = options.maxPerPage;
    // The index is the one sitemap crawlers fetch repeatedly, and rendering
    // it counts every resource of every type. Cached until something
    // invalidates the index; the manager resets this when it does.
    this.siteMapContent = null;
  }

  getXml() {
    if (this.siteMapContent !== null) {
      return this.siteMapContent;
    }

    this.siteMapContent = sitemapXml.renderSiteMapIndex(this.generateSiteMapUrlElements());

    return this.siteMapContent;
  }

  generateSiteMapUrlElements() {
    return _.map(this.types, (resourceType) => {
      const noOfPages = Math.ceil(resourceType.size / this.maxPerPage);
      const pages = [];
      for (let i = 0; i < noOfPages; i++) {
        const page = i === 0 ? '' : `-${i + 1}`;
        const url = urlUtils.urlFor(
          { relativeUrl: '/sitemap-' + resourceType.name + page + '.xml' },
          true,
        );

        pages.push({ loc: url, ts: resourceType.lastModified });
      }

      return pages;
    }).flat();
  }

  reset() {
    this.siteMapContent = null;
  }
}

module.exports = SiteMapIndexGenerator;
