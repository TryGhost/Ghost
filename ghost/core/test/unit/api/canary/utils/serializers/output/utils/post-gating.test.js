const assert = require('assert/strict');
const sinon = require('sinon');
const gating = require('../../../../../../../../core/server/api/endpoints/utils/serializers/output/utils/post-gating');
const contentGatingService = require('../../../../../../../../core/server/services/content-gating');
const labs = require('../../../../../../../../core/shared/labs');

describe('Unit: endpoints/utils/serializers/output/utils/post-gating', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('for post', function () {
        let frame;

        beforeEach(function () {
            frame = {
                options: {},
                original: {
                    context: {}
                }
            };
        });

        it('calls contentGating.gatePostAttrs', function () {
            const attrs = {visibility: 'public'};

            const gatePostAttrsStub = sinon.stub(contentGatingService, 'gatePostAttrs');
            gating.forPost(attrs, frame);

            sinon.assert.calledWithExactly(gatePostAttrsStub, attrs, frame.original.context.member, {addAccessAttr: true, labs});
        });

        it('does not add access attr when columns does not include access', function () {
            const gatePostAttrsStub = sinon.stub(contentGatingService, 'gatePostAttrs');

            frame.options.columns = ['id', 'slug'];
            const attrs = {visibility: 'public'};
            gating.forPost(attrs, frame);

            sinon.assert.calledWithExactly(gatePostAttrsStub, attrs, frame.original.context.member, {addAccessAttr: false, labs});
        });

        it('modifies attrs by reference', function () {
            const attrs = {visibility: 'public'};
            gating.forPost(attrs, frame);

            assert.equal(attrs.access, true);
        });
    });
});
