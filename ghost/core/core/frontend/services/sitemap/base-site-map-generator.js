const moment = require('moment');
const errors = require('@tryghost/errors');
const urlUtils = require('../../../shared/url-utils').default;
const sitemapXml = require('./sitemap-xml');

const INITIAL_CAPACITY = 64;

class BaseSiteMapGenerator {
  constructor() {
    // One resource per index across parallel arrays rather than an object
    // per resource: the lastmod timestamps sit unboxed in a typed array, and
    // the heap holds little more than the url strings. Every build fills a
    // fresh generator, so nothing is ever looked up or overwritten by id.
    this.locs = [];
    this.timestamps = new Float64Array(INITIAL_CAPACITY);
    // Indexed like locs; null where the resource has no image.
    this.imageLocs = [];
    // Indexes into the arrays above, newest first. Dropped wherever
    // siteMapContent is.
    this.order = null;
    // Kept apart from locs so it survives releaseRecords().
    this.count = 0;
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
    return this.count;
  }

  get pageCount() {
    return Math.ceil(this.count / this.maxPerPage);
  }

  /**
   * Whether the records have been dropped because every page is rendered.
   * A released generator can still serve its pages but takes no more urls.
   */
  get released() {
    return this.locs === null;
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
    const order = this.getOrder();

    // Get the page of nodes that was requested
    const pageOrder = order.subarray((page - 1) * this.maxPerPage, page * this.maxPerPage);

    // Do not generate empty sitemaps
    if (pageOrder.length === 0) {
      return null;
    }

    const entries = new Array(pageOrder.length);
    for (let i = 0; i < pageOrder.length; i++) {
      const index = pageOrder[i];
      entries[i] = {
        loc: this.locs[index],
        ts: this.timestamps[index],
        imageLoc: this.imageLocs[index],
      };
    }

    return sitemapXml.renderUrlSet(entries);
  }

  /**
   * Resource indexes sorted newest to oldest, computed once for every page
   * rather than once per page. Ties keep the order they were added in.
   *
   * @returns {Int32Array}
   */
  getOrder() {
    if (this.order) {
      return this.order;
    }

    const size = this.size;
    // Nothing is added between a build and its first render, so the unused
    // capacity is released here.
    if (this.timestamps.length > size) {
      this.timestamps = this.timestamps.slice(0, size);
    }

    const timestamps = this.timestamps;
    const order = new Int32Array(size);
    for (let i = 0; i < size; i++) {
      order[i] = i;
    }
    order.sort((a, b) => timestamps[b] - timestamps[a] || a - b);

    this.order = order;
    return order;
  }

  addUrl(url, datum) {
    if (this.released) {
      throw new errors.IncorrectUsageError({
        message: 'Cannot add a url to a sitemap generator whose pages are all rendered',
      });
    }

    if (this.hasCanonicalUrl(datum, url)) {
      return;
    }

    // Computed once and threaded through: the consumers below each used to
    // construct their own moment() from the same datum, which dominates the
    // cost of bulk adds.
    const lastModified = this.getLastModifiedForDatum(datum);

    this.updateLastModified(datum, lastModified);
    this.addRecord(
      // Transformed here rather than over the finished document: the two
      // urls are the only transform-ready values a sitemap carries, and a
      // regex across several megabytes of xml both costs and leaves a rope.
      urlUtils.transformReadyToAbsolute(url),
      lastModified,
      this.createImageLocFromDatum(datum),
    );
    // force regeneration of xml
    this.order = null;
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

    // Not cached, so any page number a request carries cannot grow the map.
    // This is also the only way a released generator gets here.
    if (!(page >= 1 && page <= this.pageCount)) {
      return null;
    }

    const content = this.generateXmlFromNodes(page);
    this.siteMapContent.set(page, content);

    if (this.siteMapContent.size === this.pageCount) {
      this.releaseRecords();
    }

    return content;
  }

  /**
   * Once every page is rendered, the pages hold everything the records did.
   * Rebuilds replace the generator rather than adding to it, so holding the
   * records until then would keep the sitemap in memory twice.
   */
  releaseRecords() {
    this.locs = null;
    this.timestamps = null;
    this.imageLocs = null;
    this.order = null;
  }

  /**
   * @param {string} loc absolute url
   * @param {number} ts epoch milliseconds
   * @param {string|null} imageLoc absolute image url
   */
  addRecord(loc, ts, imageLoc) {
    const index = this.count;
    if (index === this.timestamps.length) {
      const grown = new Float64Array(Math.max(INITIAL_CAPACITY, index * 2));
      grown.set(this.timestamps);
      this.timestamps = grown;
    }

    this.locs.push(loc);
    this.timestamps[index] = ts;
    this.imageLocs.push(imageLoc);
    this.count += 1;
  }

  reset() {
    this.locs = [];
    this.timestamps = new Float64Array(INITIAL_CAPACITY);
    this.imageLocs = [];
    this.order = null;
    this.count = 0;
    this.siteMapContent.clear();
    this.lastModified = 0;
  }
}

module.exports = BaseSiteMapGenerator;
