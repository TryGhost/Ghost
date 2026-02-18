const assert = require('node:assert/strict');
const {assertExists} = require('../../../../../utils/assertions');
const _ = require('lodash');
const sinon = require('sinon');
const ghostLocals = require('../../../../../../core/server/web/parent/middleware/ghost-locals');

describe('Theme Handler', function () {
    let req;
    let res;
    let next;

    beforeEach(function () {
        req = sinon.spy();
        res = sinon.spy();
        next = sinon.spy();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('ghostLocals', function () {
        it('sets all locals', function () {
            req.path = '/awesome-post';

            ghostLocals(req, res, next);

            assert(_.isPlainObject(res.locals));
            assertExists(res.locals.version);
            assertExists(res.locals.safeVersion);
            assert.equal(res.locals.relativeUrl, req.path);
            assert.equal(next.called, true);
        });
    });
});
