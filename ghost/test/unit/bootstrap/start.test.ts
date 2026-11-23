import assert from 'node:assert/strict';
import sinon from 'sinon';
import { loadBootstrapFile } from '../boot/harness';

const {
  everyEntry,
  startList,
}: typeof import('../../../bootstrap/start') = require('../../../bootstrap/start');

type Entry = (typeof everyEntry)[number];
type Run = Parameters<Entry['run']>[0];

const names = (entries: readonly Entry[]) => entries.map((entry) => entry.name);
const position = (name: string) => {
  const index = names(everyEntry).indexOf(name);
  assert.notEqual(index, -1, `The start list has no entry named "${name}"`);
  return index;
};

// The entries, with what they require answered by the test.
function loadEntries(modules: Record<string, unknown>) {
  const loaded = loadBootstrapFile('transition/steps.ts', modules, {
    globals: { process: { on: sinon.stub() } },
  }) as unknown as { entries: Record<string, Entry> };
  return loaded.entries;
}

function fakeRun(state: Record<string, unknown> = {}) {
  const run = {
    foundation: {
      config: { get: sinon.stub(), getSubdir: () => '/blog' },
      logger: { error: sinon.stub(), warn: sinon.stub() },
    },
    services: { register: sinon.stub(), open: sinon.stub(), start: sinon.stub().resolves() },
    state: {
      options: { backend: true, frontend: true, server: true, roles: ['web', 'worker'] },
      ...state,
    },
    onStop: sinon.stub(),
    stop: sinon.stub().resolves(),
  };
  return run as typeof run & Run;
}

describe("Ghost's start list", function () {
  it('names each entry once, says whether it is framework or earmarked, and what removes it', function () {
    assert.equal(new Set(names(everyEntry)).size, everyEntry.length);
    for (const entry of everyEntry) {
      assert.ok(['framework', 'earmarked'].includes(entry.kind), entry.name);
      assert.ok(entry.leavesWhen.length > 20, `${entry.name} does not say what removes it`);
    }
  });

  it('keeps the framework entries to the ones a stateless Ghost would still run', function () {
    assert.deepEqual(names(everyEntry.filter((entry) => entry.kind === 'framework')), [
      'register the service roots that listen',
      'settings: load',
      'services: allow building',
      'dynamic routers: register',
      'lift maintenance',
      'service roots with background work',
    ]);
  });

  it('listens in maintenance mode before the database is touched or anything is registered', function () {
    const server = position('HTTP server, in maintenance mode');
    assert.ok(server < position('register the service roots that listen'));
    assert.ok(server < position('database: check the schema state, and migrate'));
  });

  it('registers the listening roots before services can be built, and allows building only once settings are loaded', function () {
    assert.ok(
      position('register the service roots that listen') < position('services: allow building'),
    );
    assert.ok(position('limits') < position('settings: load'));
    assert.ok(position('settings: load') < position('services: allow building'));
    assert.ok(
      position('services: allow building') < position('signing keys: advance a due rotation'),
    );
    assert.ok(position('services: allow building') < position('Better Auth, under its engine'));
  });

  it('registers the dynamic routers after the Express apps and lifts maintenance last of the boot entries', function () {
    assert.ok(position('Express apps') < position('dynamic routers: register'));
    assert.ok(position('dynamic routers: register') < position('lift maintenance'));
    assert.ok(
      position('legacy services, job handlers and the job runner') < position('lift maintenance'),
    );
    assert.ok(position('lift maintenance') < position('announce that Ghost is ready'));
    assert.ok(
      position('announce that Ghost is ready') < position('service roots with background work'),
    );
    assert.ok(position('announce that Ghost is ready') < position('background work'));
  });

  it('gives a process with both roles every entry, and one without the worker role none of the background work', function () {
    assert.deepEqual(startList({ roles: ['web', 'worker'] }), everyEntry);

    const web = names(startList({ roles: ['web'] }));
    assert.deepEqual(
      names(everyEntry).filter((name) => !web.includes(name)),
      ['service roots with background work', 'background work'],
    );
  });

  it('loads no entry until it runs', function () {
    const required: string[] = [];
    loadBootstrapFile(
      'transition/steps.ts',
      {},
      {
        fallback: (name) => {
          required.push(name);
          return {};
        },
      },
    );

    assert.deepEqual(required, []);
  });
});

