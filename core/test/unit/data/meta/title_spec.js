var should = require('should'),
    sinon = require('sinon'),
    getTitle = require('../../../../frontend/meta/title'),
    settingsCache = require('../../../../server/services/settings/cache');

describe('getTitle', function () {
    var localSettingsCache = {};

    beforeEach(function () {
        sinon.stub(settingsCache, 'get').callsFake(function (key) {
            return localSettingsCache[key];
        });
    });

    afterEach(function () {
        sinon.restore();
        localSettingsCache = {};
    });

    it('should return meta_title if on data root', function () {
        var title = getTitle({
            meta_title: 'My test title'
        });

        title.should.equal('My test title');
    });

    it('should return site title if on home', function () {
        localSettingsCache.title = 'My site title';

        var title = getTitle({}, {context: 'home'});
        title.should.equal('My site title');
    });

    it('should return site meta_title if on home and mata_title present', function () {
        localSettingsCache.title = 'My site title';
        localSettingsCache.meta_title = 'My site meta title';

        var title = getTitle({}, {context: 'home'});
        title.should.equal('My site meta title');
    });

    it('should return facebook site title if in home context', function () {
        localSettingsCache.title = 'My site title';
        localSettingsCache.og_title = 'My site facebook meta title';

        var title = getTitle({
        }, {
            context: ['home']
        }, {
            property: 'og'
        });

        title.should.equal('My site facebook meta title');
    });

    it('should return twitter site title if in home context', function () {
        localSettingsCache.title = 'My site title';
        localSettingsCache.twitter_title = 'My site twitter meta title';

        var title = getTitle({
        }, {
            context: ['home']
        }, {
            property: 'twitter'
        });

        title.should.equal('My site twitter meta title');
    });

    it('should return author name - site title if on data author page', function () {
        localSettingsCache.title = 'My site title 2';

        var title = getTitle({
            author: {
                name: 'Author Name'
            }
        }, {context: ['author']});

        title.should.equal('Author Name - My site title 2');
    });

    it('should return author page title if on data author page with more then one page', function () {
        localSettingsCache.title = 'My site title 2';

        var title = getTitle({
            author: {
                name: 'Author Name'
            }
        }, {
            context: ['author', 'paged'],
            pagination: {
                total: 40,
                page: 3
            }
        });

        title.should.equal('Author Name - My site title 2 (Page 3)');
    });

    it('should return tag name - site title if on data tag page no meta_title', function () {
        localSettingsCache.title = 'My site title 3';

        var title = getTitle({
            tag: {
                name: 'Tag Name'
            }
        }, {context: ['tag']});

        title.should.equal('Tag Name - My site title 3');
    });

    it('should return tag name - site title if on data tag page no meta_title (Page #)', function () {
        localSettingsCache.title = 'My site title 3';

        var title = getTitle({
            tag: {
                name: 'Tag Name'
            }
        }, {
            context: ['tag', 'paged'],
            pagination: {
                total: 40,
                page: 39
            }
        });

        title.should.equal('Tag Name - My site title 3 (Page 39)');
    });

    it('should return translated pagination-string if passed in options object', function () {
        localSettingsCache.title = 'This is my site title';

        var title = getTitle({
            tag: {
                name: 'Tag Name'
            }
        }, {
            context: ['tag', 'paged'],
            pagination: {
                total: 40,
                page: 23
            }
        }, {
            hash: {
                page: ' p.%'
            }
        });

        title.should.equal('Tag Name - This is my site title p.23');
    });

    it('should return tag meta_title if in tag data', function () {
        var title = getTitle({
            tag: {
                name: 'Tag Name',
                meta_title: 'My Tag Meta Title!'
            }
        }, {context: ['tag']});

        title.should.equal('My Tag Meta Title!');
    });

    it('should return post title if in post context', function () {
        var title = getTitle({
            post: {
                title: 'My awesome post!'
            }
        }, {context: ['post']});

        title.should.equal('My awesome post!');
    });

    it('should return OG post title if in post context', function () {
        var title = getTitle({
            post: {
                title: 'My awesome post!',
                og_title: 'My Custom Facebook Title'
            }
        }, {
            context: ['post']
        }, {
            property: 'og'
        });

        title.should.equal('My Custom Facebook Title');
    });

    it('should return twitter post title if in post context', function () {
        var title = getTitle({
            post: {
                title: 'My awesome post!',
                twitter_title: 'My Custom Twitter Title'
            }
        }, {
            context: ['post']
        }, {
            property: 'twitter'
        });

        title.should.equal('My Custom Twitter Title');
    });

    it('should not return default post title if in amp context and called with twitter property', function () {
        var title = getTitle({
            post: {
                title: 'My awesome post!',
                twitter_title: ''
            }
        }, {
            context: ['amp', 'post']
        }, {
            property: 'twitter'
        });

        title.should.equal('');
    });

    it('should return post title if in amp context', function () {
        var title = getTitle({
            post: {
                title: 'My awesome post!'
            }
        }, {context: ['amp', 'post']});

        title.should.equal('My awesome post!');
    });

    it('v2: should return page title if in page context', function () {
        var title = getTitle({
            page: {
                title: 'My awesome page!'
            }
        }, {context: ['page']});

        title.should.equal('My awesome page!');
    });

    it('canary: should return page title if in page context', function () {
        var title = getTitle({
            page: {
                title: 'My awesome page!'
            }
        }, {context: ['page']});

        title.should.equal('My awesome page!');
    });

    it('v3: should return page title if in page context', function () {
        var title = getTitle({
            page: {
                title: 'My awesome page!'
            }
        }, {context: ['page']});

        title.should.equal('My awesome page!');
    });

    // NOTE: this case is unlikely as Ghost doesn't support AMP for static pages
    it('should return post title if in amp and page context', function () {
        var title = getTitle({
            page: {
                title: 'My awesome page!'
            }
        }, {context: ['amp', 'page']});

        title.should.equal('My awesome page!');
    });

    it('should return post meta_title if in post data', function () {
        var title = getTitle({
            post: {
                name: 'My awesome post!',
                meta_title: 'My Tag Meta Title Post!  '
            }
        }, {context: ['post']});

        title.should.equal('My Tag Meta Title Post!');
    });

    it('should return post meta_title if amp context in post data', function () {
        var title = getTitle({
            post: {
                name: 'My awesome post!',
                meta_title: 'My Tag Meta Title Post!  '
            }
        }, {context: ['amp', 'post']});

        title.should.equal('My Tag Meta Title Post!');
    });

    it('should return site title with page if unknown type', function () {
        localSettingsCache.title = 'My site title 4';

        var title = getTitle({}, {
            context: ['paged'],
            pagination: {
                total: 40,
                page: 35
            }
        });

        title.should.equal('My site title 4 (Page 35)');
    });
});
