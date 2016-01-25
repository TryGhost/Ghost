/*globals describe, it*/
var getTitle = require('../../../server/data/meta/title'),
    config = require('../../../server/config');

describe('getTitle', function () {
    it('should return meta_title if on data root', function () {
        var title = getTitle({
            meta_title: 'My test title'
        });
        title.should.equal('My test title');
    });

    it('should return blog title if on home', function () {
        config.set({
            theme: {
                title: 'My blog title'
            }
        });
        var title = getTitle({}, {context: 'home'});
        title.should.equal('My blog title');
    });

    it('should return author name - blog title if on data author page', function () {
        config.set({
            theme: {
                title: 'My blog title 2'
            }
        });
        var title = getTitle({
            author: {
                name: 'Author Name'
            }
        }, {context: 'author'});
        title.should.equal('Author Name - My blog title 2');
    });

    it('should return author page title if on data author page with more then one page', function () {
        config.set({
            theme: {
                title: 'My blog title 2'
            }
        });
        var title = getTitle({
            author: {
                name: 'Author Name'
            }
        }, {
            context: 'author',
            pagination: {
                total: 40,
                page: 3
            }
        });
        title.should.equal('Author Name - Page 3 - My blog title 2');
    });

    it('should return tag name - blog title if on data tag page no meta_title', function () {
        config.set({
            theme: {
                title: 'My blog title 3'
            }
        });
        var title = getTitle({
            tag: {
                name: 'Tag Name'
            }
        }, {context: 'tag'});
        title.should.equal('Tag Name - My blog title 3');
    });

    it('should return tag name - page - blog title if on data tag page no meta_title', function () {
        config.set({
            theme: {
                title: 'My blog title 3'
            }
        });
        var title = getTitle({
            tag: {
                name: 'Tag Name'
            }
        }, {
            context: 'tag',
            pagination: {
                total: 40,
                page: 39
            }
        });
        title.should.equal('Tag Name - Page 39 - My blog title 3');
    });

    it('should return tag meta_title if in tag data', function () {
        var title = getTitle({
            tag: {
                name: 'Tag Name',
                meta_title: 'My Tag Meta Title!'
            }
        }, {context: 'tag'});
        title.should.equal('My Tag Meta Title!');
    });

    it('should return post title if in post context', function () {
        var title = getTitle({
            post: {
                title: 'My awesome post!'
            }
        }, {context: 'post'});
        title.should.equal('My awesome post!');
    });

    it('should return post title if in page context', function () {
        var title = getTitle({
            post: {
                title: 'My awesome page!'
            }
        }, {context: 'page'});
        title.should.equal('My awesome page!');
    });

    it('should return post meta_title if in post data', function () {
        var title = getTitle({
            post: {
                name: 'My awesome post!',
                meta_title: 'My Tag Meta Title Post!  '
            }
        }, {context: 'post'});
        title.should.equal('My Tag Meta Title Post!');
    });

    it('should return blog title with page if unknown type', function () {
        config.set({
            theme: {
                title: 'My blog title 4'
            }
        });
        var title = getTitle({}, {
            context: 'paged',
            pagination: {
                total: 40,
                page: 35
            }
        });
        title.should.equal('My blog title 4 - Page 35');
    });
});
