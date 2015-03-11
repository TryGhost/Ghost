
var _ = require('lodash'),
    Promise = require('bluebird'),
    IndexMapGenerator = require('./index-generator'),
    PagesMapGenerator = require('./page-generator'),
    PostsMapGenerator = require('./post-generator'),
    UsersMapGenerator = require('./user-generator'),
    TagsMapGenerator = require('./tag-generator'),
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
    },

    pageAdded: function (page) {
        if (!this.initialized) {
            return;
        }

        if (page.get('status') !== 'published') {
            return;
        }

        this.pages.addUrl(page.toJSON());
    },

    pageEdited: function (page) {
        if (!this.initialized) {
            return;
        }

        var pageData = page.toJSON(),
            wasPublished = page.updated('status') === 'published',
            isPublished = pageData.status === 'published';

        // Published status hasn't changed and it's published
        if (isPublished === wasPublished && isPublished) {
            this.pages.updateUrl(pageData);
        } else if (!isPublished && wasPublished) {
            // Handle page going from published to draft
            this.pageDeleted(page);
        } else if (isPublished && !wasPublished) {
            // ... and draft to published
            this.pageAdded(page);
        }
    },

    pageDeleted: function (page) {
        if (!this.initialized) {
            return;
        }

        this.pages.removeUrl(page.toJSON());
    },

    postAdded: function (post) {
        if (!this.initialized) {
            return;
        }

        if (post.get('status') !== 'published') {
            return;
        }

        this.posts.addUrl(post.toJSON());
    },

    postEdited: function (post) {
        if (!this.initialized) {
            return;
        }

        var postData = post.toJSON(),
            wasPublished = post.updated('status') === 'published',
            isPublished = postData.status === 'published';

        // Published status hasn't changed and it's published
        if (isPublished === wasPublished && isPublished) {
            this.posts.updateUrl(postData);
        } else if (!isPublished && wasPublished) {
            // Handle post going from published to draft
            this.postDeleted(post);
        } else if (isPublished && !wasPublished) {
            // ... and draft to published
            this.postAdded(post);
        }
    },

    postDeleted: function (post) {
        if (!this.initialized) {
            return;
        }

        this.posts.removeUrl(post.toJSON());
    },

    userAdded: function (user) {
        if (!this.initialized) {
            return;
        }

        this.authors.addUrl(user.toJSON());
    },

    userEdited: function (user) {
        if (!this.initialized) {
            return;
        }

        var userData = user.toJSON();

        this.authors.updateUrl(userData);
    },

    userDeleted: function (user) {
        if (!this.initialized) {
            return;
        }

        this.authors.removeUrl(user.toJSON());
    },

    tagAdded: function (tag) {
        if (!this.initialized) {
            return;
        }

        this.tags.addUrl(tag.toJSON());
    },

    tagEdited: function (tag) {
        if (!this.initialized) {
            return;
        }

        this.tags.updateUrl(tag.toJSON());
    },

    tagDeleted: function (tag) {
        if (!this.initialized) {
            return;
        }

        this.tags.removeUrl(tag.toJSON());
    },

    // TODO: Call this from settings model when it's changed
    permalinksUpdated: function (permalinks) {
        if (!this.initialized) {
            return;
        }

        this.posts.updatePermalinksValue(permalinks.toJSON ? permalinks.toJSON() : permalinks);
    },

    _refreshAllPosts: _.throttle(function () {
        this.posts.refreshAllPosts();
    }, 3000, {
        leading: false,
        trailing: true
    })
});

module.exports = SiteMapManager;
