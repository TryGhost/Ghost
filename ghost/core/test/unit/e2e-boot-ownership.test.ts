import assert from 'node:assert/strict';
import sinon from 'sinon';
import { startGhost } from '../utils/e2e-framework';

const { rememberGhost, stopGhost } = require('../utils/e2e-utils');

describe('E2E boot ownership', function () {
  it('shares the previous boot between imported and required test helpers', async function () {
    const failure = new Error('The previous boot could not stop');
    const app = Object.assign(() => {}, { stop: sinon.stub().rejects(failure) });
    const domainEvents = require('@tryghost/domain-events');
    const nextStage = sinon
      .stub(domainEvents, 'allSettled')
      .throws(new Error('Started a new boot'));
    rememberGhost(app);

    try {
      await assert.rejects(startGhost(), (error) => error === failure);
      sinon.assert.calledOnce(app.stop);
      sinon.assert.notCalled(nextStage);
    } finally {
      nextStage.restore();
      app.stop.resolves();
      await stopGhost();
    }
  });

  it('stops and forgets a no-server boot after cleanup succeeds', async function () {
    const app = Object.assign(() => {}, { stop: sinon.stub().resolves() });
    rememberGhost(app);

    await stopGhost();
    await stopGhost();

    sinon.assert.calledOnce(app.stop);
  });

  it('keeps the same no-server boot available when cleanup fails', async function () {
    const failure = new Error('Could not stop the previous boot');
    const app = Object.assign(() => {}, { stop: sinon.stub().rejects(failure) });
    rememberGhost(app);

    try {
      await assert.rejects(stopGhost(), (error) => error === failure);
      app.stop.resolves();
      await stopGhost();
      await stopGhost();

      sinon.assert.calledTwice(app.stop);
    } finally {
      app.stop.resolves();
      await stopGhost();
    }
  });

  it('does not repeat cleanup for a real server already stopped by its caller', async function () {
    const server = { httpServer: null, stop: sinon.stub().resolves() };
    rememberGhost(server);

    await stopGhost();

    sinon.assert.notCalled(server.stop);
  });
});
