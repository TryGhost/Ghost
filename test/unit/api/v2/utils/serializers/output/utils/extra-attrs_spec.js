const should = require('should');
const sinon = require('sinon');
const extraAttrsUtil = require('../../../../../../../../core/server/api/v2/utils/serializers/output/utils/extra-attrs');

describe('Unit: v2/utils/serializers/output/utils/extra-attrs', function () {
    const frame = {
        options: {}
    };

    let model;

    beforeEach(function () {
        model = sinon.stub();
    });

    describe('postExcerpt', function () {
        it('respects custom excerpt', function () {
            const attrs = {
                custom_excerpt: 'custom excerpt'
            };

            extraAttrsUtil.postExcerpt(frame, model, attrs);

            attrs.excerpt.should.eql(attrs.custom_excerpt);
        });

        it('no custom excerpt', function () {
            const attrs = {
                plaintext: (new Array(501)).join('A')
            };

            extraAttrsUtil.postExcerpt(frame, model, attrs);

            attrs.excerpt.should.eql(new Array(501).join('A'));
        });

        it('has excerpt when plaintext is null', function () {
            const attrs = {
                plaintext: null
            };

            extraAttrsUtil.postExcerpt(frame, model, attrs);

            attrs.should.have.property('excerpt');
            (attrs.excerpt === null).should.be.true();
        });
    });
});