describe('Entries of the start list', function () {
  it('registers every listening root and builds none', function () {
    const roots = [{ name: 'First' }, { name: 'Second' }];
    const entries = loadEntries({ '../services': { listening: roots.map((root) => () => root) } });
    const run = fakeRun();

    entries.registerServices!.run(run);

    assert.deepEqual(
      run.services.register.getCalls().map((call) => call.args),
      roots.map((root) => [root]),
    );
    sinon.assert.notCalled(run.services.open);
  });

  it('awaits the signing keys start through the application', async function () {
    const signingKeys = { name: 'Signing keys' };
    const entries = loadEntries({ './server/services/signing-keys': { default: signingKeys } });
    const run = fakeRun();
    const failure = new Error('Key check failed');
    run.services.start.rejects(failure);

    await assert.rejects(
      Promise.resolve(entries.signingKeys!.run(run)),
      (thrown) => thrown === failure,
    );

    sinon.assert.calledOnceWithExactly(run.services.start, signingKeys);
  });

  it('starts Better Auth only under its engine, and fails the start when it fails', async function () {
    const betterAuth = { start: sinon.stub().resolves() };
    const auth = { isBetterAuth: false, betterAuth };
    const entries = loadEntries({ './server/auth': auth });

    await entries.betterAuth!.run(fakeRun());
    sinon.assert.notCalled(betterAuth.start);

    auth.isBetterAuth = true;
    const failure = new Error('Better Auth setup failed');
    betterAuth.start.rejects(failure);
    await assert.rejects(
      Promise.resolve(entries.betterAuth!.run(fakeRun())),
      (thrown) => thrown === failure,
    );
  });

  it('loads translations after signing keys, and fails the start when they fail', async function () {
    assert.ok(position('signing keys: advance a due rotation') < position('i18n'));
    const failure = new Error('i18n initialization failed');
    const i18n = { init: sinon.stub().rejects(failure) };
    const events = {};
    const entries = loadEntries({ './shared/i18n': i18n, './server/lib/common/events': events });

    await assert.rejects(
      Promise.resolve(entries.i18n!.run(fakeRun())),
      (thrown) => thrown === failure,
    );

    sinon.assert.calledOnceWithExactly(i18n.init, { events });
  });

  it('loads offers after the active theme, and fails the start when offers fails', async function () {
    assert.ok(position('themes: load the active theme') < position('offers'));
    const failure = new Error('Offers failed to load');
    const offers = { init: sinon.stub().rejects(failure) };
    const entries = loadEntries({ './server/services/offers': offers });

    await assert.rejects(
      Promise.resolve(entries.offers!.run(fakeRun())),
      (thrown) => thrown === failure,
    );
  });

  it('loads settings and then syncs the email settings', async function () {
    const settings = { init: sinon.stub().resolves(), syncEmailSettings: sinon.stub().resolves() };
    const entries = loadEntries({ './server/services/settings/settings-service': settings });
    const run = fakeRun();
    run.foundation.config.get.withArgs('hostSettings:emailVerification:verified').returns(true);

    await entries.settings!.run(run);

    sinon.assert.callOrder(settings.init, settings.syncEmailSettings);
    sinon.assert.calledOnceWithExactly(settings.syncEmailSettings, true);
  });

  it('starts each background root, and logs one that fails without stopping the rest', async function () {
    const roots = [{ name: 'First' }, { name: 'Second' }];
    const entries = loadEntries({ '../services': { background: roots.map((root) => () => root) } });
    const run = fakeRun();
    const failure = new Error('Could not start');
    run.services.start.onFirstCall().rejects(failure);

    await entries.backgroundServiceStarts!.run(run);

    assert.deepEqual(
      run.services.start.getCalls().map((call) => call.args),
      roots.map((root) => [root]),
    );
    sinon.assert.calledOnceWithExactly(run.foundation.logger.error, failure);
  });

  it('stops the job runner with the application only when a server can stop it', function () {
    const jobs = { shutdown: sinon.stub().resolves() };
    const entries = loadEntries({ './server/services/jobs-service': jobs });

    const withoutServer = fakeRun();
    entries.jobsShutdown!.run(withoutServer);
    sinon.assert.notCalled(withoutServer.onStop);

    const withServer = fakeRun({ ghostServer: {} });
    withServer.foundation.config.get.withArgs('server:shutdownTimeout').returns(5000);
    entries.jobsShutdown!.run(withServer);
    sinon.assert.calledOnce(withServer.onStop);
    withServer.onStop.firstCall.args[1]();
    sinon.assert.calledOnceWithExactly(jobs.shutdown, { timeoutMs: 5000 });
  });

  it('lifts maintenance by mounting the Ghost app under the subdirectory', function () {
    const entries = loadEntries({});
    const rootApp = { disable: sinon.stub(), use: sinon.stub() };
    const ghostApp = {};

    entries.liftMaintenance!.run(fakeRun({ rootApp, ghostApp }));

    sinon.assert.calledOnceWithExactly(rootApp.disable, 'maintenance');
    sinon.assert.calledOnceWithExactly(rootApp.use, '/blog', ghostApp);
  });

  it('refuses an entry that needs what no earlier entry made', function () {
    const entries = loadEntries({
      '@tryghost/errors': require('@tryghost/errors'),
    });

    assert.throws(() => entries.liftMaintenance!.run(fakeRun()), {
      message: 'No earlier entry of the start made rootApp.',
    });
  });
});
