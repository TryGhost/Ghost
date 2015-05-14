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
        helpers.meta_title.call(
            {},
            {data: {root: {context: ['home']}}}
        ).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Ghost');

            done();
        }).catch(done);
    });

    it('returns correct title for paginated page', function (done) {
        helpers.meta_title.call(
            {},
            {data: {root: {context: [], pagination: {total: 2, page: 2}}}}
        ).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Ghost - Page 2');

            done();
        }).catch(done);
    });

    it('returns correct title for a post', function (done) {
        helpers.meta_title.call(
            {post: {title: 'Post Title'}},
            {data: {root: {context: ['post']}}}
        ).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Post Title');

            done();
        }).catch(done);
    });

    it('returns correct title for a post with meta_title set', function (done) {
        helpers.meta_title.call(
            {post: {title: 'Post Title', meta_title: 'Awesome Post'}},
            {data: {root: {context: ['post']}}}
        ).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Awesome Post');

            done();
        }).catch(done);
    });

    it('returns correct title for a page with meta_title set', function (done) {
        helpers.meta_title.call(
            {post: {title: 'About Page', meta_title: 'All about my awesomeness', page: true}},
            {data: {root: {context: ['page']}}}
        ).then(function (rendered) {
                should.exist(rendered);
                String(rendered).should.equal('All about my awesomeness');

                done();
            }).catch(done);
    });

    it('returns correct title for a tag page', function (done) {
        var tag = {relativeUrl: '/tag/rasper-red', tag: {name: 'Rasper Red'}};
        helpers.meta_title.call(
            tag,
            {data: {root: {context: ['tag']}}}
        ).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Rasper Red - Ghost');

            done();
        }).catch(done);
    });

    it('returns correct title for a paginated tag page', function (done) {
        helpers.meta_title.call(
            {tag: {name: 'Rasper Red'}},
            {data: {root: {context: ['tag', 'paged'], pagination: {total: 2, page: 2}}}}
        ).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Rasper Red - Page 2 - Ghost');

            done();
        }).catch(done);
    });

    it('uses tag meta_title to override default response on tag page', function (done) {
        helpers.meta_title.call(
            {tag: {name: 'Rasper Red', meta_title: 'Sasper Red'}},
            {data: {root: {context: ['tag']}}}
        ).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Sasper Red');

            done();
        }).catch(done);
    });

    it('uses tag meta_title to override default response on paginated tag page', function (done) {
        helpers.meta_title.call(
            {tag: {name: 'Rasper Red', meta_title: 'Sasper Red'}},
            {data: {root: {context: ['tag']}}}
        ).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Sasper Red');

            done();
        }).catch(done);
    });

    it('returns correct title for an author page', function (done) {
        helpers.meta_title.call(
            {author: {name: 'Donald Duck'}},
            {data: {root: {context: ['author']}}}
        ).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Donald Duck - Ghost');

            done();
        }).catch(done);
    });

    it('returns correct title for a paginated author page', function (done) {
        helpers.meta_title.call(
            {author: {name: 'Donald Duck'}},
            {data: {root: {context: ['author', 'paged'], pagination: {total: 2, page: 2}}}}
        ).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Donald Duck - Page 2 - Ghost');

            done();
        }).catch(done);
    });

    it('returns correctly escaped title of a post', function (done) {
        helpers.meta_title.call(
            {post: {title: 'Post Title "</>'}},
            {data: {root: {context: ['post']}}}
        ).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Post Title "</>');

            done();
        }).catch(done);
    });

    it('returns meta_title on post when used within {{#foreach posts}}', function (done) {
        helpers.meta_title.call(
            {meta_title: 'Awesome Post'},
            {data: {root: {context: ['home']}}}
        ).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Awesome Post');

            done();
        }).catch(done);
    });
});
