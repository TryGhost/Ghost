import assert from 'node:assert/strict';
import sinon from 'sinon';
import { UnauthorizedError } from '@tryghost/errors';

// @ts-expect-error This module lacks type definitions.
import models = require('../../../../core/server/models');
// @ts-expect-error This module lacks type definitions.
import sessionController from '../../../../core/server/api/endpoints/session';
// @ts-expect-error This module lacks type definitions.
import sessionServiceMiddleware = require('../../../../core/server/auth/session');

const spamPrevention = require('../../../../core/server/web/shared/middleware/api/spam-prevention');

/** Stubs the userLogin limiter's resetRequest, resolving or rejecting with `error`. */
const stubLoginReset = (error?: Error) => {
  const resetRequest = error ? sinon.stub().rejects(error) : sinon.stub().resolves();
  sinon.stub(spamPrevention, 'userLogin').returns({ resetRequest });
  return resetRequest;
};

type TestRequest = {
  user?: unknown;
  skipVerification?: boolean;
};

type SessionMiddleware = (
  req: unknown,
  res: unknown,
  next: (error?: unknown) => unknown,
) => unknown;

describe('Session controller', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('exports an add method', function () {
    assert.equal(typeof sessionController.add, 'function');
  });
  it('exports an delete method', function () {
    assert.equal(typeof sessionController.delete, 'function');
  });

  describe('#add', function () {
    it('throws an UnauthorizedError if the object is missing a username and password', function () {
      return sessionController.add({}).then(
        () => {
          assert.fail('session.add did not throw');
        },
        (err: unknown) => {
          assert.equal(err instanceof UnauthorizedError, true);
        },
      );
    });

    it('it checks the username and password and throws UnauthorizedError if it fails', function () {
      sinon.stub(models.User, 'check').rejects(new Error());

      return sessionController
        .add(
          {
            username: 'freddy@vodafone.com',
            password: 'qu33nRul35',
          },
          {},
        )
        .then(
          () => {
            assert.fail('session.add did not throw');
          },
          (err: unknown) => {
            assert.equal(err instanceof UnauthorizedError, true);
          },
        );
    });

    it('it returns a function that resets the login limiter for the request, sets req.user and calls createSession if the check works', function () {
      const fakeReq: TestRequest = {};
      const resetRequest = stubLoginReset();
      const fakeRes = {};
      const fakeNext = () => {};
      const fakeUser = models.User.forge({});
      sinon.stub(models.User, 'check').resolves(fakeUser);
      sinon.stub(models.User, 'getByEmail').resolves(fakeUser);

      const createSessionStub = sinon.stub(sessionServiceMiddleware, 'createSession');

      return sessionController
        .add({
          data: {
            username: 'freddy@vodafone.com',
            password: 'qu33nRul35',
          },
        })
        .then((fn: SessionMiddleware) => {
          return fn(fakeReq, fakeRes, fakeNext);
        })
        .then(function () {
          sinon.assert.calledOnceWithExactly(resetRequest, fakeReq);

          const createSessionStubCall = createSessionStub.getCall(0);
          assert.equal(fakeReq.user, fakeUser);
          assert.equal(createSessionStubCall.args[0], fakeReq);
          assert.equal(createSessionStubCall.args[1], fakeRes);
          assert.equal(createSessionStubCall.args[2], fakeNext);
        });
    });

    it('it returns a function that resets the login limiter for the request and calls next if reset errors', function () {
      const resetError = new Error();
      const fakeReq: TestRequest = {};
      const resetRequest = stubLoginReset(resetError);
      const fakeRes = {};
      const fakeNext = sinon.stub();
      const fakeUser = models.User.forge({});
      sinon.stub(models.User, 'check').resolves(fakeUser);
      sinon.stub(models.User, 'getByEmail').resolves(fakeUser);

      sinon.stub(sessionServiceMiddleware, 'createSession');

      return sessionController
        .add({
          data: {
            username: 'freddy@vodafone.com',
            password: 'qu33nRul35',
          },
        })
        .then((fn: SessionMiddleware) => {
          return fn(fakeReq, fakeRes, fakeNext);
        })
        .then(function () {
          sinon.assert.calledOnceWithExactly(resetRequest, fakeReq);
          sinon.assert.calledOnce(fakeNext);
          assert.equal(fakeNext.args[0][0], resetError);
        });
    });

    it('it creates a verified session when the user has not logged in before', function () {
      const fakeReq: TestRequest = {};
      const resetRequest = stubLoginReset();
      const fakeRes = {};
      const fakeNext = () => {};
      const fakeUser = models.User.forge({});
      sinon.stub(models.User, 'check').resolves(fakeUser);
      sinon.stub(models.User, 'getByEmail').resolves(fakeUser);

      const createSessionStub = sinon.stub(sessionServiceMiddleware, 'createSession');

      return sessionController
        .add({
          data: {
            username: 'freddy@vodafone.com',
            password: 'qu33nRul35',
          },
        })
        .then((fn: SessionMiddleware) => {
          return fn(fakeReq, fakeRes, fakeNext);
        })
        .then(function () {
          sinon.assert.calledOnceWithExactly(resetRequest, fakeReq);

          const createSessionStubCall = createSessionStub.getCall(0);
          assert.equal(fakeReq.user, fakeUser);
          assert.equal(createSessionStubCall.args[0], fakeReq);
          assert.equal(createSessionStubCall.args[1], fakeRes);
          assert.equal(createSessionStubCall.args[2], fakeNext);

          assert.equal(fakeReq.skipVerification, true);
        });
    });

    it('it creates a non-verified session when the user has logged in before', function () {
      const fakeReq: TestRequest = {};
      const resetRequest = stubLoginReset();
      const fakeRes = {};
      const fakeNext = () => {};
      const fakeUser = models.User.forge({ last_seen: new Date() });
      sinon.stub(models.User, 'check').resolves(fakeUser);
      sinon.stub(models.User, 'getByEmail').resolves(fakeUser);

      const createSessionStub = sinon.stub(sessionServiceMiddleware, 'createSession');

      return sessionController
        .add({
          data: {
            username: 'freddy@vodafone.com',
            password: 'qu33nRul35',
          },
        })
        .then((fn: SessionMiddleware) => {
          return fn(fakeReq, fakeRes, fakeNext);
        })
        .then(function () {
          sinon.assert.calledOnceWithExactly(resetRequest, fakeReq);

          const createSessionStubCall = createSessionStub.getCall(0);
          assert.equal(fakeReq.user, fakeUser);
          assert.equal(createSessionStubCall.args[0], fakeReq);
          assert.equal(createSessionStubCall.args[1], fakeRes);
          assert.equal(createSessionStubCall.args[2], fakeNext);

          assert.equal(fakeReq.skipVerification, false);
        });
    });
  });

  describe('#delete', function () {
    it('returns a function that calls destroySession', function () {
      const fakeReq = {};
      const fakeRes = {};
      const fakeNext = () => {};
      const logoutSessionStub = sinon.stub(sessionServiceMiddleware, 'logout');

      return sessionController
        .delete()
        .then((fn: SessionMiddleware) => {
          return fn(fakeReq, fakeRes, fakeNext);
        })
        .then(function () {
          const destroySessionStubCall = logoutSessionStub.getCall(0);
          assert.equal(destroySessionStubCall.args[0], fakeReq);
          assert.equal(destroySessionStubCall.args[1], fakeRes);
          assert.equal(destroySessionStubCall.args[2], fakeNext);
        });
    });
  });
});
