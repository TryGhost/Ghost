import assert from 'node:assert/strict';
import path from 'node:path';
import { loadBootFunction } from '../unit/boot/harness';

const { fixtureManager } = require('../utils/e2e-framework');

const core = path.resolve(__dirname, '../../core');

// A boot step run with the real modules it requires, and nothing else of boot.
function step(name: string) {
  return loadBootFunction(
    name,
    {},
    {
      fallback: (dependency) =>
        require(dependency.startsWith('.') ? path.resolve(core, dependency) : dependency),
    },
  );
}

// Isolated: this starts part of Ghost by hand, in a process nothing has booted.
describe('Boot layers, with the real modules', function () {
  beforeAll(async function () {
    await fixtureManager.restore();
    const config = require('../../core/shared/config');
    await step('initFoundationChecks')({ config });
    await step('initShared')({ config });
    await step('initDomains')({});
  });

  afterAll(async function () {
    await require('../../bootstrap/domains').default.stop();
  });

  it('starts the domain layer on the shared layer alone', async function () {
    const recommendations = require('../../domains/network/services/recommendations').default;
    const {
      listWellKnownRecommendations,
    } = require('../../domains/network/actions/list-well-known-recommendations.action');

    assert.ok(recommendations.service.controller);
    assert.deepEqual(await listWellKnownRecommendations(), []);
  });

  it('has started none of the services a domain reaches only when it is used', function () {
    const mentions = require('../../core/server/services/mentions').default;
    const staff = require('../../core/server/services/staff').default;

    assert.throws(() => mentions.service, /Mentions used before init\(\)/);
    assert.throws(() => staff.service, /Staff used before init\(\)/);
  });

  it('can send mail once the shared layer has started', async function () {
    const { GhostMailer } = require('../../core/server/lib/mail');
    const mailer = new GhostMailer();
    const sent: { from?: string }[] = [];
    mailer.transport = {
      sendMail: async (message: { from?: string }) => {
        sent.push(message);
        return { message: 'sent' };
      },
    };

    await mailer.send({ to: 'reader@example.com', subject: 'Hello', html: '<p>Hello</p>' });

    assert.equal(sent.length, 1);
    assert.match(String(sent[0]!.from), /noreply@/);
  });

  it('gives every setting, calculated ones included, the value it has after a full boot', function () {
    const settingsCache = require('../../core/shared/settings-cache');

    // Calculated settings read limits, labs and config. None may need a later service.
    for (const key of [
      'members_enabled',
      'paid_members_enabled',
      'donations_enabled',
      'default_email_address',
      'support_email_address',
      'all_blocked_email_domains',
    ]) {
      assert.notEqual(settingsCache.get(key), undefined, `${key} has a value`);
    }
    assert.equal(settingsCache.get('default_email_address'), 'noreply@127.0.0.1');
  });
});
