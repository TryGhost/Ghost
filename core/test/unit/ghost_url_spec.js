/* globals describe,  afterEach, it */
/*jshint expr:true*/
var url    = require('../../shared/ghost-url');

describe('Ghost Ajax Helper', function () {
    afterEach(function () {
        url.config = {};
    });

    it('renders basic url correctly when no arguments are presented & useOrigin is set to false', function () {
        url.config = {
            url: 'http://testblog.com/',
            useOrigin: false,
            clientId: '',
            clientSecret: ''
        };

        url.api().should.equal('http://testblog.com/');
    });

    it('renders basic url correctly when no arguments are presented & useOrigin is set to true', function () {
        url.config = {
            url: '/url/',
            useOrigin: true,
            origin: 'http://originblog.com',
            clientId: '',
            clientSecret: ''
        };

        url.api().should.equal('http://originblog.com/url/');
    });

    it('strips arguments of forward and trailing slashes correctly', function () {
        url.config = {
            url: 'http://testblog.com/',
            useOrigin: false,
            clientId: '',
            clientSecret: ''
        };

        url.api('a/', '/b', '/c/').should.equal('http://testblog.com/a/b/c/');
    });

    it('appends client_id & client_secret to query string automatically', function () {
        url.config = {
            url: 'http://testblog.com/',
            useOrigin: false,
            clientId: 'ghost-frontend',
            clientSecret: 'notasecret'
        };

        url.api().should.equal('http://testblog.com/?client_id=ghost-frontend&client_secret=notasecret');
    });

    it('generates query parameters correctly', function () {
        url.config = {
            url: 'http://testblog.com/',
            useOrigin: false,
            clientId: 'ghost-frontend',
            clientSecret: 'notasecret'
        };

        var rendered = url.api({a: 'string', b: 5, c: 'en coded'});

        rendered.should.match(/http:\/\/testblog\.com\/\?/);
        rendered.should.match(/client_id=ghost-frontend/);
        rendered.should.match(/client_secret=notasecret/);
        rendered.should.match(/a/);
        rendered.should.match(/b=5/);
        rendered.should.match(/c=en\%20coded/);
    });

    it('generates complex query correctly', function () {
        url.config = {
            url: '/blog/ghost/api/v0.1/',
            useOrigin: true,
            origin: 'https://testblog.com',
            clientId: 'ghost-frontend',
            clientSecret: 'notasecret'
        };

        var rendered = url.api('posts/', '/tags/', '/count', {include: 'tags,tests', page: 2});

        rendered.should.match(/https:\/\/testblog\.com\/blog\/ghost\/api\/v0\.1\/posts\/tags\/count\/\?/);
        rendered.should.match(/client_id=ghost-frontend/);
        rendered.should.match(/client_secret=notasecret/);
        rendered.should.match(/include=tags%2Ctests/);
        rendered.should.match(/page=2/);
    });
});
