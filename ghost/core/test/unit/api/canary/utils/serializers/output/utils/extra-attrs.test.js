const should = require('should');
const sinon = require('sinon');
const extraAttrsUtil = require('../../../../../../../../core/server/api/endpoints/utils/serializers/output/utils/extra-attrs');

describe('Unit: endpoints/utils/serializers/output/utils/extra-attrs', function () {
    const options = {
        columns: ['excerpt', 'custom_excerpt', 'plaintext']
    };

    let model;

    beforeEach(function () {
        model = sinon.stub();
        model.get = sinon.stub();
        model.get.withArgs('plaintext').returns(new Array(5000).join('A'));
    });

    describe('for post', function () {
        it('respects custom excerpt', function () {
            const attrs = {custom_excerpt: 'custom excerpt'};
            extraAttrsUtil.forPost(options, model, attrs);
            attrs.excerpt.should.eql(attrs.custom_excerpt);
        });

        it('no custom excerpt', function () {
            const attrs = {};

            extraAttrsUtil.forPost(options, model, attrs);
            model.get.called.should.be.true();

            attrs.excerpt.should.eql(new Array(501).join('A'));
        });

        it('has excerpt when plaintext is null', function () {
            model.get.withArgs('plaintext').returns(null);
            const attrs = {};
            extraAttrsUtil.forPost(options, model, attrs);
            model.get.called.should.be.true();
            attrs.should.have.property('excerpt');
            (attrs.excerpt === null).should.be.true();
        });

        it('has excerpt when no columns are passed', function () {
            delete options.columns;
            const attrs = {};
            extraAttrsUtil.forPost(options, model, attrs);
            model.get.called.should.be.true();
            attrs.should.have.property('excerpt');
        });
    });
});
