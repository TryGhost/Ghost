var should = require('should'),
    sinon = require('sinon'),
    _ = require('lodash'),
    models = require('../../../../server/models'),
    ghostBookshelf,

    sandbox = sinon.sandbox.create();

describe('Models: base', function () {
    before(function () {
        models.init();
        ghostBookshelf = _.cloneDeep(models.Base);
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('setEmptyValuesToNull', function () {
        it('should add function to prototype', function () {
            ghostBookshelf.Model.prototype.setEmptyValuesToNull.should.be.a.Function();
        });
        it.skip('resets given empty value to null', function (done) {
            var affectedProps = ['feature_image', 'og_image', 'twitter_image'];
            ghostBookshelf.Model.prototype.setEmptyValuesToNull.call(this, affectedProps);
        });
    });
});
