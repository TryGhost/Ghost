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
