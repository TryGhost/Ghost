const should = require('should');
const sinon = require('sinon');
const extraAttrsUtil = require('../../../../../../../../core/server/api/endpoints/utils/serializers/output/utils/extra-attrs');

describe('Unit: canary/utils/serializers/output/utils/extra-attrs', function () {
    const frame = {
        // Question: is it okay to use actual column values here that the forPost function in extra-attrs would expect?
        options: {
            columns: ['excerpt', 'custom_excerpt', 'plaintext']
        }
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
            extraAttrsUtil.forPost(frame, model, attrs);
            attrs.excerpt.should.eql(attrs.custom_excerpt);
        });

        it('no custom excerpt', function () {
            const attrs = {};

            extraAttrsUtil.forPost(frame, model, attrs);
            model.get.called.should.be.true();

            attrs.excerpt.should.eql(new Array(501).join('A'));
        });

        it('has excerpt when plaintext is null', function () {
            model.get.withArgs('plaintext').returns(null);
            const attrs = {};
            extraAttrsUtil.forPost(frame, model, attrs);
            model.get.called.should.be.true();
            attrs.should.have.property('excerpt');
            (attrs.excerpt === null).should.be.true();
        });
        
        it('has excerpt when no columns are passed', function () {
            delete frame.options.columns;
            const attrs = {};
            extraAttrsUtil.forPost(frame, model, attrs);
            model.get.called.should.be.true();
            attrs.should.have.property('excerpt');
        });
    });
});
