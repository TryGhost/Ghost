const common = require('../../../server/lib/common'),
    IndexMapGenerator = require('./index-generator'),
    PagesMapGenerator = require('./page-generator'),
    PostsMapGenerator = require('./post-generator'),
    UsersMapGenerator = require('./user-generator'),
    TagsMapGenerator = require('./tag-generator');

class SiteMapManager {
    constructor(options) {
        options = options || {};

        this.pages = options.pages || this.createPagesGenerator(options);
        this.posts = options.posts || this.createPostsGenerator(options);
        this.users = this.authors = options.authors || this.createUsersGenerator(options);
        this.tags = options.tags || this.createTagsGenerator(options);
        this.index = options.index || this.createIndexGenerator(options);

        common.events.on('router.created', (router) => {
            if (router.name === 'StaticRoutesRouter') {
                this.pages.addUrl(router.getRoute({absolute: true}), {id: router.identifier, staticRoute: true});
            }

            if (router.name === 'CollectionRouter') {
                this.pages.addUrl(router.getRoute({absolute: true}), {id: router.identifier, staticRoute: false});
            }
        });

        common.events.on('url.added', (obj) => {
            this[obj.resource.config.type].addUrl(obj.url.absolute, obj.resource.data);
        });

        common.events.on('url.removed', (obj) => {
            this[obj.resource.config.type].removeUrl(obj.url.absolute, obj.resource.data);
        });

        common.events.on('routers.reset', () => {
            this.pages && this.pages.reset();
            this.posts && this.posts.reset();
            this.users && this.users.reset();
            this.tags && this.tags.reset();
        });
    }

    createIndexGenerator() {
        return new IndexMapGenerator({
            types: {
                pages: this.pages,
                posts: this.posts,
                authors: this.authors,
                tags: this.tags
            }
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

    getSiteMapXml(type) {
        return this[type].getXml();
    }
}

module.exports = SiteMapManager;
