const DomainEvents = require('@tryghost/domain-events');
const config = require('../../../shared/config');
const {URLResourceUpdatedEvent} = require('../../../shared/events');
const toPlain = require('../../../server/lib/common/to-plain');
const IndexMapGenerator = require('./site-map-index-generator');
const PagesMapGenerator = require('./page-map-generator');
const PostsMapGenerator = require('./post-map-generator');
const UsersMapGenerator = require('./user-map-generator');
const TagsMapGenerator = require('./tags-map-generator');

// This uses events from the routing service and the URL service
const events = require('../../../server/lib/common/events');

class SiteMapManager {
    constructor(options) {
        options = options || {};

        options.maxPerPage = options.maxPerPage || 50000;

        this.pages = options.pages || this.createPagesGenerator(options);
        this.posts = options.posts || this.createPostsGenerator(options);
        this.users = this.authors = options.authors || this.createUsersGenerator(options);
        this.tags = options.tags || this.createTagsGenerator(options);
        this.index = options.index || this.createIndexGenerator(options);

        // The lazy URL service does not fire url.added / url.removed /
        // URLResourceUpdatedEvent. When that mode is active the sitemap
        // populates itself from the database on first request instead.
        this._lazyRouting = options.lazyRouting === undefined
            ? config.get('lazyRouting')
            : options.lazyRouting;
        this._populated = false;
        this._populating = null;
        // Each routers.reset bumps this generation. An in-flight populate
        // captures the generation it started in; if that generation is no
        // longer current when the populate settles, its result is discarded
        // so we don't mark a stale (potentially mid-reset) lookup as ready.
        this._populationGeneration = 0;

        events.on('router.created', (router) => {
            if (router.name === 'StaticRoutesRouter') {
                this.pages.addUrl(router.getRoute({absolute: true}), {id: router.identifier, staticRoute: true});
            }

            if (router.name === 'CollectionRouter') {
                this.pages.addUrl(router.getRoute({absolute: true}), {id: router.identifier, staticRoute: false});
            }
        });

        if (!this._lazyRouting) {
            DomainEvents.subscribe(URLResourceUpdatedEvent, (event) => {
                this[event.data.resourceType].updateURL(event.data);
            });

            events.on('url.added', (obj) => {
                this[obj.resource.config.type].addUrl(obj.url.absolute, obj.resource.data);
            });

            events.on('url.removed', (obj) => {
                this[obj.resource.config.type].removeUrl(obj.url.absolute, obj.resource.data);
            });
        }

        events.on('routers.reset', () => {
            this.pages && this.pages.reset();
            this.posts && this.posts.reset();
            this.users && this.users.reset();
            this.tags && this.tags.reset();
            // Force the next sitemap request to repopulate from the DB.
            // Bumping the generation invalidates any populate currently in
            // flight (its `.then` will see a stale generation and bail).
            this._populated = false;
            this._populating = null;
            this._populationGeneration += 1;
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

    getIndexXml() {
        return this.index.getXml();
    }

    getSiteMapXml(type, page) {
        return this[type].getXml(page);
    }

    /**
     * Populate the sitemap from the database. Used when the lazy URL service
     * is active and the URL-added/-removed events are not firing. Idempotent;
     * a second call is a no-op while the first is in flight or has finished.
     */
    async ensurePopulatedFromDatabase() {
        if (!this._lazyRouting || this._populated) {
            return;
        }
        if (this._populating) {
            return this._populating;
        }
        const generation = this._populationGeneration;
        const populating = this._populateFromDatabase().then(
            () => {
                // If a routers.reset happened while we were running, the
                // generators have been wiped. Don't flip _populated; let the
                // next request kick off a fresh populate.
                if (this._populationGeneration === generation) {
                    this._populated = true;
                }
                // Only clear our own handle. routers.reset already nulled
                // _populating and a successor populate may have replaced it
                // — clobbering would orphan the successor.
                if (this._populating === populating) {
                    this._populating = null;
                }
            },
            (err) => {
                if (this._populating === populating) {
                    this._populating = null;
                }
                throw err;
            }
        );
        this._populating = populating;
        return this._populating;
    }

    async _populateFromDatabase() {
        const models = require('../../../server/models');
        const urlService = require('../../../server/services/url');
        const facade = urlService.facade;

        // Use TagPublic/Author for the shouldHavePosts gate (so tags/users
        // with no published posts are excluded). The visibility filter is
        // applied in TYPE_BROWSE_OPTIONS below; together these mirror what
        // the eager URL service does in services/url/config.js.
        await Promise.all([
            this._loadType(models.Post, 'posts', this.posts, facade),
            this._loadType(models.Post, 'pages', this.pages, facade),
            this._loadType(models.TagPublic, 'tags', this.tags, facade),
            this._loadType(models.Author, 'authors', this.users, facade)
        ]);
    }

    async _loadType(Model, type, generator, facade) {
        const baseOptions = browseOptionsFor(type);
        let page = 1;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const result = await Model.findPage({...baseOptions, page});
            for (const model of result.data) {
                const datum = toPlain(model);
                const url = facade.getUrlForResource({...datum, type}, {absolute: true});
                if (url && !url.match(/\/404\//)) {
                    generator.addUrl(url, datum);
                }
            }
            const totalPages = result?.meta?.pagination?.pages;
            // Guard against unexpected response shapes (missing meta,
            // empty page) so we don't loop forever.
            if (!totalPages || page >= totalPages || result.data.length === 0) {
                break;
            }
            page += 1;
        }
    }
}

// Per-router-type browse options for the lazy populate path. Mirrors the
// eager URL service's resource queries (services/url/config.js): posts/pages
// filter by published+type, tags/authors by visibility:public.
//
// `withRelated: ['tags', 'authors']` for posts: needed so the Bookshelf
// model's toJSON output includes `primary_tag` and `primary_author`, which
// custom permalink templates like `/:primary_tag/:slug/` evaluate against.
// Without this preload the lazy sitemap would emit `/undefined/.../` for
// any site using a primary_tag/primary_author permalink. Pages exclude
// these in the eager config so we mirror that.
const TYPE_BROWSE_OPTIONS = {
    posts: {limit: 200, status: 'published', filter: 'type:post', withRelated: ['tags', 'authors']},
    pages: {limit: 200, status: 'published', filter: 'type:page'},
    tags: {limit: 200, filter: 'visibility:public'},
    authors: {limit: 200, filter: 'visibility:public'}
};

function browseOptionsFor(type) {
    return TYPE_BROWSE_OPTIONS[type] || {limit: 200};
}

module.exports = SiteMapManager;
