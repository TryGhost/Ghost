var should = require('should'),
    url = require('url'),
    sinon = require('sinon'),
    models = require('../../../server/models'),
    testUtils = require('../../utils'),
    sandbox = sinon.sandbox.create();

describe('Unit: models/tags', function () {
    before(function () {
        models.init();
    });

    after(function () {
        sandbox.restore();
    });

    before(testUtils.teardown);
    before(testUtils.setup('tags'));

    describe('toJSON', function () {
        const toJSON = function toJSON(model, options) {
            return new models.Tag(model).toJSON(options);
        };

        describe('Public context', function () {
            const context = {
                public: true
            };

            it('converts relative feature_image url to absolute when absoluteUrls flag passed', function () {
                const model = {
                    feature_image: '/content/images/feature_image.jpg'
                };
                const json = toJSON(model, {context, absoluteUrls: true});
                const featureImageUrlObject = url.parse(json.feature_image);

                should.exist(featureImageUrlObject.protocol);
                should.exist(featureImageUrlObject.host);
            });
        });
    });

    describe('Edit', function () {
        it('resets given empty value to null', function () {
            return models.Tag.findOne({slug: 'kitchen-sink'})
                .then(function (tag) {
                    tag.get('slug').should.eql('kitchen-sink');
                    tag.get('feature_image').should.eql('https://example.com/super_photo.jpg');
                    tag.set('feature_image', '');
                    tag.set('description', '');
                    return tag.save();
                })
                .then(function (tag) {
                    should(tag.get('feature_image')).be.null();
                    tag.get('description').should.eql('');
                });
        });
    });
});
