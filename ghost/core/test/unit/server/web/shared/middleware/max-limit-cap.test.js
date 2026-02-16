const assert = require('node:assert/strict');
const sinon = require('sinon');
const configUtils = require('../../../../../utils/config-utils');
const maxLimitCap = require('../../../../../../core/server/web/shared/middleware/max-limit-cap');

describe('Max Limit Cap Middleware', function () {
    let req;
    let res;
    let next;

    beforeEach(function () {
        req = {
            query: {},
            path: '/api/content/posts/',
            originalUrl: '/ghost/api/content/posts/'
        };
        res = {};
        next = sinon.stub();
    });

    afterEach(function () {
        sinon.restore();
        configUtils.restore();
    });

    describe('limitConfig', function () {
        it('should have the correct default values', function () {
            assert.equal(maxLimitCap.limitConfig.allowLimitAll, false);
            assert.equal(maxLimitCap.limitConfig.maxLimit, 100);
            assert.equal(maxLimitCap.limitConfig.exceptionEndpoints.length, 2);
        });
    });

    describe('when no limit is specified', function () {
        it('should call next without modifying the query', function () {
            maxLimitCap[0](req, res, next);

            assert.equal(req.query.limit, undefined);
            assert.equal(next.calledOnce, true);
        });
    });

    describe('when limit is below maxLimit', function () {
        it('should not modify the limit', function () {
            req.query.limit = 50;

            maxLimitCap[0](req, res, next);

            assert.equal(req.query.limit, 50);
            assert.equal(next.calledOnce, true);
        });

        it('should handle string limit values', function () {
            req.query.limit = '25';

            maxLimitCap[0](req, res, next);

            assert.equal(req.query.limit, '25');
            assert.equal(next.calledOnce, true);
        });
    });

    describe('when limit exceeds maxLimit', function () {
        it('should cap limit to 100', function () {
            req.query.limit = 150;

            maxLimitCap[0](req, res, next);

            assert.equal(req.query.limit, 100);
            assert.equal(next.calledOnce, true);
        });

        it('should cap string limit values to 100', function () {
            req.query.limit = '200';

            maxLimitCap[0](req, res, next);

            assert.equal(req.query.limit, 100);
            assert.equal(next.calledOnce, true);
        });
    });

    describe('when limit is "all"', function () {
        it('should cap to 100 when allowLimitAll is false', function () {
            // Note: Config values are loaded at module load time, so this test
            // reflects the default behavior (allowLimitAll = false)
            req.query.limit = 'all';

            maxLimitCap[0](req, res, next);

            assert.equal(req.query.limit, 100);
            assert.equal(next.calledOnce, true);
        });

        it('should allow "all" when allowLimitAll is true', function () {
            sinon.stub(maxLimitCap.limitConfig, 'allowLimitAll').value(true);

            req.query.limit = 'all';

            maxLimitCap[0](req, res, next);

            assert.equal(req.query.limit, 'all');
            assert.equal(next.calledOnce, true);
        });
    });

    describe('with custom maxLimit configuration', function () {
        it('should use custom maxLimit value', function () {
            sinon.stub(maxLimitCap.limitConfig, 'maxLimit').value(50);

            req.query.limit = 75;

            maxLimitCap[0](req, res, next);

            assert.equal(req.query.limit, 50); // Should cap to configured maxLimit
            assert.equal(next.calledOnce, true);
        });

        it('should not modify limit below custom maxLimit', function () {
            sinon.stub(maxLimitCap.limitConfig, 'maxLimit').value(50);

            req.query.limit = 30;

            maxLimitCap[0](req, res, next);

            assert.equal(req.query.limit, 30);
            assert.equal(next.calledOnce, true);
        });
    });

    describe('exception endpoints', function () {
        it('should not cap limit for /api/admin/posts/export/', function () {
            req.path = '/api/admin/posts/export/';
            req.originalUrl = '/ghost/api/admin/posts/export/';
            req.query.limit = 1000;

            maxLimitCap[0](req, res, next);

            assert.equal(req.query.limit, 1000);
            assert.equal(next.calledOnce, true);
        });

        it('should not cap limit for /api/admin/emails/ endpoints', function () {
            req.path = '/api/admin/emails/123/batches/';
            req.originalUrl = '/ghost/api/admin/emails/123/batches/';
            req.query.limit = 500;

            maxLimitCap[0](req, res, next);

            assert.equal(req.query.limit, 500);
            assert.equal(next.calledOnce, true);
        });

        it('should not cap limit for /api/admin/emails/ recipient-failures', function () {
            req.path = '/api/admin/emails/123/recipient-failures/';
            req.originalUrl = '/ghost/api/admin/emails/123/recipient-failures/';
            req.query.limit = 'all';

            maxLimitCap[0](req, res, next);

            assert.equal(req.query.limit, 'all');
            assert.equal(next.calledOnce, true);
        });

        it('should cap limit for non-exception endpoints', function () {
            req.path = '/api/admin/members/';
            req.originalUrl = '/ghost/api/admin/members/';
            req.query.limit = 500;

            maxLimitCap[0](req, res, next);

            assert.equal(req.query.limit, 100);
            assert.equal(next.calledOnce, true);
        });
    });

    describe('edge cases', function () {
        it('should handle limit at exactly maxLimit', function () {
            req.query.limit = 100;

            maxLimitCap[0](req, res, next);

            assert.equal(req.query.limit, 100);
            assert.equal(next.calledOnce, true);
        });

        it('should handle limit of 0', function () {
            req.query.limit = 0;

            maxLimitCap[0](req, res, next);

            assert.equal(req.query.limit, 0);
            assert.equal(next.calledOnce, true);
        });

        it('should handle negative limit values', function () {
            req.query.limit = -10;

            maxLimitCap[0](req, res, next);

            assert.equal(req.query.limit, -10);
            assert.equal(next.calledOnce, true);
        });

        it('should handle non-numeric string limits', function () {
            req.query.limit = 'invalid';

            maxLimitCap[0](req, res, next);

            assert.equal(req.query.limit, 100);
            assert.equal(next.calledOnce, true);
        });

        it('should handle paths that partially match exception endpoints', function () {
            req.path = '/api/admin/posts/'; // Not the export endpoint
            req.originalUrl = '/ghost/api/admin/posts/'; // Not the export endpoint
            req.query.limit = 500;

            maxLimitCap[0](req, res, next);

            assert.equal(req.query.limit, 100);
            assert.equal(next.calledOnce, true);
        });
    });

    describe('middleware array', function () {
        it('should export an array with the middleware function', function () {
            assert.ok(Array.isArray(maxLimitCap));
            assert.equal(maxLimitCap.length, 1);
            assert.equal(typeof maxLimitCap[0], 'function');
        });
    });
});
