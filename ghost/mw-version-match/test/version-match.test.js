require('should');
const sinon = require('sinon');

const versionMatch = require('../');

describe('Version Mismatch', function () {
    let req;
    let res;
    let getStub;
    let nextStub;

    afterEach(function () {
        sinon.restore();
    });

    beforeEach(function () {
        getStub = sinon.stub();
        nextStub = sinon.stub();

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
        const server = '1.5.1';

        testVersionMatch(server);

        nextStub.calledOnce.should.be.true();
        nextStub.firstCall.args.should.be.empty();
    });

    it('should call next if versions are an exact match', function () {
        const server = '1.5.0';
        const client = '1.5';

        testVersionMatch(server, client);

        nextStub.calledOnce.should.be.true();
        nextStub.firstCall.args.should.be.empty();
    });

    it('should call next if client version is earlier than server', function () {
        const server = '1.5.0';
        const client = '1.3';

        testVersionMatch(server, client);

        nextStub.calledOnce.should.be.true();
        nextStub.firstCall.args.should.be.empty();
    });

    it('should throw BadRequestError if client version is invalid', function () {
        const server = '1.5.0';
        const client = 'bananarama';

        testVersionMatch(server, client);

        nextStub.calledOnce.should.be.true();
        nextStub.firstCall.args.should.have.lengthOf(1);
        nextStub.firstCall.args[0].should.have.property('errorType', 'BadRequestError');
        nextStub.firstCall.args[0].should.have.property('statusCode', 400);
    });

    it('should throw VersionMismatchError if client version is earlier by a major version', function () {
        const server = '2.5.0';
        const client = '1.3';

        testVersionMatch(server, client);

        nextStub.calledOnce.should.be.true();
        nextStub.firstCall.args.should.have.lengthOf(1);
        nextStub.firstCall.args[0].should.have.property('errorType', 'VersionMismatchError');
        nextStub.firstCall.args[0].should.have.property('statusCode', 400);
    });

    it('should throw VersionMismatchError if client version is later than server', function () {
        const server = '1.3.0';
        const client = '1.5';

        testVersionMatch(server, client);

        nextStub.calledOnce.should.be.true();
        nextStub.firstCall.args.should.have.lengthOf(1);
        nextStub.firstCall.args[0].should.have.property('errorType', 'VersionMismatchError');
        nextStub.firstCall.args[0].should.have.property('statusCode', 400);
    });

    it('should throw VersionMismatchError if client version is later by a major version', function () {
        const server = '1.5.0';
        const client = '2.3';

        testVersionMatch(server, client);

        nextStub.calledOnce.should.be.true();
        nextStub.firstCall.args.should.have.lengthOf(1);
        nextStub.firstCall.args[0].should.have.property('errorType', 'VersionMismatchError');
        nextStub.firstCall.args[0].should.have.property('statusCode', 400);
    });

    it('should call next if pre-release is allowed', function () {
        const server = '1.5.0-pre';
        const client = '1.4';

        testVersionMatch(server, client);

        nextStub.calledOnce.should.be.true();
        nextStub.firstCall.args.should.be.empty();
    });

    it('throws error if server is a pre-release, but later by major version', function () {
        const server = '2.0.0-alpha';
        const client = '1.5';

        testVersionMatch(server, client);

        nextStub.calledOnce.should.be.true();
        nextStub.firstCall.args.should.have.lengthOf(1);
        nextStub.firstCall.args[0].should.have.property('errorType', 'VersionMismatchError');
        nextStub.firstCall.args[0].should.have.property('statusCode', 400);
    });
});
