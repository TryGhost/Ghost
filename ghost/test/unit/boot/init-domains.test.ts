import assert from 'node:assert/strict';
import sinon from 'sinon';
import { loadBootFunction } from './harness';

// The harness fails on any dependency it was not given: starting the domain
// layer requires the layer and nothing else.
function createDomainsHarness() {
  const start = sinon.stub().resolves();
  const stop = sinon.stub().resolves();
  const initDomains = loadBootFunction('initDomains', {
    './bootstrap/domains': { default: { start, stop } },
  });
  return {
    init: (ghostServer?: { registerCleanupTask: sinon.SinonStub }): Promise<void> =>
      initDomains({ ghostServer }),
    start,
    stop,
  };
}

it('waits for the domain layer to start', async function () {
  const boot = createDomainsHarness();
  const ready = Promise.withResolvers<void>();
  boot.start.returns(ready.promise);
  let completed = false;
  const startup = boot.init().then(() => {
    completed = true;
  });

  try {
    await Promise.resolve();
    sinon.assert.calledOnce(boot.start);
    assert.equal(completed, false);
  } finally {
    ready.resolve();
    await startup;
  }

  assert.equal(completed, true);
});

it('fails boot when the domain layer fails to start', async function () {
  const boot = createDomainsHarness();
  const failure = new Error('a domain failed to start');
  boot.start.rejects(failure);
  const registerCleanupTask = sinon.stub();

  await assert.rejects(boot.init({ registerCleanupTask }), (error) => error === failure);
  sinon.assert.notCalled(registerCleanupTask);
});

it('stops the domain layer when the server shuts down', async function () {
  const boot = createDomainsHarness();
  const registerCleanupTask = sinon.stub();
  await boot.init({ registerCleanupTask });

  const task = registerCleanupTask.getCalls().find((call) => call.args[1] === 'Domains');
  assert.ok(task, 'Boot registers a cleanup task named Domains');
  await task.args[0]();
  sinon.assert.calledOnce(boot.stop);
});

it('starts the domain layer without a server, as tests and tooling boot it', async function () {
  const boot = createDomainsHarness();

  await boot.init();

  sinon.assert.calledOnce(boot.start);
});
