var should  = require('should'),
    sinon   = require('sinon'),

    versionMatch = require('../../../../server/middleware/api/version-match'),

    sandbox = sinon.sandbox.create();

// To stop jshint complaining
should.equal(true, true);

describe('Version Mismatch', function () {
    var req, res, getStub, nextStub;
    afterEach(function () {
        sandbox.restore();
    });

    beforeEach(function () {
        getStub = sandbox.stub();
        nextStub = sandbox.stub();

        req = {
            get: getStub
        };
        res = {
            locals: {
                safeVersion: '0.7'
            }
        };
    });

    it('should call next if request does not include a version', function () {
        versionMatch(req, res, nextStub);

        nextStub.calledOnce.should.be.true();
        nextStub.firstCall.args.should.be.empty();
    });

    it('should call next if versions match', function () {
        getStub.returns('0.7');
        versionMatch(req, res, nextStub);

        nextStub.calledOnce.should.be.true();
        nextStub.firstCall.args.should.be.empty();
    });

    it('should throw VersionMismatchError if request includes incorrect version', function () {
        getStub.returns('0.6');
        versionMatch(req, res, nextStub);

        nextStub.calledOnce.should.be.true();
        nextStub.firstCall.args.should.have.lengthOf(1);
        nextStub.firstCall.args[0].should.have.property('errorType', 'VersionMismatchError');
        nextStub.firstCall.args[0].should.have.property('statusCode', 400);
    });
});
