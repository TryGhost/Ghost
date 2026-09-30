const { performance } = require('node:perf_hooks');
const { setImmediate: yieldToEventLoop } = require('node:timers/promises');
const errors = require('@tryghost/errors');
const urlUtils = require('../../../shared/url-utils').default;
const IndexMapGenerator = require('./site-map-index-generator');
const PagesMapGenerator = require('./page-map-generator');
const PostsMapGenerator = require('./post-map-generator');
const UsersMapGenerator = require('./user-map-generator');
const TagsMapGenerator = require('./tags-map-generator');

// Frontend-internal routing domain events (RouteRegistered / RoutesReset)
const routingEvents = require('../routing/events');

// What the sitemap XML reads off each resource, beyond the columns URL
// computation needs: lastmod dates, image nodes, and the canonical_url skip
// rule applied by the generators.
const SITEMAP_COLUMNS = [
  'updated_at',
  'published_at',
  'created_at',
  'feature_image',
  'cover_image',
  'profile_image',
  'canonical_url',
];

const RESOURCE_TYPES = ['posts', 'pages', 'tags', 'authors'];

// Longest stretch a build runs before yielding to the event loop.
const DEFAULT_BUILD_SLICE_MS = 10;

// Builds a reader will start before giving up on a site that keeps changing.
const MAX_BUILD_ATTEMPTS = 3;

class SiteMapManager {
  constructor(options) {
    options = options || {};

    options.maxPerPage = options.maxPerPage || 50000;
    // Every build creates fresh generators from these.
    this._options = options;
    this._buildSliceMs = options.buildSliceMs ?? DEFAULT_BUILD_SLICE_MS;

    this.pages = options.pages || this.createPagesGenerator(options);
    this.posts = options.posts || this.createPostsGenerator(options);
    this.users = this.authors = options.authors || this.createUsersGenerator(options);
    this.tags = options.tags || this.createTagsGenerator(options);
    this.index = options.index || this.createIndexGenerator(options);

    // The URL service is injectable for tests; in production it is
    // resolved lazily through the proxy seam on first use, because the
    // url service loads at require time and loading it when this module
    // loads would change boot order.
    this._urlService = options.urlService || null;

    // Server events arrive through the proxy's narrow subscription
    // surface (site.changed). Injectable for tests; resolved at
    // construction (not module load) for the same boot-order reason as
    // the url service above.
    this._serverEvents = options.serverEvents || require('../proxy').serverEvents;

    // Index state for the build path. _indexEpoch increments on every
    // invalidation signal; a build compares the epoch it started with so
    // an invalidated-while-running build never marks the index ready.
    this._indexBuilt = false;
    this._buildInFlight = null;
    this._indexEpoch = 0;
    // Static/collection route entries only arrive via RouteRegistered,
    // which fires at boot and routes reload. They are recorded here so
    // every rebuild can replay them into its fresh generators.
    this._routerEntries = [];

    routingEvents.on('RouteRegistered', ({ path, type, id }) => {
      if (type !== 'StaticRoutesRouter' && type !== 'CollectionRouter') {
        return;
      }
      const entry = {
        url: urlUtils.createUrl(path, true),
        datum: { id, staticRoute: type === 'StaticRoutesRouter' },
      };
      this._routerEntries.push(entry);
      // A router registering after a build must not leave a
      // zero-router index marked built — the CDN would pin it.
      this._invalidateIndex();
    });

    // Nothing feeds the index per URL, so any change to the site's content
    // empties it and the next read rebuilds.
    this._serverEvents.on('site.changed', () => {
      this._invalidateIndex();
    });

    routingEvents.on('RoutesReset', () => {
      this.pages && this.pages.reset();
      this.posts && this.posts.reset();
      this.users && this.users.reset();
      this.tags && this.tags.reset();
      // The routers re-register right after a reset and refill the
      // list; keeping stale entries would resurrect deleted routes.
      this._routerEntries = [];
      this._invalidateIndex();
    });
  }

  createIndexGenerator(options, types = this) {
    return new IndexMapGenerator({
      types: {
        pages: types.pages,
        posts: types.posts,
        authors: types.authors,
        tags: types.tags,
      },
      maxPerPage: options.maxPerPage,
    });
  }

  createPagesGenerator(options) {
    return new PagesMapGenerator(options);
  }

  createPostsGenerator(options) {
    return new PostsMapGenerator(options);
  }

  createUsersGenerator(options) {
    return new UsersMapGenerator(options);
  }

