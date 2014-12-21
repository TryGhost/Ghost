/*globals describe, before, after, it*/
/*jshint expr:true*/
var should         = require('should'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers');

describe('{{meta_title}} helper', function () {
    before(function () {
        utils.loadHelpers();
        utils.overrideConfig({
            theme: {
                title: 'Ghost'
            }
        });
    });

    after(function () {
        utils.restoreConfig();
    });

    it('has loaded meta_title helper', function () {
        should.exist(handlebars.helpers.meta_title);
    });

    it('returns correct title for homepage', function (done) {
        helpers.meta_title.call({relativeUrl: '/'}).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Ghost');

            done();
        }).catch(done);
    });

    it('returns correct title for paginated page', function (done) {
        helpers.meta_title.call({relativeUrl: '/page/2/'}).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Ghost - Page 2');

            done();
        }).catch(done);
    });

    it('returns correct title for a post', function (done) {
        var post = {relativeUrl: '/nice-post', post: {title: 'Post Title'}};
        helpers.meta_title.call(post).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Post Title');

            done();
        }).catch(done);
    });

    it('returns correct title for a post with meta_title set', function (done) {
        var post = {relativeUrl: '/nice-post', post: {title: 'Post Title', meta_title: 'Awesome Post'}};
        helpers.meta_title.call(post).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Awesome Post');

            done();
        }).catch(done);
    });

    it('returns correct title for a tag page', function (done) {
        var tag = {relativeUrl: '/tag/rasper-red', tag: {name: 'Rasper Red'}};
        helpers.meta_title.call(tag).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Rasper Red - Ghost');

            done();
        }).catch(done);
    });

    it('returns correct title for a paginated tag page', function (done) {
        var tag = {relativeUrl: '/tag/rasper-red/page/2/', tag: {name: 'Rasper Red'}};
        helpers.meta_title.call(tag).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Rasper Red - Page 2 - Ghost');

            done();
        }).catch(done);
    });

    it('uses tag meta_title to override default response on tag page', function (done) {
        var tag = {relativeUrl: '/tag/rasper-red', tag: {name: 'Rasper Red', meta_title: 'Sasper Red'}};
        helpers.meta_title.call(tag).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Sasper Red');

            done();
        }).catch(done);
    });

    it('uses tag meta_title to override default response on paginated tag page', function (done) {
        var tag = {relativeUrl: '/tag/rasper-red', tag: {name: 'Rasper Red', meta_title: 'Sasper Red'}};
        helpers.meta_title.call(tag).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Sasper Red');

            done();
        }).catch(done);
    });

    it('returns correct title for an author page', function (done) {
        var author = {relativeUrl: '/author/donald', author: {name: 'Donald Duck'}};
        helpers.meta_title.call(author).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Donald Duck - Ghost');

            done();
        }).catch(done);
    });

    it('returns correct title for a paginated author page', function (done) {
        var author = {relativeUrl: '/author/donald/page/2/', author: {name: 'Donald Duck'}};
        helpers.meta_title.call(author).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Donald Duck - Page 2 - Ghost');

            done();
        }).catch(done);
    });

    it('returns correctly escaped title of a post', function (done) {
        var post = {relativeUrl: '/nice-escaped-post', post: {title: 'Post Title "</>'}};
        helpers.meta_title.call(post).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Post Title "</>');

            done();
        }).catch(done);
    });
});
