/*globals describe, before, after, it*/
/*jshint expr:true*/
var should         = require('should'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers');

describe('{{meta_description}} helper', function () {
    before(function () {
        utils.loadHelpers();
        utils.overrideConfig({
            theme: {
                description: 'Just a blogging platform.'
            }
        });
    });

    after(function () {
        utils.restoreConfig();
    });

    it('has loaded meta_description helper', function () {
        should.exist(handlebars.helpers.meta_description);
    });

    it('returns correct blog description', function (done) {
        helpers.meta_description.call(
            {},
            {data: {root: {context: ['home', 'index']}}}
        ).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Just a blogging platform.');

            done();
        }).catch(done);
    });

    it('returns empty description on paginated page', function (done) {
        helpers.meta_description.call(
            {},
            {data: {root: {context: ['index', 'paged']}}}
        ).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('');

            done();
        }).catch(done);
    });

    it('returns empty description for a tag page', function (done) {
        helpers.meta_description.call(
            {tag: {name: 'Rasper Red'}},
            {data: {root: {context: ['tag']}}}
        ).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('');

            done();
        }).catch(done);
    });

    it('returns empty description for a paginated tag page', function (done) {
        helpers.meta_description.call(
            {tag: {name: 'Rasper Red'}},
            {data: {root: {context: ['tag', 'paged']}}}
        ).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('');

            done();
        }).catch(done);
    });

    it('returns tag meta_description if present for a tag page', function (done) {
        helpers.meta_description.call(
            {tag: {name: 'Rasper Red', meta_description: 'Rasper is the Cool Red Casper'}},
            {data: {root: {context: ['tag']}}}
        ).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Rasper is the Cool Red Casper');

            done();
        }).catch(done);
    });

    it('returns empty description on paginated tag page that has meta data', function (done) {
        helpers.meta_description.call(
            {tag: {name: 'Rasper Red', meta_description: 'Rasper is the Cool Red Casper'}},
            {data: {root: {context: ['tag', 'paged']}}}
        ).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('');

            done();
        }).catch(done);
    });

    it('returns correct description for an author page', function (done) {
        helpers.meta_description.call(
            {author: {bio: 'I am a Duck.'}},
            {data: {root: {context: ['author']}}}
        ).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('I am a Duck.');

            done();
        }).catch(done);
    });

    it('returns empty description for a paginated author page', function (done) {
        helpers.meta_description.call(
            {author: {name: 'Donald Duck'}},
            {data: {root: {context: ['author', 'paged']}}}
        ).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('');

            done();
        }).catch(done);
    });

    it('returns empty description when meta_description is not set', function (done) {
        helpers.meta_description.call(
            {post: {title: 'Post Title', html: 'Very nice post indeed.'}},
            {data: {root: {context: ['post']}}}
        ).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('');

            done();
        }).catch(done);
    });

    it('returns meta_description on post with meta_description set', function (done) {
        helpers.meta_description.call(
            {post: {title: 'Post Title', meta_description: 'Nice post about stuff.'}},
            {data: {root: {context: ['post']}}}
        ).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Nice post about stuff.');

            done();
        }).catch(done);
    });

    it('returns meta_description on post when used within {{#foreach posts}}', function (done) {
        helpers.meta_description.call(
            {meta_description: 'Nice post about stuff.'},
            {data: {root: {context: ['home']}}}
        ).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Nice post about stuff.');

            done();
        }).catch(done);
    });
});
