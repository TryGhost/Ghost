var should = require('should'),
    getAmpUrl = require('../../../../server/data/meta/amp_url'),
    markdownToMobiledoc = require('../../../utils/fixtures/data-generator').markdownToMobiledoc;

describe('getAmpUrl', function () {
    it('should return amp url for post only', function () {
        var ampUrl = getAmpUrl({
            url: '/this-is-a-test-post/',
            html: '<h1>Test 123</h1>',
            markdown: markdownToMobiledoc('# Test 123'),
            title: 'This is a test post',
            slug: 'this-is-a-test-post',
            secure: true,
            context: ['post']
        });

        ampUrl.should.not.equal('/this-is-a-test-post/');
        ampUrl.should.match(/\/this-is-a-test-post\/amp\/$/);
        ampUrl.should.not.match(/^https:/);
    });

    it('should not return amp url for tag', function () {
        var ampUrl = getAmpUrl({
            parent: null,
            name: 'testing',
            slug: 'testing',
            description: 'We need testing',
            secure: true,
            context: ['tag']
        });

        should.not.exist(ampUrl);
    });

    it('should not return amp url for author', function () {
        var ampUrl = getAmpUrl({
            name: 'Test User',
            bio: 'This is all about testing',
            website: 'http://my-testing-site.com',
            status: 'testing',
            location: 'Wounderland',
            slug: 'test-user',
            secure: true,
            context: ['author']
        });
        should.not.exist(ampUrl);
    });

    it('should not return amp url for amp post', function () {
        var ampUrl = getAmpUrl({
            name: 'Test User',
            bio: 'This is all about testing',
            website: 'http://my-testing-site.com',
            status: 'testing',
            location: 'Wounderland',
            slug: 'test-user',
            secure: true,
            context: ['amp', 'post']
        });
        should.not.exist(ampUrl);
    });

    it('should not return amp url for amp page', function () {
        var ampUrl = getAmpUrl({
            name: 'Test User',
            bio: 'This is all about testing',
            website: 'http://my-testing-site.com',
            status: 'testing',
            location: 'Wounderland',
            slug: 'test-user',
            secure: true,
            context: ['amp', 'page']
        });
        should.not.exist(ampUrl);
    });

    it('should return home if empty secure data', function () {
        var ampUrl = getAmpUrl({
            secure: true
        });
        should.not.exist(ampUrl);
    });
});
