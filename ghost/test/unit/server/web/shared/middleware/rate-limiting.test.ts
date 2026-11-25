import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { RateLimiting } from '../../../../../../core/server/web/shared/middleware/rate-limiting';

// required, not imported, so they are the module instances each other loads
const rateLimiting: RateLimiting = require('../../../../../../core/server/web/shared/middleware/rate-limiting');
const spamPrevention = require('../../../../../../core/server/web/shared/middleware/api/spam-prevention');

type Middleware = (req: unknown, res: unknown, next: (err?: unknown) => void) => void;

/** Stubs a limiter so its middleware calls next straight away. */
const stubLimiter = (name: string) => {
  const middleware = sinon.stub().callsFake((_req, _res, next) => next());
  const resetRequest = sinon.stub().resolves();
  sinon.stub(spamPrevention, name).returns({ middleware, resetRequest });
  return { middleware, resetRequest };
};

describe('rate limiting middleware', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('runs the matching limiter', function () {
    const { middleware } = stubLimiter('checkoutSessionGlobal');
    const next = sinon.stub();

    (rateLimiting.checkoutSessionGlobal as Middleware)({}, {}, next);

    sinon.assert.calledOnce(middleware);
    sinon.assert.calledOnceWithExactly(next);
  });

  it('skips checkoutSessionEmail without an email', function () {
    const { middleware } = stubLimiter('checkoutSessionEmail');
    const next = sinon.stub();

    (rateLimiting.checkoutSessionEmail as Middleware)({ body: {} }, {}, next);
    sinon.assert.notCalled(middleware);
    sinon.assert.calledOnce(next);

    (rateLimiting.checkoutSessionEmail as Middleware)(
      { body: { customerEmail: 'test@example.com' } },
      {},
      next,
    );
    sinon.assert.calledOnce(middleware);
  });

  it('resets contentApiKey once a request succeeds', function () {
    const { resetRequest } = stubLimiter('contentApiKey');
    const listeners: Record<string, () => void> = {};
    const req = {};
    const res = {
      statusCode: 200,
      on: (event: string, listener: () => void) => {
        listeners[event] = listener;
      },
    };

    (rateLimiting.contentApiKey as Middleware)(req, res, sinon.stub());
    sinon.assert.notCalled(resetRequest);

    listeners.finish!();
    sinon.assert.calledOnceWithExactly(resetRequest, req);
  });

  it('does not reset contentApiKey after a failed request', function () {
    const { resetRequest } = stubLimiter('contentApiKey');
    const listeners: Record<string, () => void> = {};
    const res = {
      statusCode: 401,
      on: (event: string, listener: () => void) => {
        listeners[event] = listener;
      },
    };

    (rateLimiting.contentApiKey as Middleware)({}, res, sinon.stub());
    listeners.finish!();

    sinon.assert.notCalled(resetRequest);
  });
});
