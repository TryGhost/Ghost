/* globals describe, beforeEach, afterEach, it */
var should     = require('should'),
    ghostUrl   = require('../../shared/ghost-url'),

    configUtils    = require('../utils/configUtils');

should.equal(true, true);

describe('Ghost Ajax Helper', function () {
    beforeEach(function () {
        configUtils.set({
            url: 'http://testblog.com/'
        });
    });

    afterEach(function () {
        configUtils.restore();
    });

    it('sets url empty if it is not set on init', function () {
        ghostUrl.init({
            clientId: '',
            clientSecret: ''
        });

        ghostUrl.url.api().should.equal('');
    });

    it('renders basic url correctly when no arguments are presented', function () {
        ghostUrl.init({
            clientId: '',
            clientSecret: '',
            url: configUtils.config.apiUrl()
        });

        ghostUrl.url.api().should.equal('//testblog.com/ghost/api/v0.1/');
    });

    it('strips arguments of forward and trailing slashes correctly', function () {
        ghostUrl.init({
            clientId: '',
            clientSecret: '',
            url: configUtils.config.apiUrl()
        });

        ghostUrl.url.api('a/', '/b', '/c/').should.equal('//testblog.com/ghost/api/v0.1/a/b/c/');
    });

    it('appends client_id & client_secret to query string automatically', function () {
        ghostUrl.init({
            clientId: 'ghost-frontend',
            clientSecret: 'notasecret',
            url: configUtils.config.apiUrl()
        });

        ghostUrl.url.api().should.equal('//testblog.com/ghost/api/v0.1/?client_id=ghost-frontend&client_secret=notasecret');
    });

    it('generates query parameters correctly', function () {
        ghostUrl.init({
            clientId: 'ghost-frontend',
            clientSecret: 'notasecret',
            url: configUtils.config.apiUrl()
        });

        var rendered = ghostUrl.url.api({a: 'string', b: 5, c: 'en coded'});

        rendered.should.match(/\/\/testblog\.com\/ghost\/api\/v0\.1\/\?/);
        rendered.should.match(/client_id=ghost-frontend/);
        rendered.should.match(/client_secret=notasecret/);
        rendered.should.match(/a/);
        rendered.should.match(/b=5/);
        rendered.should.match(/c=en\%20coded/);
    });

    it('generates complex query correctly', function () {
        ghostUrl.init({
            clientId: 'ghost-frontend',
            clientSecret: 'notasecret',
            url: configUtils.config.apiUrl()
        });

        var rendered = ghostUrl.url.api('posts/', '/tags/', '/count', {include: 'tags,tests', page: 2});

        rendered.should.match(/\/\/testblog\.com\/ghost\/api\/v0\.1\/posts\/tags\/count\/\?/);
        rendered.should.match(/client_id=ghost-frontend/);
        rendered.should.match(/client_secret=notasecret/);
        rendered.should.match(/include=tags%2Ctests/);
        rendered.should.match(/page=2/);
    });

    it('works with an https config', function () {
        configUtils.set({
            url: 'https://testblog.com/'
        });
        ghostUrl.init({
            clientId: 'ghost-frontend',
            clientSecret: 'notasecret',
            url: configUtils.config.apiUrl()
        });

        var rendered = ghostUrl.url.api('posts/', '/tags/', '/count', {include: 'tags,tests', page: 2});

        rendered.should.match(/https:\/\/testblog\.com\/ghost\/api\/v0\.1\/posts\/tags\/count\/\?/);
        rendered.should.match(/client_id=ghost-frontend/);
        rendered.should.match(/client_secret=notasecret/);
        rendered.should.match(/include=tags%2Ctests/);
        rendered.should.match(/page=2/);
    });

    it('works with an https config and subdirectory', function () {
        configUtils.set({
            url: 'https://testblog.com/blog/'
        });
        ghostUrl.init({
            clientId: 'ghost-frontend',
            clientSecret: 'notasecret',
            url: configUtils.config.apiUrl()
        });

        var rendered = ghostUrl.url.api('posts/', '/tags/', '/count', {include: 'tags,tests', page: 2});

        rendered.should.match(/https:\/\/testblog\.com\/blog\/ghost\/api\/v0\.1\/posts\/tags\/count\/\?/);
        rendered.should.match(/client_id=ghost-frontend/);
        rendered.should.match(/client_secret=notasecret/);
        rendered.should.match(/include=tags%2Ctests/);
        rendered.should.match(/page=2/);
    });

    it('should be idempotent', function () {
        configUtils.set({
            url: 'https://testblog.com/blog/'
        });
        ghostUrl.init({
            clientId: 'ghost-frontend',
            clientSecret: 'notasecret',
            url: configUtils.config.apiUrl()
        });

        var rendered = ghostUrl.url.api('posts', {limit: 3}),
            rendered2 = ghostUrl.url.api('posts', {limit: 3});

        rendered.should.equal(rendered2);
    });
});
