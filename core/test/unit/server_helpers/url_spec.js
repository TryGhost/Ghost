/*globals describe, before, beforeEach, afterEach, after, it*/
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

describe('{{url}} helper', function () {
    var sandbox;

    before(function () {
        sandbox = sinon.sandbox.create();
        utils.overrideConfig({url: 'http://testurl.com/'});
        utils.loadHelpers();
    });

    beforeEach(function () {
        sandbox.stub(api.settings, 'read', function () {
            return Promise.resolve({settings: [{value: '/:slug/'}]});
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    after(function () {
        utils.restoreConfig();
    });

    it('has loaded url helper', function () {
        should.exist(handlebars.helpers.url);
    });

    it('should return the slug with a prefix slash if the context is a post', function (done) {
        helpers.url.call({
            html: 'content',
            markdown: 'ff',
            title: 'title',
            slug: 'slug',
            created_at: new Date(0)
        }).then(function (rendered) {
            should.exist(rendered);
            rendered.should.equal('/slug/');
            done();
        }).catch(done);
    });

    it('should output an absolute URL if the option is present', function (done) {
        helpers.url.call(
            {html: 'content', markdown: 'ff', title: 'title', slug: 'slug', created_at: new Date(0)},
            {hash: {absolute: 'true'}}
        ).then(function (rendered) {
            should.exist(rendered);
            rendered.should.equal('http://testurl.com/slug/');
            done();
        }).catch(done);
    });

    it('should return the slug with a prefixed /tag/ if the context is a tag', function (done) {
        helpers.url.call({
            name: 'the tag',
            slug: 'the-tag',
            description: null,
            parent: null
        }).then(function (rendered) {
            should.exist(rendered);
            rendered.should.equal('/tag/the-tag/');
            done();
        }).catch(done);
    });

    it('should return / if not a post or tag', function (done) {
        helpers.url.call({markdown: 'ff', title: 'title', slug: 'slug'}).then(function (rendered) {
            rendered.should.equal('/');
        }).then(function () {
            return helpers.url.call({html: 'content', title: 'title', slug: 'slug'}).then(function (rendered) {
                rendered.should.equal('/');
            });
        }).then(function () {
            return helpers.url.call({html: 'content', markdown: 'ff', slug: 'slug'}).then(function (rendered) {
                rendered.should.equal('/');
            });
        }).then(function () {
            helpers.url.call({html: 'content', markdown: 'ff', title: 'title'}).then(function (rendered) {
                rendered.should.equal('/');

                done();
            });
        }).catch(done);
    });
});
