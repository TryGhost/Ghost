var should = require('should'),
    hbs = require('../../../server/themes/engine'),

    configUtils = require('../../utils/configUtils'),
    path = require('path'),

// Stuff we are testing
    helpers = require('../../../server/helpers');

describe('{{navigation}} helper', function () {
    var runHelper = function (data) {
            return function () {
                helpers.navigation(data);
            };
        },
        optionsData;

    before(function (done) {
        hbs.express3({
            partialsDir: [configUtils.config.get('paths').helperTemplates]
        });

        hbs.cachePartials(function () {
            done();
        });

        // The navigation partial expects this helper
        // @TODO: change to register with Ghost's own registration tools
        hbs.registerHelper('url', helpers.url);
    });

    beforeEach(function () {
        optionsData = {
            data: {
                blog: {
                    navigation: []
                },
                root: {
                    relativeUrl: ''
                }
            }
        };
    });

    it('should throw errors on invalid data', function () {
        // Test 1: navigation = string
        optionsData.data.blog.navigation = 'not an object';
        runHelper(optionsData).should.throwError('navigation data is not an object or is a function');

        // Test 2: navigation = function
        optionsData.data.blog.navigation = function () {
        };
        runHelper(optionsData).should.throwError('navigation data is not an object or is a function');

        // Test 3: invalid label
        optionsData.data.blog.navigation = [{label: 1, url: 'bar'}];
        runHelper(optionsData).should.throwError('Invalid value, Url and Label must be strings');

        // Test 4: invalid url
        optionsData.data.blog.navigation = [{label: 'foo', url: 1}];
        runHelper(optionsData).should.throwError('Invalid value, Url and Label must be strings');
    });

    it('can render empty nav', function () {
        var rendered = helpers.navigation(optionsData);

        should.exist(rendered);
        rendered.string.should.be.equal('');
    });

    it('can handle relativeUrl not being set (e.g. for images/assets)', function () {
        var singleItem = {label: 'Foo', url: '/foo'},
            rendered;
        delete optionsData.data.root.relativeUrl;

        optionsData.data.blog.navigation = [singleItem];
        rendered = helpers.navigation(optionsData);
        rendered.string.should.containEql('li');
        rendered.string.should.containEql('nav-foo');
        rendered.string.should.containEql('/foo');
    });

    it('can render one item', function () {
        var singleItem = {label: 'Foo', url: '/foo'},
            testUrl = 'href="' + configUtils.config.get('url') + '/foo"',
            rendered;

        optionsData.data.blog.navigation = [singleItem];
        rendered = helpers.navigation(optionsData);

        should.exist(rendered);
        rendered.string.should.containEql('li');
        rendered.string.should.containEql('nav-foo');
        rendered.string.should.containEql(testUrl);
    });

    it('can render multiple items', function () {
        var firstItem = {label: 'Foo', url: '/foo'},
            secondItem = {label: 'Bar Baz Qux', url: '/qux'},
            testUrl = 'href="' + configUtils.config.get('url') + '/foo"',
            testUrl2 = 'href="' + configUtils.config.get('url') + '/qux"',
            rendered;

        optionsData.data.blog.navigation = [firstItem, secondItem];
        rendered = helpers.navigation(optionsData);

        should.exist(rendered);
        rendered.string.should.containEql('nav-foo');
        rendered.string.should.containEql('nav-bar-baz-qux');
        rendered.string.should.containEql(testUrl);
        rendered.string.should.containEql(testUrl2);
    });

    it('can annotate the current url', function () {
        var firstItem = {label: 'Foo', url: '/foo'},
            secondItem = {label: 'Bar', url: '/qux'},
            rendered;

        optionsData.data.blog.navigation = [firstItem, secondItem];
        optionsData.data.root.relativeUrl = '/foo';
        rendered = helpers.navigation(optionsData);

        should.exist(rendered);
        rendered.string.should.containEql('nav-foo');
        rendered.string.should.containEql('nav-current');
        rendered.string.should.containEql('nav-foo nav-current');
        rendered.string.should.containEql('nav-bar"');
    });

    it('can annotate current url with trailing slash', function () {
        var firstItem = {label: 'Foo', url: '/foo'},
            secondItem = {label: 'Bar', url: '/qux'},
            rendered;

        optionsData.data.blog.navigation = [firstItem, secondItem];
        optionsData.data.root.relativeUrl = '/foo/';
        rendered = helpers.navigation(optionsData);

        should.exist(rendered);
        rendered.string.should.containEql('nav-foo');
        rendered.string.should.containEql('nav-current');
        rendered.string.should.containEql('nav-foo nav-current');
        rendered.string.should.containEql('nav-bar"');
    });

    it('doesn\'t html-escape URLs', function () {
        var firstItem = {label: 'Foo', url: '/?foo=bar&baz=qux'},
            rendered;

        optionsData.data.blog.navigation = [firstItem];
        rendered = helpers.navigation(optionsData);

        should.exist(rendered);
        rendered.string.should.not.containEql('&#x3D;');
        rendered.string.should.not.containEql('&amp;');
        rendered.string.should.containEql('/?foo=bar&baz=qux');
    });

    it('encodes URLs', function () {
        var firstItem = {label: 'Foo', url: '/?foo=space bar&<script>alert("gotcha")</script>'},
            rendered;

        optionsData.data.blog.navigation = [firstItem];
        rendered = helpers.navigation(optionsData);

        should.exist(rendered);
        rendered.string.should.containEql('foo=space%20bar');
        rendered.string.should.not.containEql('<script>alert("gotcha")</script>');
        rendered.string.should.containEql('%3Cscript%3Ealert(%22gotcha%22)%3C/script%3E');
    });

    it('doesn\'t double-encode URLs', function () {
        var firstItem = {label: 'Foo', url: '/?foo=space%20bar'},
            rendered;

        optionsData.data.blog.navigation = [firstItem];
        rendered = helpers.navigation(optionsData);

        should.exist(rendered);
        rendered.string.should.not.containEql('foo=space%2520bar');
    });
});

describe('{{navigation}} helper with custom template', function () {
    var optionsData;

    before(function (done) {
        hbs.express3({
            partialsDir: [path.resolve(configUtils.config.get('paths').corePath, 'test/unit/helpers/test_tpl')]
        });

        hbs.cachePartials(function () {
            done();
        });
    });

    beforeEach(function () {
        optionsData = {
            data: {
                blog: {
                    navigation: [],
                    title: 'Chaos is a ladder.'
                },
                root: {
                    relativeUrl: ''
                }
            }
        };
    });

    it('can render one item and @blog title', function () {
        var singleItem = {label: 'Foo', url: '/foo'},
            testUrl = 'href="' + configUtils.config.get('url') + '/foo"',
            rendered;

        optionsData.data.blog.navigation = [singleItem];
        rendered = helpers.navigation(optionsData);

        should.exist(rendered);
        rendered.string.should.containEql('Chaos is a ladder');
        rendered.string.should.containEql(testUrl);
        rendered.string.should.containEql('Foo');
    });
});
