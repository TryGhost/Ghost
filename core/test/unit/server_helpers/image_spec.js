/*globals describe, before, afterEach, after, it*/
var should         = require('should'),
    sinon          = require('sinon'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),
    configUtils    = require('../../utils/configUtils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers');

describe('{{image}} helper', function () {
    var sandbox;

    before(function () {
        sandbox = sinon.sandbox.create();
        configUtils.set({url: 'http://testurl.com/'});
        utils.loadHelpers();
    });

    afterEach(function () {
        sandbox.restore();
    });

    after(function () {
        configUtils.restore();
    });

    it('has loaded image helper', function () {
        should.exist(handlebars.helpers.image);
    });

    it('should output relative url of image', function () {
        var rendered = helpers.image.call({
            image: '/content/images/image-relative-url.png',
            author: {
                image: '/content/images/author-image-relative-url.png'
            }
        });

        should.exist(rendered);
        rendered.should.equal('/content/images/image-relative-url.png');
    });

    it('should output absolute url of image if the option is present ', function () {
        var rendered = helpers.image.call({
                image: '/content/images/image-relative-url.png',
                author: {image: '/content/images/author-image-relative-url.png'}
            },
            {
                hash: {absolute: 'true'}
            });

        should.exist(rendered);
        rendered.should.equal('http://testurl.com/content/images/image-relative-url.png');
    });

    it('should have no output if there is no image ', function () {
        var rendered = helpers.image.call({image: null}, {hash: {absolute: 'true'}});

        should.not.exist(rendered);
    });

    it('should have no output if there is no image property ', function () {
        var rendered = helpers.image.call({}, {hash: {absolute: 'true'}});

        should.not.exist(rendered);
    });

    describe('with sub-directory', function () {
        before(function () {
            configUtils.set({url: 'http://testurl.com/blog'});
        });
        after(function () {
            configUtils.restore();
        });

        it('should output relative url of image', function () {
            var rendered = helpers.image.call({
                image: '/blog/content/images/image-relative-url.png',
                author: {
                    image: '/blog/content/images/author-image-relative-url.png'
                }
            });

            should.exist(rendered);
            rendered.should.equal('/blog/content/images/image-relative-url.png');
        });

        it('should output absolute url of image if the option is present ', function () {
            var rendered = helpers.image.call({
                    image: '/blog/content/images/image-relative-url.png',
                    author: {image: '/blog/content/images/author-image-relatve-url.png'}
                },
                {
                    hash: {absolute: 'true'}
                });

            should.exist(rendered);
            rendered.should.equal('http://testurl.com/blog/content/images/image-relative-url.png');
        });

        it('should not change output for an external url', function () {
            var rendered = helpers.image.call({
                image: 'http://example.com/picture.jpg',
                author: {
                    image: '/blog/content/images/author-image-relative-url.png'
                }
            });

            should.exist(rendered);
            rendered.should.equal('http://example.com/picture.jpg');
        });
    });
});
