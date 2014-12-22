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
        helpers.meta_description.call({relativeUrl: '/'}).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Just a blogging platform.');

            done();
        }).catch(done);
    });

    it('returns empty description on paginated page', function (done) {
        helpers.meta_description.call({relativeUrl: '/page/2/'}).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('');

            done();
        }).catch(done);
    });

    it('returns empty description for a tag page', function (done) {
        var tag = {relativeUrl: '/tag/rasper-red', tag: {name: 'Rasper Red'}};
        helpers.meta_description.call(tag).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('');

            done();
        }).catch(done);
    });

    it('returns empty description for a paginated tag page', function (done) {
        var tag = {relativeUrl: '/tag/rasper-red/page/2/', tag: {name: 'Rasper Red'}};
        helpers.meta_description.call(tag).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('');

            done();
        }).catch(done);
    });

    it('returns tag meta_description if present for a tag page', function (done) {
        var tag = {relativeUrl: '/tag/rasper-red', tag: {name: 'Rasper Red', meta_description: 'Rasper is the Cool Red Casper'}};
        helpers.meta_description.call(tag).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Rasper is the Cool Red Casper');

            done();
        }).catch(done);
    });

    it('returns empty description on paginated tag page that has meta data', function (done) {
        var tag = {relativeUrl: '/tag/rasper-red/page/2/', tag: {name: 'Rasper Red', meta_description: 'Rasper is the Cool Red Casper'}};
        helpers.meta_description.call(tag).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('');

            done();
        }).catch(done);
    });

    it('returns correct description for an author page', function (done) {
        var author = {relativeUrl: '/author/donald', author: {bio: 'I am a Duck.'}};
        helpers.meta_description.call(author).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('I am a Duck.');

            done();
        }).catch(done);
    });

    it('returns empty description for a paginated author page', function (done) {
        var author = {relativeUrl: '/author/donald/page/2/', author: {name: 'Donald Duck'}};
        helpers.meta_description.call(author).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('');

            done();
        }).catch(done);
    });

    it('returns empty description when meta_description is not set', function (done) {
        var post = {relativeUrl: '/nice-post', post: {title: 'Post Title', html: 'Very nice post indeed.'}};
        helpers.meta_description.call(post).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('');

            done();
        }).catch(done);
    });

    it('returns meta_description on post with meta_description set', function (done) {
        var post = {relativeUrl: '/nice-post', post: {title: 'Post Title', meta_description: 'Nice post about stuff.'}};
        helpers.meta_description.call(post).then(function (rendered) {
            should.exist(rendered);
            String(rendered).should.equal('Nice post about stuff.');

            done();
        }).catch(done);
    });
});
