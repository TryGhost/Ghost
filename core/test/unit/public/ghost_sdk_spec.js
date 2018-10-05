const should = require('should');
const ghostSdk = require('../../../server/public/ghost-sdk');

describe('Ghost SDK Helper', function () {
    it('sets url empty if it is not set on init', function () {
        ghostSdk.init({
            clientId: '',
            clientSecret: ''
        });

        ghostSdk.url.api().should.equal('');
    });

    it('renders basic url correctly when no arguments are presented', function () {
        ghostSdk.init({
            clientId: '',
            clientSecret: '',
            url: '/api-url/'
        });

        ghostSdk.url.api().should.equal('/api-url/');
    });

    it('strips arguments of forward and trailing slashes correctly', function () {
        ghostSdk.init({
            clientId: '',
            clientSecret: '',
            url: '/api-url/'
        });

        ghostSdk.url.api('a/', '/b', '/c/').should.equal('/api-url/a/b/c/');
    });

    it('appends client_id & client_secret to query string automatically', function () {
        ghostSdk.init({
            clientId: 'ghost-frontend',
            clientSecret: 'notasecret',
            url: '/api-url/'
        });

        ghostSdk.url.api().should.equal('/api-url/?client_id=ghost-frontend&client_secret=notasecret');
    });

    it('generates query parameters correctly', function () {
        ghostSdk.init({
            clientId: 'ghost-frontend',
            clientSecret: 'notasecret',
            url: '/api-url/'
        });

        var rendered = ghostSdk.url.api({a: 'string', b: 5, c: 'en coded'});
        rendered.should.equal('/api-url/?a=string&b=5&c=en%20coded&client_id=ghost-frontend&client_secret=notasecret');
    });

    it('generates complex query correctly', function () {
        ghostSdk.init({
            clientId: 'ghost-frontend',
            clientSecret: 'notasecret',
            url: '/api-url/'
        });

        var rendered = ghostSdk.url.api('posts/', '/tags/', '/count', {include: 'tags,tests', page: 2});

        rendered.should.equal('/api-url/posts/tags/count/?include=tags%2Ctests&page=2&client_id=ghost-frontend&client_secret=notasecret');
    });

    it('handles null/undefined queryOptions correctly', function () {
        ghostSdk.init({
            clientId: 'ghost-frontend',
            clientSecret: 'notasecret',
            url: 'test'
        });

        var test = {
                a: null
            },
            rendered = ghostSdk.url.api(test.a), // null value
            rendered2 = ghostSdk.url.api(test.b); // undefined value

        rendered.should.match(/test/);
        rendered.should.match(/client_id=ghost-frontend/);
        rendered.should.match(/client_secret=notasecret/);
        rendered2.should.match(/test/);
        rendered2.should.match(/client_id=ghost-frontend/);
        rendered2.should.match(/client_secret=notasecret/);
    });

    it('should be idempotent', function () {
        ghostSdk.init({
            clientId: 'ghost-frontend',
            clientSecret: 'notasecret',
            url: '/api-url/'
        });

        var rendered = ghostSdk.url.api('posts', {limit: 3}),
            rendered2 = ghostSdk.url.api('posts', {limit: 3});

        rendered.should.equal(rendered2);
    });
});
