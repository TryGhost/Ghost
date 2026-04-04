const assert = require('node:assert/strict');
const sinon = require('sinon');
const rewire = require('rewire');
const configUtils = require('../../utils/config-utils');

describe('Shared Max Limit Cap', function () {
    let maxLimitCap;

    beforeEach(function () {
        maxLimitCap = rewire('../../../core/shared/max-limit-cap');
    });

    afterEach(function () {
        sinon.restore();
        return configUtils.restore();
    });

    describe('limitConfig', function () {
        it('should have the correct default values', function () {
            assert.equal(maxLimitCap.limitConfig.allowLimitAll, false);
            assert.equal(maxLimitCap.limitConfig.maxLimit, 100);
            assert.equal(maxLimitCap.limitConfig.exceptionEndpoints.length, 2);
        });

        it('reads from config dynamically', function () {
            configUtils.set('optimization:allowLimitAll', true);
            configUtils.set('optimization:maxLimit', 50);

            maxLimitCap = rewire('../../../core/shared/max-limit-cap');

            assert.equal(maxLimitCap.limitConfig.allowLimitAll, true);
            assert.equal(maxLimitCap.limitConfig.maxLimit, 50);
        });
    });

    describe('applyLimitCap', function () {
        it('returns undefined/null limits unchanged', function () {
            assert.equal(maxLimitCap.applyLimitCap(undefined), undefined);
            assert.equal(maxLimitCap.applyLimitCap(null), null);
            assert.equal(maxLimitCap.applyLimitCap(''), '');
        });

        it('caps "all" to maxLimit by default', function () {
            const result = maxLimitCap.applyLimitCap('all');
            assert.equal(result, 100);
        });

        it('allows "all" when allowLimitAll is true', function () {
            sinon.stub(maxLimitCap.limitConfig, 'allowLimitAll').value(true);

            const result = maxLimitCap.applyLimitCap('all');
            assert.equal(result, 'all');
        });

        it('caps numeric limits exceeding maxLimit', function () {
            const result = maxLimitCap.applyLimitCap(150);
            assert.equal(result, 100);
        });

        it('leaves numeric limits below maxLimit unchanged', function () {
            const result = maxLimitCap.applyLimitCap(50);
            assert.equal(result, 50);
        });

        it('uses custom maxLimit when configured', function () {
            sinon.stub(maxLimitCap.limitConfig, 'maxLimit').value(50);

            const result = maxLimitCap.applyLimitCap('all');
            assert.equal(result, 50);
        });

        it('caps invalid string limits to maxLimit', function () {
            const result = maxLimitCap.applyLimitCap('invalid');
            assert.equal(result, 100);
        });

        it('handles string numeric limits', function () {
            const result1 = maxLimitCap.applyLimitCap('25');
            assert.equal(result1, '25');

            const result2 = maxLimitCap.applyLimitCap('150');
            assert.equal(result2, 100);
        });

        it('bypasses limits for exception endpoints', function () {
            const result1 = maxLimitCap.applyLimitCap(1000, {url: '/ghost/api/admin/posts/export/'});
            assert.equal(result1, 1000);

            const result2 = maxLimitCap.applyLimitCap('all', {url: '/ghost/api/admin/emails/123/batches/'});
            assert.equal(result2, 'all');
        });

        it('applies limits for non-exception endpoints', function () {
            const result = maxLimitCap.applyLimitCap(1000, {url: '/ghost/api/admin/members/'});
            assert.equal(result, 100);
        });

        it('handles edge cases', function () {
            // Limit exactly at maxLimit
            const result1 = maxLimitCap.applyLimitCap(100);
            assert.equal(result1, 100);

            // Zero limit
            const result2 = maxLimitCap.applyLimitCap(0);
            assert.equal(result2, 0);

            // Negative limit (should be left as-is since it's <= maxLimit)
            const result3 = maxLimitCap.applyLimitCap(-10);
            assert.equal(result3, -10);
        });
    });
});
