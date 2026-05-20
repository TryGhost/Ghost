const DomainEvents = require('@tryghost/domain-events');
const config = require('../../../shared/config');
const {URLResourceUpdatedEvent} = require('../../../shared/events');
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

        await Promise.all([
            this._loadType('posts', this.posts, facade, models),
            this._loadType('pages', this.pages, facade, models),
            this._loadType('tags', this.tags, facade, models),
            this._loadType('authors', this.users, facade, models)
        ]);
    }

    async _loadType(type, generator, facade, models) {
        const fetchOptions = TYPE_FETCH_OPTIONS[type];
        if (!fetchOptions) {
            return;
        }
        // Use the same raw-knex path as the eager URL service's resource
        // fetcher (services/url/resources.js → raw_knex.fetchAll). The
        // previous implementation went through Bookshelf's findPage and
        // toPlain per row, which is minutes-not-seconds for 50k posts —
        // slow enough that edge proxies 503 on the first sitemap request.
        const objects = await models.Base.Model.raw_knex.fetchAll(fetchOptions);
        for (const datum of objects) {
            const url = facade.getUrlForResource({...datum, type}, {absolute: true});
            if (url && !url.match(/\/404\//)) {
                generator.addUrl(url, datum);
            }
        }
    }
}

// Mirrors the eager URL service's resource configs (services/url/config.js)
// so the lazy sitemap renders the same URL set as the eager service would.
// When the eager service is removed this becomes the only copy — kept
// inline (rather than imported from services/url) so the eager removal is
// a clean delete.
//
// The `exclude` lists trim heavy columns (mobiledoc, lexical, html,
// plaintext, codeinjection, og/twitter card fields, …) before they ever
// reach memory. Without them, fetchAll loads the full body of every post
// — multiple GB on a 50k-post site.
//
// `withRelated: ['tags', 'authors']` for posts is what surfaces
// `primary_tag` / `primary_author` on the result: Post.toJSON's computed
// `primary_tag` field (models/post.js) and the authors-relation
// serialize mixin both run as part of raw_knex.fetchAll's per-row
// toJSON pass, gated only on the relation being loaded.
const TYPE_FETCH_OPTIONS = {
    posts: {
        modelName: 'Post',
        filter: 'status:published+type:post',
        exclude: [
            'title',
            'mobiledoc',
            'lexical',
            'html',
            'plaintext',
            'status',
            'codeinjection_head',
            'codeinjection_foot',
            'meta_title',
            'meta_description',
            'custom_excerpt',
            'og_image',
            'og_title',
            'og_description',
            'twitter_image',
            'twitter_title',
            'twitter_description',
            'custom_template',
            'locale',
            'newsletter_id',
            'show_title_and_feature_image',
            'email_recipient_filter',
            'comment_id',
            'tiers'
        ],
        withRelated: ['tags', 'authors'],
        withRelatedFields: {
            tags: ['tags.id', 'tags.slug'],
            authors: ['users.id', 'users.slug']
        }
    },
    pages: {
        modelName: 'Post',
        filter: 'status:published+type:page',
        exclude: [
            'title',
            'mobiledoc',
            'lexical',
            'html',
            'plaintext',
            'codeinjection_head',
            'codeinjection_foot',
            'meta_title',
            'meta_description',
            'custom_excerpt',
            'og_image',
            'og_title',
            'og_description',
            'twitter_image',
            'twitter_title',
            'twitter_description',
            'custom_template',
            'locale',
            'tags',
            'authors',
            'primary_tag',
            'primary_author',
            'newsletter_id',
            'show_title_and_feature_image',
            'email_recipient_filter',
            'comment_id',
            'tiers'
        ]
    },
    tags: {
        modelName: 'Tag',
        filter: 'visibility:public',
        exclude: ['description', 'meta_title', 'meta_description', 'parent_id'],
        shouldHavePosts: {joinTo: 'tag_id', joinTable: 'posts_tags'}
    },
    authors: {
        modelName: 'User',
        filter: 'visibility:public',
        exclude: [
            'bio',
            'website',
            'location',
            'facebook',
            'twitter',
            'locale',
            'accessibility',
            'meta_title',
            'meta_description',
            'tour',
            'last_seen'
        ],
        shouldHavePosts: {joinTo: 'author_id', joinTable: 'posts_authors'}
    }
};

module.exports = SiteMapManager;
