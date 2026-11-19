import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ghost = path.resolve(__dirname, '../../..');

// What boot does first, in a process of its own so that nothing has loaded the
// legacy modules before the application: build the foundation, then compare
// what the legacy paths return with what the application holds.
const probe = `
  const application = require('./bootstrap/app').default;
  const { loggerOrigin } = require('./bootstrap/transition/legacy-logging');
  const builtOnImport = application.built();
  const foundation = application.startFoundation();
  const DomainEvents = require('@tryghost/domain-events');
  class Probe {}
  const probe = new Probe();
  let seen;
  DomainEvents.subscribe(Probe, (event) => { seen = event; });
  foundation.events.dispatch(probe);
  setImmediate(async () => {
    process.stdout.write(JSON.stringify({
      builtOnImport,
      built: application.built(),
      loggerBuiltBy: loggerOrigin(),
      config: require('./core/shared/config') === foundation.config,
      logging: require('@tryghost/logging') === foundation.logging,
      knex: require('./core/server/data/db').knex === foundation.database.knex,
      connection: require('./core/server/data/db/connection') === foundation.database.knex,
      events: seen === probe,
    }));
    await foundation.database.knex.destroy();
  });
`;

describe('Ghost application', function () {
  it('builds each foundation instance once, and the legacy paths return the same ones', function () {
    const result = spawnSync(
      process.execPath,
      ['--conditions=source', '--import=tsx', '-e', probe],
      { cwd: ghost, encoding: 'utf8', env: { ...process.env, NODE_ENV: 'testing' } },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      builtOnImport: [],
      built: ['config', 'logging', 'database', 'events'],
      loggerBuiltBy: 'application',
      config: true,
      logging: true,
      knex: true,
      connection: true,
      events: true,
    });
  }, 60_000);

  it('adopts the logger when legacy code has already built it', function () {
    // This process loaded @tryghost/logging before the application: the usual
    // case for a unit test, which never boots.
    const legacy = require('@tryghost/logging');
    const application: typeof import('../../../bootstrap/app').default =
      require('../../../bootstrap/app').default;
    assert.equal(application.foundation.logging, legacy);
    assert.equal(application.foundation.config, require('../../../core/shared/config'));
  });
});
