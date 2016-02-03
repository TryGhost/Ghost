/*globals describe, it*/
var getUrl = require('../../../server/data/meta/url');

describe('getUrl', function () {
    it('should return url for a post', function () {
        var url = getUrl({
            html: '<p>Welcome to my post.</p>',
            markdown: 'Welcome to my post.',
            title: 'Welcome Post',
            slug: 'welcome-post',
            url: '/post/welcome-post/'
        });
        url.should.equal('/post/welcome-post/');
    });

    it('should return absolute url for a post', function () {
        var url = getUrl({
            html: '<p>Welcome to my post.</p>',
            markdown: 'Welcome to my post.',
            title: 'Welcome Post',
            slug: 'welcome-post',
            url: '/post/welcome-post/'
        }, true);
        url.should.equal('http://127.0.0.1:2369/post/welcome-post/');
    });

    it('should return url for a tag', function () {
        var url = getUrl({
            name: 'Great',
            slug: 'great',
            description: 'My great tag',
            parent: null
        });
        url.should.equal('/tag/great/');
    });

    it('should return secure absolute url for a tag', function () {
        var url = getUrl({
            name: 'Great',
            slug: 'great',
            description: 'My great tag',
            parent: null,
            secure: true
        }, true);
        url.should.equal('https://127.0.0.1:2369/tag/great/');
    });

    it('should return url for a author', function () {
        var url = getUrl({
            name: 'Author Name',
            bio: 'I am fun bio!',
            website: 'http://myoksite.com',
            status: 'active',
            location: 'London',
            slug: 'author-name'
        });
        url.should.equal('/author/author-name/');
    });

    it('should return secure absolute url for a author', function () {
        var url = getUrl({
            name: 'Author Name',
            bio: 'I am fun bio!',
            website: 'http://myoksite.com',
            status: 'active',
            location: 'London',
            slug: 'author-name',
            secure: true
        }, true);
        url.should.equal('https://127.0.0.1:2369/author/author-name/');
    });

    it('should return url for a nav', function () {
        var url = getUrl({
            label: 'About Me',
            url: '/about-me/',
            slug: 'about-me',
            current: true
        });
        url.should.equal('/about-me/');
    });

    it('should return absolute url for a nav', function () {
        var url = getUrl({
            label: 'About Me',
            url: '/about-me/',
            slug: 'about-me',
            current: true
        }, true);
        url.should.equal('http://127.0.0.1:2369/about-me/');
    });

    it('should return url for a context object with relative url', function () {
        var url = getUrl({
            relativeUrl: '/my/relitive/url/'
        });
        url.should.equal('/my/relitive/url/');
    });
});
