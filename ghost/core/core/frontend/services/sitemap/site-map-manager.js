const DomainEvents = require('@tryghost/domain-events');
const errors = require('@tryghost/errors');
const urlUtils = require('../../../shared/url-utils');
const {URLResourceUpdatedEvent} = require('../../../shared/events');
const IndexMapGenerator = require('./site-map-index-generator');
const PagesMapGenerator = require('./page-map-generator');
const PostsMapGenerator = require('./post-map-generator');
const UsersMapGenerator = require('./user-map-generator');
const TagsMapGenerator = require('./tags-map-generator');

// Frontend-internal routing events (router.created / routers.reset)
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
    'canonical_url'
];

class SiteMapManager {
    constructor(options) {
        options = options || {};

        options.maxPerPage = options.maxPerPage || 50000;

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
        // surface (site.changed, url.added, url.removed). Injectable for
        // tests; resolved at construction (not module load) for the same
        // boot-order reason as the url service above.
        this._serverEvents = options.serverEvents || require('../proxy').serverEvents;

        // Index state for the build path. _indexEpoch increments on every
        // invalidation signal; a build compares the epoch it started with so
        // an invalidated-while-running build never marks the index ready.
        this._indexBuilt = false;
        this._buildInFlight = null;
        this._indexEpoch = 0;
        // Static/collection route entries only arrive via router.created,
        // which fires at boot and routes reload. They are recorded here so
        // every rebuild can replay them after resetting the generators.
        this._routerEntries = [];

        routingEvents.on('router.created', (router) => {
            if (router.name !== 'StaticRoutesRouter' && router.name !== 'CollectionRouter') {
                return;
            }
            const entry = {
                url: router.getRoute({absolute: true}),
                datum: {id: router.identifier, staticRoute: router.name === 'StaticRoutesRouter'}
            };
            this._routerEntries.push(entry);
            this.pages.addUrl(entry.url, entry.datum);
            // A router registering after a build (routes reload re-registers
            // them one macrotask after routers.reset) must not leave a
            // zero-router index marked built — the CDN would pin it.
            if (this._getUrlService().isLazy()) {
                this._invalidateIndex();
            }
        });

        // Invalidation is lazy-mode only. Everywhere the eager service runs
        // (flag off AND compare mode) its per-URL feed below keeps the index
        // current after the initial build, exactly as before this change —
        // deploying is a no-op until the lazy flip. Pure lazy fires no
        // events, so there the index empties and the next read rebuilds.
        this._serverEvents.on('site.changed', () => {
            if (this._getUrlService().isLazy()) {
                this._invalidateIndex();
            }
        });

        // The eager URL service's per-URL feed, active in both eager-only
        // and compare mode; under pure lazy these events never fire.
        DomainEvents.subscribe(URLResourceUpdatedEvent, (event) => {
            this[event.data.resourceType].updateURL(event.data);
        });

        this._serverEvents.on('url.added', (obj) => {
            this[obj.resource.config.type].addUrl(obj.url.absolute, obj.resource.data);
        });

        this._serverEvents.on('url.removed', (obj) => {
            this[obj.resource.config.type].removeUrl(obj.url.absolute, obj.resource.data);
        });

        routingEvents.on('routers.reset', () => {
            this.pages && this.pages.reset();
            this.posts && this.posts.reset();
            this.users && this.users.reset();
            this.tags && this.tags.reset();
            // The routers re-register right after a reset and refill the
            // list; keeping stale entries would resurrect deleted routes.
            this._routerEntries = [];
            if (this._getUrlService().isLazy()) {
                this._invalidateIndex();
            }
        });
    }

    createIndexGenerator(options) {
        return new IndexMapGenerator({
            types: {
                pages: this.pages,
                posts: this.posts,
                authors: this.authors,
                tags: this.tags
            },
            maxPerPage: options.maxPerPage
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
     * no caller can render from an unbuilt index. The index is built once on
     * first read in every mode. Wherever the eager service runs (eager-only
     * and compare mode) the per-URL events keep it current from then on
     * (and heal any gap in the initial snapshot, since addUrl is id-keyed);
     * under pure lazy the invalidation signals empty it and the next read
     * rebuilds.
     *
     * Concurrent readers share one build. A build whose result was
     * invalidated while it ran is discarded and the read fails — the index
     * must never serve pre-invalidation data (the CDN would pin it for the
     * full cache maxAge), and a 503 is retried by crawlers and stored by
     * nobody. Unreachable with eager (nothing invalidates), and
     * deliberately no retry; if SITEMAP_BUILD_SUPERSEDED shows up in the
     * logs at any rate worth caring about, add one then.
     */
    async _ensureIndexReady() {
        if (this._indexBuilt) {
            return;
        }
        if (!this._buildInFlight) {
            this._buildInFlight = this._buildIndex().finally(() => {
                this._buildInFlight = null;
            });
        }
        await this._buildInFlight;

        if (!this._indexBuilt) {
            throw new errors.MaintenanceError({
                message: 'Sitemap index build was invalidated by a concurrent site change',
                code: 'SITEMAP_BUILD_SUPERSEDED'
            });
        }
    }

    async _buildIndex() {
        const epoch = this._indexEpoch;
        const urlService = this._getUrlService();
        const fetch = type => urlService.getRoutableResources(type, {columns: SITEMAP_COLUMNS});

        const [posts, pages, tags, authors] = await Promise.all(
            [fetch('posts'), fetch('pages'), fetch('tags'), fetch('authors')]
        );
        const resources = {posts, pages, tags, authors};

        if (epoch !== this._indexEpoch) {
            // Invalidated while fetching: leave the generators alone and let
            // _ensureIndexReady start over.
            return;
        }
        // Everything from here on is synchronous, so no request can observe
        // a half-applied index.
        this.posts.reset();
        this.pages.reset();
        this.tags.reset();
        this.users.reset();
        for (const entry of this._routerEntries) {
            this.pages.addUrl(entry.url, entry.datum);
        }
        for (const type of ['posts', 'pages', 'tags', 'authors']) {
            for (const datum of resources[type]) {
                this._applyResource(type, datum);
            }
        }
        this._indexBuilt = true;
    }

    _invalidateIndex() {
        this._indexBuilt = false;
        this._indexEpoch += 1;
    }

    /**
     * Add a single resource to the index.
     */
    _applyResource(type, datum) {
        // skipComparison: teeing every bulk row through the compare machinery
        // would capture a stack and queue a background lazy computation per
        // resource, per build. Enumeration parity comes from the
        // getRoutableResources id-set comparison; per-URL parity from
        // organic request traffic.
        const url = this._getUrlService().getUrlForResource({...datum, type}, {absolute: true, skipComparison: true});
        // Exact match on the not-found sentinel: a real resource can carry
        // a slug like "404" (/tag/404/) and must stay in the sitemap.
        if (url && url !== this._notFoundUrl()) {
            this[type].addUrl(url, datum);
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
            this._urlService = require('../proxy').urlService.facade;
        }
        return this._urlService;
    }
}

module.exports = SiteMapManager;
