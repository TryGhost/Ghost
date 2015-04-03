/*globals describe, before, beforeEach, it*/
/*jshint expr:true*/
var should         = require('should'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),
    path           = require('path'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers');

describe('{{navigation}} helper', function () {
    var runHelper = function (data) {
            return function () {
                helpers.navigation(data);
            };
        },
        optionsData;

    before(function (done) {
        utils.loadHelpers();
        hbs.express3({
            partialsDir: [utils.config.paths.helperTemplates]
        });

        hbs.cachePartials(function () {
            done();
        });
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

    it('has loaded navigation helper', function () {
        should.exist(handlebars.helpers.navigation);
    });

    it('should throw errors on invalid data', function () {
        // Test 1: navigation = string
        optionsData.data.blog.navigation = 'not an object';
        runHelper(optionsData).should.throwError('navigation data is not an object or is a function');

        // Test 2: navigation = function
        optionsData.data.blog.navigation = function () {};
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

    it('can render one item', function () {
        var singleItem = {label: 'Foo', url: '/foo'},
            testUrl = 'href="' + utils.config.url + '/foo"',
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
            testUrl = 'href="' + utils.config.url + '/foo"',
            testUrl2 = 'href="' + utils.config.url + '/qux"',
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
});

describe('{{navigation}} helper with custom template', function () {
    var optionsData;

    before(function (done) {
        utils.loadHelpers();
        hbs.express3({
            partialsDir: [path.resolve(utils.config.paths.corePath, 'test/unit/server_helpers/test_tpl')]
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
            testUrl = 'href="' + utils.config.url + '/foo"',
            rendered;

        optionsData.data.blog.navigation = [singleItem];
        rendered = helpers.navigation(optionsData);

        should.exist(rendered);
        rendered.string.should.containEql('Chaos is a ladder');
        rendered.string.should.containEql(testUrl);
        rendered.string.should.containEql('Foo');
    });
});
