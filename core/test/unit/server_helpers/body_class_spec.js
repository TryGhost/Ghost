/*globals describe, before, after, it*/
/*jshint expr:true*/
var should         = require('should'),
    sinon          = require('sinon'),
    Promise        = require('bluebird'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers'),
    api            = require('../../../server/api');

describe('{{body_class}} helper', function () {
    var sandbox;

    before(function () {
        sandbox = sinon.sandbox.create();
        sandbox.stub(api.settings, 'read', function () {
            return Promise.resolve({
                settings: [{value: 'casper'}]
            });
        });
        utils.loadHelpers();
        utils.overrideConfig({paths: {
            availableThemes: {
                casper: {
                    assets: null,
                    'default.hbs': '/content/themes/casper/default.hbs',
                    'index.hbs': '/content/themes/casper/index.hbs',
                    'page.hbs': '/content/themes/casper/page.hbs',
                    'page-about.hbs': '/content/themes/casper/page-about.hbs',
                    'post.hbs': '/content/themes/casper/post.hbs'
                }
            }
        }});
    });

    after(function () {
        utils.restoreConfig();
        sandbox.restore();
    });

    it('has loaded body_class helper', function () {
        should.exist(handlebars.helpers.body_class);
    });

    it('can render class string', function (done) {
        helpers.body_class.call({}).then(function (rendered) {
            should.exist(rendered);

            rendered.string.should.equal('home-template');

            done();
        }).catch(done);
    });

    it('can render class string for context', function (done) {
        Promise.all([
            helpers.body_class.call({relativeUrl: '/'}),
            helpers.body_class.call({relativeUrl: '/a-post-title', post: {}}),
            helpers.body_class.call({relativeUrl: '/page/4'}),
            helpers.body_class.call({relativeUrl: '/tag/foo', tag: {slug: 'foo'}}),
            helpers.body_class.call({relativeUrl: '/tag/foo/page/2', tag: {slug: 'foo'}}),
            helpers.body_class.call({relativeUrl: '/author/bar', author: {slug: 'bar'}}),
            helpers.body_class.call({relativeUrl: '/author/bar/page/2', author: {slug: 'bar'}})
        ]).then(function (rendered) {
            rendered.length.should.equal(7);

            should.exist(rendered[0]);
            should.exist(rendered[1]);
            should.exist(rendered[2]);
            should.exist(rendered[3]);
            should.exist(rendered[4]);
            should.exist(rendered[5]);
            should.exist(rendered[6]);

            rendered[0].string.should.equal('home-template');
            rendered[1].string.should.equal('post-template');
            rendered[2].string.should.equal('paged archive-template');
            rendered[3].string.should.equal('tag-template tag-foo');
            rendered[4].string.should.equal('tag-template tag-foo paged archive-template');
            rendered[5].string.should.equal('author-template author-bar');
            rendered[6].string.should.equal('author-template author-bar paged archive-template');

            done();
        }).catch(done);
    });

    it('can render class for static page', function (done) {
        helpers.body_class.call({
            relativeUrl: '/',
            post: {
                page: true
            }
        }).then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.equal('home-template page-template page');

            done();
        }).catch(done);
    });

    it('can render class for static page with custom template', function (done) {
        helpers.body_class.call({
            relativeUrl: '/about',
            post: {
                page: true,
                slug: 'about'

            }
        }).then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.equal('post-template page-template page page-about page-template-about');

            done();
        }).catch(done);
    });
});
