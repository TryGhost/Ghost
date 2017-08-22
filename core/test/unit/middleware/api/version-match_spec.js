var should  = require('should'), // jshint ignore:line
    sinon   = require('sinon'),

    versionMatch = require('../../../../server/middleware/api/version-match'),

    sandbox = sinon.sandbox.create();

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
            locals: {}
        };
    });

    function testVersionMatch(serverVersion, clientVersion) {
        // Set the server version
        res.locals.version = serverVersion;

        if (clientVersion) {
            // Optionally set the client version
            getStub.returns(clientVersion);
        }

        versionMatch(req, res, nextStub);
    }

    it('should call next if request does not include a version', function () {
        var server = '1.5.1';

        testVersionMatch(server);

        nextStub.calledOnce.should.be.true();
        nextStub.firstCall.args.should.be.empty();
    });

    it('should call next if versions are an exact match', function () {
        var server = '1.5.0',
            client = '1.5';

        testVersionMatch(server, client);

        nextStub.calledOnce.should.be.true();
        nextStub.firstCall.args.should.be.empty();
    });

    it('should call next if client version is earlier than server', function () {
        var server = '1.5.0',
            client = '1.3';

        testVersionMatch(server, client);

        nextStub.calledOnce.should.be.true();
        nextStub.firstCall.args.should.be.empty();
    });

    it('should throw VersionMismatchError if client version is earlier by a major version', function () {
        var server = '2.5.0',
            client = '1.3';

        testVersionMatch(server, client);

        nextStub.calledOnce.should.be.true();
        nextStub.firstCall.args.should.have.lengthOf(1);
        nextStub.firstCall.args[0].should.have.property('errorType', 'VersionMismatchError');
        nextStub.firstCall.args[0].should.have.property('statusCode', 400);
    });

    it('should throw VersionMismatchError if client version is later than server', function () {
        var server = '1.3.0',
            client = '1.5';

        testVersionMatch(server, client);

        nextStub.calledOnce.should.be.true();
        nextStub.firstCall.args.should.have.lengthOf(1);
        nextStub.firstCall.args[0].should.have.property('errorType', 'VersionMismatchError');
        nextStub.firstCall.args[0].should.have.property('statusCode', 400);
    });

    it('should throw VersionMismatchError if client version is later by a major version', function () {
        var server = '1.5.0',
            client = '2.3';

        testVersionMatch(server, client);

        nextStub.calledOnce.should.be.true();
        nextStub.firstCall.args.should.have.lengthOf(1);
        nextStub.firstCall.args[0].should.have.property('errorType', 'VersionMismatchError');
        nextStub.firstCall.args[0].should.have.property('statusCode', 400);
    });
});
