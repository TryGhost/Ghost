const moment = require('moment');
const urlUtils = require('../../../shared/url-utils').default;
const sitemapXml = require('./sitemap-xml');

class BaseSiteMapGenerator {
  constructor() {
    // id -> {loc, ts, imageLoc}: one flat record per resource, rather than
    // the nested element tree the xml package used to take plus a parallel
    // map of Moments. Both were held for the lifetime of the index, and at
    // 10k posts they measured ~1.1 kB per resource against ~300 B for this.
    this.nodeLookup = new Map();
    this.siteMapContent = new Map();
    this.lastModified = 0;
    this.maxPerPage = 50000;
  }

  /**
   * How many resources this generator holds. Read by the index generator to
   * work out how many pages the type needs, so it does not have to know how
   * they are stored.
   */
  get size() {
    return this.nodeLookup.size;
  }

  hasCanonicalUrl(datum, url) {
    if (!datum?.canonical_url) {
      return false;
    }

    // Sitemap data comes from raw knex queries which bypass model-layer
    // attribute transforms, so canonical_url may still be transform-ready
    // (__GHOST_URL__/...) and must be made absolute before comparing
    const canonicalUrl = urlUtils.transformReadyToAbsolute(datum.canonical_url);

    const normalizeUrl = (value) => {
      const normalizedUrl = new URL(value);
      normalizedUrl.pathname = normalizedUrl.pathname.replace(/\/+$/, '');
      return normalizedUrl.href;
    };

    try {
      return normalizeUrl(canonicalUrl) !== normalizeUrl(url);
    } catch {
      return canonicalUrl !== url;
    }
  }

  generateXmlFromNodes(page) {
    // Sort newest to oldest. The records are sorted in place of a wrapper
    // object per resource, so a render allocates one array of references.
    const records = [...this.nodeLookup.values()];
    records.sort((a, b) => b.ts - a.ts);

    // Get the page of nodes that was requested
    const pageRecords = records.slice((page - 1) * this.maxPerPage, page * this.maxPerPage);

    // Do not generate empty sitemaps
    if (pageRecords.length === 0) {
      return null;
    }

    return sitemapXml.renderUrlSet(pageRecords);
  }

  addUrl(url, datum) {
    if (this.hasCanonicalUrl(datum, url)) {
      return;
    }

    // Computed once and threaded through: the consumers below each used to
    // construct their own moment() from the same datum, which dominates the
    // cost of bulk adds.
    const lastModified = this.getLastModifiedForDatum(datum);

    this.updateLastModified(datum, lastModified);
    this.updateLookups(datum, this.createRecordFromDatum(url, datum, lastModified));
    // force regeneration of xml
    this.siteMapContent.clear();
  }

  /**
   * The parse stays with moment, which is more forgiving than `new Date` of
   * the shapes the database hands back; only what is stored changes, from a
   * Moment to the epoch milliseconds the sort and the lastmod both want.
   *
   * @returns {number} epoch milliseconds
   */
  getLastModifiedForDatum(datum) {
    const modifiedDate = datum.updated_at || datum.published_at || datum.created_at;

    if (!modifiedDate) {
      return Date.now();
    }

    const lastModified = moment(modifiedDate).valueOf();

    // An unparseable date used to render an empty <lastmod>; now it would
    // throw out of `new Date(NaN).toISOString()` and take the whole sitemap
    // with it, so fall back to now.
    return Number.isNaN(lastModified) ? Date.now() : lastModified;
  }

  updateLastModified(datum, lastModified = this.getLastModifiedForDatum(datum)) {
    if (lastModified > this.lastModified) {
      this.lastModified = lastModified;
    }
  }

  /**
   * @param {string} url
   * @param {Object} datum
   * @param {number} [lastModified] epoch milliseconds
   * @returns {{loc: string, ts: number, imageLoc: string|null}}
   */
  createRecordFromDatum(url, datum, lastModified = this.getLastModifiedForDatum(datum)) {
    return {
      // Transformed here rather than over the finished document: the two
      // urls are the only transform-ready values a sitemap carries, and a
      // regex across several megabytes of xml both costs and leaves a rope.
      loc: urlUtils.transformReadyToAbsolute(url),
      ts: lastModified,
      imageLoc: this.createImageLocFromDatum(datum),
    };
  }

  createImageLocFromDatum(datum) {
    // Check for cover first because user has cover but the rest only have image
    const image = datum.cover_image || datum.profile_image || datum.feature_image;

    if (!image) {
      return null;
    }

    // Grab the image url
    const imageUrl = urlUtils.urlFor('image', { image: image }, true);

    // Verify the url structure. Checked before the transform, as it always
    // has been: the url the validator sees is the one urlFor returned.
    if (!this.validateImageUrl(imageUrl)) {
      return null;
    }

    return urlUtils.transformReadyToAbsolute(imageUrl);
  }

  validateImageUrl(imageUrl) {
    return !!imageUrl;
  }

  getXml(page = 1) {
    if (this.siteMapContent.has(page)) {
      return this.siteMapContent.get(page);
    }

    const content = this.generateXmlFromNodes(page);
    this.siteMapContent.set(page, content);
    return content;
  }

  updateLookups(datum, record) {
    this.nodeLookup.set(datum.id, record);
  }

  reset() {
    this.nodeLookup.clear();
    this.siteMapContent.clear();
    this.lastModified = 0;
  }
}

module.exports = BaseSiteMapGenerator;
