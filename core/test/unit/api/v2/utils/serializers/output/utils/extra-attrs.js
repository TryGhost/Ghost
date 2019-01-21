const should = require('should');
const sinon = require('sinon');
const extraAttrsUtil = require('../../../../../../../../server/api/v2/utils/serializers/output/utils/extra-attrs');


describe('Unit: v2/utils/serializers/output/utils/extra-attrs', () => {
    const frame = {
        options: {}
    };

    let model;

    beforeEach(function () {
        model = sinon.stub();
        model.get = sinon.stub();
        model.get.withArgs('plaintext').returns(new Array(5000).join('A'));
    });

    describe('for post', function () {
        it('respects custom excerpt', () => {
            const attrs = {custom_excerpt: 'custom excerpt'};

            extraAttrsUtil.forPost(frame, model, attrs);
            model.get.called.should.be.false();

            attrs.excerpt.should.eql(attrs.custom_excerpt);
        });

        it('no custom excerpt', () => {
            const attrs = {};

            extraAttrsUtil.forPost(frame, model, attrs);
            model.get.called.should.be.true();

            attrs.excerpt.should.eql(new Array(501).join('A'));
        });
    });
});
