const sinon = require('sinon');
const assert = require('assert/strict');

const {contentVersion} = require('../../../../../core/server/services/api-version-compatibility/');

describe('MW Content Version', function () {
    let req;
    let res;
    let next;

    beforeEach(function () {
        req = {
            header: sinon.stub()
        };

        res = {
            header: sinon.stub(),
            vary: sinon.stub()
        };

        next = sinon.spy();
    });

    afterEach(function () {
        sinon.restore();
    });

    it('appends Accept-Version value to an existing Vary header', function () {
        res.vary.withArgs('Accept-Version');
        contentVersion(req, res, next);
        assert(res.vary.calledWithExactly('Accept-Version'), 'Vary header with Accept-Version was not set');
    });
});
