const url = require('url');
const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../utils');
const urlService = require('../../../../../frontend/services/url');
const urls = require('../../../../../server/api/v0.1/decorators/urls');

describe('Unit: api:v0.1:decorators:urls', function () {
    beforeEach(function () {
        sinon.stub(urlService, 'getUrlByResourceId');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('urlsForPost', function () {
        it('does not add any extra keys to an object', function () {
            const object = {};
            const options = {
                columns: []
            };

            urls.urlsForPost(1, object, options);

            should.equal(Object.keys(object).length, 0);
        });

        it('adds url property', function () {
            const object = testUtils.DataGenerator.forKnex.createPost();
            const options = {
                columns: ['url']
            };
            urlService.getUrlByResourceId.withArgs(object.id).returns('url');

            urls.urlsForPost(object.id, object, options);

            object.url.should.equal('url');
        });

        it('converts relative feature_image url to absolute', function () {
            const object = {
                feature_image: '/content/images/feature_image.jpg'
            };
            const options = {
                absolute_urls: true,
                context: {
                    public: true
                }
            };

            urls.urlsForPost(object.id, object, options);

            const urlObject = url.parse(object.feature_image);
            should.exist(urlObject.protocol);
            should.exist(urlObject.host);
        });

        it('converts relative twitter_image url to absolute', function () {
            const object = {
                twitter_image: '/content/images/twitter_image.jpg'
            };
            const options = {
                absolute_urls: true,
                context: {
                    public: true
                }
            };

            urls.urlsForPost(object.id, object, options);

            const urlObject = url.parse(object.twitter_image);

            should.exist(urlObject.protocol);
            should.exist(urlObject.host);
        });

        it('converts relative og_image url to absolute when absolute_urls flag passed', function () {
            const object = {
                og_image: '/content/images/og_image.jpg'
            };
            const options = {
                absolute_urls: true,
                context: {
                    public: true
                }
            };

            urls.urlsForPost(object.id, object, options);

            const urlObject = url.parse(object.og_image);

            should.exist(urlObject.protocol);
            should.exist(urlObject.host);
        });

        it('converts relative content urls to absolute when absolute_urls flag passed', function () {
            const object = {
                html: '<img src="/content/images/my-coole-image.jpg">'
            };
            const options = {
                absolute_urls: true,
                context: {
                    public: true
                }
            };

            urls.urlsForPost(object.id, object, options);

            const imgSrc = object.html.match(/src="([^"]+)"/)[1];
            const imgSrcUrlObject = url.parse(imgSrc);

            should.exist(imgSrcUrlObject.protocol);
            should.exist(imgSrcUrlObject.host);
        });
    });

    describe('urlsForUser', function () {
        it('adds url property', function () {
            const object = testUtils.DataGenerator.forKnex.createUser();
            const options = {
                absolute_urls: true,
                context: {
                    public: true
                }
            };
            urlService.getUrlByResourceId.withArgs(object.id).returns('url');

            urls.urlsForUser(object.id, object, options);
            const urlObject = url.parse(object.url);

            should.exist(urlObject.protocol);
            should.exist(urlObject.host);
        });

        it('converts relative profile_image url to absolute', function () {
            const object = {
                profile_image: '/content/images/profile_image.jpg'
            };
            const options = {
                absolute_urls: true,
                context: {
                    public: true
                }
            };

            urls.urlsForUser(object.id, object, options);
            const urlObject = url.parse(object.profile_image);

            should.exist(urlObject.protocol);
            should.exist(urlObject.host);
        });

        it('converts relative cover_image url to absolute', function () {
            const object = {
                cover_image: '/content/images/cover_image.jpg'
            };
            const options = {
                absolute_urls: true,
                context: {
                    public: true
                }
            };

            urls.urlsForUser(object.id, object, options);
            const urlObject = url.parse(object.cover_image);

            should.exist(urlObject.protocol);
            should.exist(urlObject.host);
        });
    });

    describe('urlsForTag', function () {
        it('adds url property', function () {
            const object = testUtils.DataGenerator.forKnex.createTag();
            const options = {
                absolute_urls: true,
                context: {
                    public: true
                }
            };
            urlService.getUrlByResourceId.withArgs(object.id).returns('url');

            urls.urlsForTag(object.id, object, options);
            const urlObject = url.parse(object.url);

            should.exist(urlObject.protocol);
            should.exist(urlObject.host);
        });

        it('converts relative feature_image url to absolute', function () {
            const object = {
                feature_image: '/content/images/feature_image.jpg'
            };
            const options = {
                absolute_urls: true,
                context: {
                    public: true
                }
            };

            urls.urlsForTag(object.id, object, options);
            const urlObject = url.parse(object.feature_image);

            should.exist(urlObject.protocol);
            should.exist(urlObject.host);
        });
    });
});
