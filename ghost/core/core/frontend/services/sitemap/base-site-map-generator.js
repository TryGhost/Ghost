const moment = require('moment');
const errors = require('@tryghost/errors');
const urlUtils = require('../../../shared/url-utils').default;
const sitemapXml = require('./sitemap-xml');

class BaseSiteMapGenerator {
  constructor() {
    // {loc, ts, imageLoc}: one flat record per resource, rather than the
    // nested element tree the xml package used to take plus a parallel map
    // of Moments. Both were held for the lifetime of the index, and at 10k
    // posts they measured ~1.1 kB per resource against ~300 B for this.
    // Not keyed by id: every build fills a fresh generator, so nothing
    // overwrites a record.
    this.records = [];
    // Record indexes, newest record first. Dropped when the records are, and
    // whenever a change invalidates the rendered pages.
    this.sortedIndexes = null;
    // Kept apart from records so it survives releaseRecords().
    this.count = 0;
    // Set once the manager serves this generator: see seal().
    this.sealed = false;
    this.siteMapContent = new Map();
    this.lastModified = 0;
    this.maxPerPage = 50000;
  }

  /**
   * How many resources this generator covers, which outlives the records
   * themselves. Read with pageCount by the index generator, so it does not
   * have to know how the resources are stored.
   */
  get size() {
    return this.count;
  }

  get pageCount() {
    return Math.ceil(this.count / this.maxPerPage);
  }

  /**
   * Whether the records have been dropped because every page is rendered.
   * A released generator still serves its pages.
   */
  get released() {
    return this.records === null;
  }

  /**
   * Called by the manager when it starts serving this generator. A build
   * fills a generator and then swaps it in; nothing adds to it afterwards,
   * and anything that tried would render pages the cache already holds.
   */
  seal() {
    this.sealed = true;
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
    const sortedIndexes = this.getSortedIndexes();

    // Get the page of nodes that was requested
    const pageIndexes = sortedIndexes.subarray(
      (page - 1) * this.maxPerPage,
      page * this.maxPerPage,
    );

    // Do not generate empty sitemaps
    if (pageIndexes.length === 0) {
      return null;
    }

    const records = this.records;

    return sitemapXml.renderUrlSet(Array.from(pageIndexes, (index) => records[index]));
  }

  /**
   * Record indexes newest first, computed once per build rather than once per
   * page render. Indexes are sorted rather than the records themselves, which
   * leaves the records in allocation order: sorting them in place measured
   * 45 ms of GC marking at 300k records instead of 15 ms, because the
   * collector then traces them in timestamp order. The timestamps are copied
   * out first so the comparator reads a flat array rather than following a
   * pointer per comparison, which is a third of the sort at 300k. The index
   * tie-break keeps records sharing a timestamp in the order they were added.
   *
   * @returns {Int32Array}
   */
  getSortedIndexes() {
    if (this.sortedIndexes) {
      return this.sortedIndexes;
    }

    const records = this.records;
    const indexes = new Int32Array(records.length);
    const timestamps = new Float64Array(records.length);
    for (let i = 0; i < indexes.length; i++) {
      indexes[i] = i;
      timestamps[i] = records[i].ts;
    }
    indexes.sort((a, b) => timestamps[b] - timestamps[a] || a - b);

    this.sortedIndexes = indexes;
    return indexes;
  }

  addUrl(url, datum) {
    if (this.sealed || this.released) {
      throw new errors.IncorrectUsageError({
        message: `Cannot add a url to the ${this.name} sitemap generator once it is in use`,
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
    this.addRecord(this.createRecordFromDatum(url, datum, lastModified));
    // force regeneration of xml
    this.sortedIndexes = null;
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
    // One cache key per page, whatever a caller passes: a fractional page
    // would otherwise render a window straddling two pages, and both it and
    // a numeric string would take a cache entry of their own, which is
    // counted below to decide when the records are no longer needed.
    page = Number(page);

    if (this.siteMapContent.has(page)) {
      return this.siteMapContent.get(page);
    }

    // Not cached, so no page number a request carries can grow the map. A
    // released generator has every in-range page cached, so it only gets here
    // with an out-of-range page.
    if (!Number.isInteger(page) || !(page >= 1 && page <= this.pageCount)) {
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
   * Keeping the records past that point holds the sitemap in memory twice.
   */
  releaseRecords() {
    this.records = null;
    this.sortedIndexes = null;
  }

  addRecord(record) {
    this.records.push(record);
    this.count += 1;
  }

  reset() {
    this.records = [];
    this.sortedIndexes = null;
    this.count = 0;
    this.sealed = false;
    this.siteMapContent.clear();
    this.lastModified = 0;
  }
}

module.exports = BaseSiteMapGenerator;
