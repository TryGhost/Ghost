var should = require('should'), // jshint ignore:line
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

    describe('Edit', function () {
        let knexMock;

        before(function () {
            knexMock = new testUtils.mocks.knex();
            knexMock.mock();
        });

        after(function () {
            knexMock.unmock();
        });

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
