var _       = require('lodash'),
    Promise = require('bluebird'),
    IndexMapGenerator = require('./index-generator'),
    PagesMapGenerator = require('./page-generator'),
    PostsMapGenerator = require('./post-generator'),
    UsersMapGenerator = require('./user-generator'),
    TagsMapGenerator  = require('./tag-generator'),
    SiteMapManager;

SiteMapManager = function (opts) {
    opts = opts || {};

    this.initialized = false;

    this.pages = opts.pages || this.createPagesGenerator(opts);
    this.posts = opts.posts || this.createPostsGenerator(opts);
    this.authors = opts.authors || this.createUsersGenerator(opts);
    this.tags = opts.tags || this.createTagsGenerator(opts);

    this.index = opts.index || this.createIndexGenerator(opts);
};

_.extend(SiteMapManager.prototype, {
    createIndexGenerator: function () {
        return new IndexMapGenerator(_.pick(this, 'pages', 'posts', 'authors', 'tags'));
    },

    createPagesGenerator: function (opts) {
        return new PagesMapGenerator(opts);
    },

    createPostsGenerator: function (opts) {
        return new PostsMapGenerator(opts);
    },

    createUsersGenerator: function (opts) {
        return new UsersMapGenerator(opts);
    },

    createTagsGenerator: function (opts) {
        return new TagsMapGenerator(opts);
    },

    init: function () {
        var self = this,
            initOps = [
                this.pages.init(),
                this.posts.init(),
                this.authors.init(),
                this.tags.init()
            ];

        return Promise.all(initOps).then(function () {
            self.initialized = true;
        });
    },

    getIndexXml: function () {
        if (!this.initialized) {
            return '';
        }

        return this.index.getIndexXml();
    },

    getSiteMapXml: function (type) {
        if (!this.initialized || !this[type]) {
            return null;
        }

        return this[type].siteMapContent;
    }
});

module.exports = SiteMapManager;