  createTagsGenerator(options) {
    return new TagsMapGenerator(options);
  }

  async getIndexXml() {
    await this._ensureIndexReady();
    return this.index.getXml();
  }

  async getSiteMapXml(type, page) {
    await this._ensureIndexReady();
    return this[type].getXml(page);
  }

  /**
   * Make sure the index is ready to serve; every XML read awaits this, so
   * no caller can render from an unbuilt index. The index is built on first
   * read; the invalidation signals empty it and the next read rebuilds.
   *
   * Reads wait for the rebuild rather than being served the previous index.
   * site.changed is emitted by the same response that purges the CDN, so the
   * first read after an invalidation is the one the CDN stores for the full
   * cache maxAge: serving the previous index there would pin a sitemap
   * missing the change on every publish.
   *
   * Concurrent readers share one build. A build invalidated while it runs is
   * abandoned and a fresh one started; a site changing faster than the index
   * can be built fails the read with a 503, which crawlers retry and nobody
   * stores.
   */
  async _ensureIndexReady() {
    for (let attempt = 0; attempt < MAX_BUILD_ATTEMPTS && !this._indexBuilt; attempt++) {
      if (!this._buildInFlight) {
        this._buildInFlight = this._buildIndex().finally(() => {
          this._buildInFlight = null;
        });
      }
      await this._buildInFlight;
    }

    if (!this._indexBuilt) {
      throw new errors.MaintenanceError({
        message: 'Sitemap index build was repeatedly invalidated by concurrent site changes',
        code: 'SITEMAP_BUILD_SUPERSEDED',
      });
    }
  }

  /**
   * Builds into fresh generators and swaps them in once complete, so the
   * build can yield to the event loop without any reader seeing a partial
   * index. The epoch is checked after every yield: an invalidation (including
   * a RouteRegistered mid-build) abandons the build without swapping.
   */
  async _buildIndex() {
    const epoch = this._indexEpoch;
    const urlService = this._getUrlService();
    const fetch = (type) => urlService.getRoutableResources(type, { columns: SITEMAP_COLUMNS });

    const [posts, pages, tags, authors] = await Promise.all(RESOURCE_TYPES.map(fetch));
    const resources = { posts, pages, tags, authors };

    if (epoch !== this._indexEpoch) {
      return;
    }

    const next = {
      posts: this.createPostsGenerator(this._options),
      pages: this.createPagesGenerator(this._options),
      tags: this.createTagsGenerator(this._options),
      authors: this.createUsersGenerator(this._options),
    };
    for (const entry of this._routerEntries) {
      next.pages.addUrl(entry.url, entry.datum);
    }

    let sliceStart = performance.now();
    for (const type of RESOURCE_TYPES) {
      const rows = resources[type];
      for (let i = 0; i < rows.length; i++) {
        this._applyResource(next, type, rows[i]);
        // Release each row once applied, so rows and records are not both
        // fully resident.
        rows[i] = undefined;

        if (performance.now() - sliceStart >= this._buildSliceMs) {
          await yieldToEventLoop();
          if (epoch !== this._indexEpoch) {
            return;
          }
          sliceStart = performance.now();
        }
      }
    }

    this.posts = next.posts;
    this.pages = next.pages;
    this.tags = next.tags;
    this.users = this.authors = next.authors;
    // The index generator holds references to the generators it counts.
    this.index = this.createIndexGenerator(this._options, next);
    this._indexBuilt = true;
  }

  _invalidateIndex() {
    this._indexBuilt = false;
    this._indexEpoch += 1;
    // The index generator's cached xml is valid exactly while _indexBuilt
    // is, so the two are dropped together.
    this.index.reset();
  }

  /**
   * Add a single resource to a set of generators being built.
   */
  _applyResource(generators, type, datum) {
    const url = this._getUrlService().getUrlForResource({ ...datum, type }, { absolute: true });
    // Exact match on the not-found sentinel: a real resource can carry
    // a slug like "404" (/tag/404/) and must stay in the sitemap.
    if (url && url !== this._notFoundUrl()) {
      generators[type].addUrl(url, datum);
    }
  }

  _notFoundUrl() {
    // The site URL is fixed at boot, so compute the sentinel once.
    if (!this._notFoundUrlCached) {
      this._notFoundUrlCached = urlUtils.createUrl('/404/', true);
    }
    return this._notFoundUrlCached;
  }

  _getUrlService() {
    if (!this._urlService) {
      this._urlService = require('../proxy').urlService;
    }
    return this._urlService;
  }
}

module.exports = SiteMapManager;
