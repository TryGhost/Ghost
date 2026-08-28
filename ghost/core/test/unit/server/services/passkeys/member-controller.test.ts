export {};

const assert = require('node:assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const membersService = require('../../../../../core/server/services/members');
const memberController = require('../../../../../core/server/services/passkeys/member-controller');

describe('Passkey member controller', function () {
  let oldSSR: any;

  beforeEach(function () {
    oldSSR = membersService.ssr;
    membersService.ssr = {
      sessionCookieName: 'ghost-members-ssr',
      getMemberDataFromSession: sinon.stub(),
    };
  });

  afterEach(function () {
    membersService.ssr = oldSSR;
    sinon.restore();
  });

  it('converts a missing member session to an unauthorized error', async function () {
    membersService.ssr.getMemberDataFromSession.rejects(
      new errors.BadRequestError({ message: 'Cookie ghost-members-ssr not found' }),
    );
    const next = sinon.spy();

    await memberController.list({}, {}, next);

    sinon.assert.calledOnce(next);
    assert.equal(next.firstCall.args[0].errorType, 'UnauthorizedError');
  });

  it('preserves unexpected member session failures', async function () {
    const databaseError = new Error('Database unavailable');
    membersService.ssr.getMemberDataFromSession.rejects(databaseError);
    const next = sinon.spy();

    await memberController.list({}, {}, next);

    sinon.assert.calledWithExactly(next, databaseError);
  });

  it('preserves unrelated bad request failures', async function () {
    const badRequest = new errors.BadRequestError({ message: 'Upstream request failed' });
    membersService.ssr.getMemberDataFromSession.rejects(badRequest);
    const next = sinon.spy();

    await memberController.list({}, {}, next);

    sinon.assert.calledWithExactly(next, badRequest);
  });
});
