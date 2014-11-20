/*globals describe, before, afterEach, after, it*/
/*jshint expr:true*/
var should         = require('should'),
    sinon          = require('sinon'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers');

describe('{{image}} helper', function () {
    var sandbox;

    before(function () {
        sandbox = sinon.sandbox.create();
        utils.overrideConfig({url: 'http://testurl.com/'});
        utils.loadHelpers();
    });

    afterEach(function () {
        sandbox.restore();
    });

    after(function () {
        utils.restoreConfig();
    });

    it('has loaded image helper', function () {
        should.exist(handlebars.helpers.image);
    });

    it('should output relative url of image', function (done) {
        helpers.image.call({
            image: '/content/images/image-relative-url.png',
            author: {
                image: '/content/images/author-image-relatve-url.png'
            }
        }).then(function (rendered) {
            should.exist(rendered);
            rendered.should.equal('/content/images/image-relative-url.png');
            done();
        }).catch(done);
    });

    it('should output absolute url of image if the option is present ', function (done) {
        helpers.image.call({image: '/content/images/image-relative-url.png',
        author: {image: '/content/images/author-image-relatve-url.png'}},
        {hash: {absolute: 'true'}}).then(function (rendered) {
            should.exist(rendered);
            rendered.should.equal('http://testurl.com/content/images/image-relative-url.png');
            done();
        }).catch(done);
    });

    it('should have no output if there is no image ', function (done) {
        helpers.image.call({image: null}, {hash: {absolute: 'true'}}).then(function (rendered) {
            should.not.exist(rendered);
            done();
        }).catch(done);
    });

    it('should have no output if there is no image property ', function (done) {
        helpers.image.call({}, {hash: {absolute: 'true'}}).then(function (rendered) {
            should.not.exist(rendered);
            done();
        }).catch(done);
    });
});

describe('{{image}} helper when Ghost is running on a sub-directory', function () {
    var sandbox;

    before(function () {
        sandbox = sinon.sandbox.create();
        utils.overrideConfig({url: 'http://testurl.com/blog'});
        utils.loadHelpers();
    });

    afterEach(function () {
        sandbox.restore();
    });

    after(function () {
        utils.restoreConfig();
    });

    it('should output relative url of image', function (done) {
        helpers.image.call({
            image: '/blog/content/images/image-relative-url.png',
            author: {
                image: '/blog/content/images/author-image-relatve-url.png'
            }
        }).then(function (rendered) {
            should.exist(rendered);
            rendered.should.equal('/blog/content/images/image-relative-url.png');
            done();
        }).catch(done);
    });

    it('should output absolute url of image if the option is present ', function (done) {
        helpers.image.call({image: '/blog/content/images/image-relative-url.png',
        author: {image: '/blog/content/images/author-image-relatve-url.png'}},
        {hash: {absolute: 'true'}}).then(function (rendered) {
            should.exist(rendered);
            rendered.should.equal('http://testurl.com/blog/content/images/image-relative-url.png');
            done();
        }).catch(done);
    });
});
