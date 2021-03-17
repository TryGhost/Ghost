const should = require('should');
const extraAttrsUtil = require('../../../../../../../../core/server/api/canary/utils/serializers/output/utils/extra-attrs');

describe('Unit: canary/utils/serializers/output/utils/extra-attrs', function () {
    const frame = {
        options: {}
    };

    let model;

    describe('for post', function () {
        it('respects custom excerpt', function () {
            const attrs = {
                custom_excerpt: 'custom excerpt',
                plaintext: new Array(5000).join('A')
            };

            extraAttrsUtil.forPost(frame, model, attrs);

            attrs.excerpt.should.eql(attrs.custom_excerpt);
        });

        it('no custom excerpt', function () {
            const attrs = {
                plaintext: new Array(5000).join('A')
            };

            extraAttrsUtil.forPost(frame, model, attrs);

            attrs.excerpt.should.eql(new Array(501).join('A'));
        });

        it('has excerpt when plaintext is null', function () {
            const attrs = {
                plaintext: null
            };

            extraAttrsUtil.forPost(frame, model, attrs);

            attrs.should.have.property('excerpt');
            (attrs.excerpt === null).should.be.true();
        });
    });
});
