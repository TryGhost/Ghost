const sinon = require('sinon');

const versionMatch = require('../../../../../../core/server/web/api/middleware/version-match');

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

        sinon.assert.calledOnceWithExactly(nextStub);
    });

    it('should call next if versions are an exact match', function () {
        const server = '1.5.0';
        const client = '1.5';

        testVersionMatch(server, client);

        sinon.assert.calledOnceWithExactly(nextStub);
    });

    it('should call next if client version is earlier than server', function () {
        const server = '1.5.0';
        const client = '1.3';

        testVersionMatch(server, client);

        sinon.assert.calledOnceWithExactly(nextStub);
    });

    it('should throw BadRequestError if client version is invalid', function () {
        const server = '1.5.0';
        const client = 'bananarama';

        testVersionMatch(server, client);

        sinon.assert.calledOnceWithExactly(nextStub, sinon.match({
            errorType: 'BadRequestError',
            statusCode: 400
        }));
    });

    it('should throw VersionMismatchError if client version is earlier by a major version', function () {
        const server = '2.5.0';
        const client = '1.3';

        testVersionMatch(server, client);

        sinon.assert.calledOnceWithExactly(nextStub, sinon.match({
            errorType: 'VersionMismatchError',
            statusCode: 400
        }));
    });

    it('should throw VersionMismatchError if client version is later than server', function () {
        const server = '1.3.0';
        const client = '1.5';

        testVersionMatch(server, client);

        sinon.assert.calledOnceWithExactly(nextStub, sinon.match({
            errorType: 'VersionMismatchError',
            statusCode: 400
        }));
    });

    it('should throw VersionMismatchError if client version is later by a major version', function () {
        const server = '1.5.0';
        const client = '2.3';

        testVersionMatch(server, client);

        sinon.assert.calledOnceWithExactly(nextStub, sinon.match({
            errorType: 'VersionMismatchError',
            statusCode: 400
        }));
    });

    it('should call next if pre-release is allowed', function () {
        const server = '1.5.0-pre';
        const client = '1.4';

        testVersionMatch(server, client);

        sinon.assert.calledOnceWithExactly(nextStub);
    });

    it('throws error if server is a pre-release, but later by major version', function () {
        const server = '2.0.0-alpha';
        const client = '1.5';

        testVersionMatch(server, client);

        sinon.assert.calledOnceWithExactly(nextStub, sinon.match({
            errorType: 'VersionMismatchError',
            statusCode: 400
        }));
    });
});
