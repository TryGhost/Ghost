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
      get: getStub,
    };
    res = {
      locals: {},
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

  it('allows request if request does not include a version', async function () {
    const server = '1.5.1';

    testVersionMatch(server);

    sinon.assert.calledOnceWithExactly(nextStub);
  });

  it('allows request if versions are an exact match', async function () {
    const server = '1.5.0';
    const client = '1.5';

    testVersionMatch(server, client);

    sinon.assert.calledOnceWithExactly(nextStub);
  });

  it('allows request if client version is earlier than server', async function () {
    const server = '1.5.0';
    const client = '1.3';

    testVersionMatch(server, client);

    sinon.assert.calledOnceWithExactly(nextStub);
  });

  it('disallows request with BadRequestError if client version is invalid', async function () {
    const server = '1.5.0';
    const client = 'bananarama';

    testVersionMatch(server, client);

    sinon.assert.calledOnceWithExactly(
      nextStub,
      sinon.match({
        errorType: 'BadRequestError',
        statusCode: 400,
      }),
    );
  });

  it('disallows request with VersionMismatchError if client version is earlier by a major version', async function () {
    const server = '2.5.0';
    const client = '1.3';

    testVersionMatch(server, client);

    sinon.assert.calledOnceWithExactly(
      nextStub,
      sinon.match({
        errorType: 'VersionMismatchError',
        statusCode: 400,
      }),
    );
  });

  it('disallows request with VersionMismatchError if client version is later than server', async function () {
    const server = '1.3.0';
    const client = '1.5';

    testVersionMatch(server, client);

    sinon.assert.calledOnceWithExactly(
      nextStub,
      sinon.match({
        errorType: 'VersionMismatchError',
        statusCode: 400,
      }),
    );
  });

  it('disallows request with VersionMismatchError if client version is later by a major version', async function () {
    const server = '1.5.0';
    const client = '2.3';

    testVersionMatch(server, client);

    sinon.assert.calledOnceWithExactly(
      nextStub,
      sinon.match({
        errorType: 'VersionMismatchError',
        statusCode: 400,
      }),
    );
  });

  it('allows request if pre-release is allowed', async function () {
    const server = '1.5.0-pre';
    const client = '1.4';

    testVersionMatch(server, client);

    sinon.assert.calledOnceWithExactly(nextStub);
  });

  it('disallows request if server is a pre-release, but later by major version', async function () {
    const server = '2.0.0-alpha';
    const client = '1.5';

    testVersionMatch(server, client);

    sinon.assert.calledOnceWithExactly(
      nextStub,
      sinon.match({
        errorType: 'VersionMismatchError',
        statusCode: 400,
      }),
    );
  });
});
