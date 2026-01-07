const DomainEvents = require('@tryghost/domain-events');
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

        events.on('router.created', (router) => {
            if (router.name === 'StaticRoutesRouter') {
                this.pages.addUrl(router.getRoute({absolute: true}), {id: router.identifier, staticRoute: true});
            }

            if (router.name === 'CollectionRouter') {
                this.pages.addUrl(router.getRoute({absolute: true}), {id: router.identifier, staticRoute: false});
            }
        });

        DomainEvents.subscribe(URLResourceUpdatedEvent, (event) => {
            this[event.data.resourceType].updateURL(event.data);
        });

        events.on('url.added', (obj) => {
            this[obj.resource.config.type].addUrl(obj.url.absolute, obj.resource.data);
        });

        events.on('url.removed', (obj) => {
            this[obj.resource.config.type].removeUrl(obj.url.absolute, obj.resource.data);
        });

        events.on('routers.reset', () => {
            this.pages && this.pages.reset();
            this.posts && this.posts.reset();
            this.users && this.users.reset();
            this.tags && this.tags.reset();
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
}

module.exports = SiteMapManager;
