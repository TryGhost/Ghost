import assert from 'node:assert/strict';
import { createApplication } from '@tryghost/foundry/application';
import sinon from 'sinon';

// Loaded with require, as Core loads it. An import here is compiled by the test
// runner into a second copy of the module, and so a second application with its
// own config and database handle.
const application: typeof import('../../bootstrap/app').default =
  require('../../bootstrap/app').default;
const { configUtils, dbUtils } = require('../utils/e2e-framework');

// Calculated settings get a new id and timestamps each time the cache is built.
const comparable = (settings: Record<string, Record<string, unknown>>) =>
  Object.fromEntries(
    Object.entries(settings).map(([key, { id: _id, created_at: _c, updated_at: _u, ...rest }]) => [
      key,
      rest,
    ]),
  );

/**
 * Runs the first three steps of Ghost's real start sequence and nothing after
 * them: the foundation, the database, and the shared list with the real
 * modules. It shows what the shared step provides on its own, before any
 * service has started, and that a full boot afterwards changes none of it.
 */
describe('The shared step, with the real modules and nothing after it', function () {
  const settingsCache = require('../../core/shared/settings-cache');
  const labs = require('../../core/shared/labs');
  let afterShared: { settings: Record<string, unknown>; publicSettings: unknown; labs: unknown };

  beforeAll(async function () {
    // A database as a fresh install leaves it.
    await dbUtils.reset({ truncate: true });
    // The host does not allow a public site. Settings applies this while it
    // starts, and only if limits started before it.
    configUtils.set({ hostSettings: { limits: { publicSiteAccess: { disabled: true } } } });

    const { database, shared } = application.steps;
    const sharedOnly = createApplication({
      name: 'Ghost, up to the shared step',
      config: () => application.foundation.config,
      logging: () => application.foundation.logging,
      database: () => application.foundation.database,
      events: () => application.foundation.events,
      steps: { database, shared },
    });
    await sharedOnly.start(
      { backend: true, frontend: false, server: false },
      { bootLogger: { log() {}, metric() {} } },
    );

    afterShared = {
      settings: comparable(settingsCache.getAll()),
      publicSettings: settingsCache.getPublic(),
      labs: labs.getAll(),
    };
  });

  afterAll(async function () {
    sinon.restore();
    await configUtils.restore();
  });

  it('started nothing that is not shared', function () {
    const loaded = Object.keys(require.cache);
    for (const service of ['members/service', 'stripe/service', 'email-service', 'themes/index']) {
      assert.equal(
        loaded.some((file) => file.includes(`/core/server/services/${service}`)),
        false,
        `${service} was loaded by the shared step`,
      );
    }
    assert.throws(
      () => require('../../core/server/services/staff').default.service,
      /used before init/,
    );
  });

  it('has every setting, the calculated ones included', function () {
    const settings = afterShared.settings as Record<string, { value: unknown }>;
    assert.ok(Object.keys(settings).length > 100);
    for (const key of ['title', 'members_enabled', 'paid_members_enabled', 'site_uuid', 'labs']) {
      assert.ok(key in settings, `${key} is missing`);
    }
    assert.equal(typeof settings.members_enabled!.value, 'boolean');
  });

  it('made the site private because limits had started before settings', function () {
    assert.equal(settingsCache.get('is_private'), true);
    assert.match(settingsCache.get('password'), /\S/);
  });

  it('has signing keys and internal keys', function () {
    assert.ok(require('../../core/server/services/signing-keys').default.service);
    assert.ok(require('../../core/server/services/internal-keys').default.service);
  });

  it('can send mail', async function () {
    const GhostMailer = require('../../core/server/lib/mail/ghost-mailer');
    const mailer = new GhostMailer();
    const sendMail = sinon.stub(mailer.transport, 'sendMail').resolves({});

    await mailer.send({ to: 'reader@example.com', subject: 'Hello', html: '<p>Hello</p>' });

    sinon.assert.calledOnce(sendMail);
    assert.match(sendMail.firstCall.args[0].from, /@/);
  });

  it('gives settings and flags the values a full boot gives', async function () {
    const { bootGhost } = require('../../bootstrap/transition/boot');
    await bootGhost({ backend: true, frontend: false, server: false });

    assert.deepEqual(comparable(settingsCache.getAll()), afterShared.settings);
    assert.deepEqual(settingsCache.getPublic(), afterShared.publicSettings);
    assert.deepEqual(labs.getAll(), afterShared.labs);
  });
});
