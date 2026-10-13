import { afterAll, afterEach, beforeAll, beforeEach, describe, it, vi } from 'vitest';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import {
  GRACE_PERIOD_MS,
  PUBLISH_DELAY_MS,
  SigningKeyService,
} from '../../../core/server/services/signing-keys/signing-key-service';
import { getPublicKeyInfo } from '../../../core/server/lib/public-jwk';

const testUtils = require('../../utils');
const models = require('../../../core/server/models');
const settingsCache = require('../../../core/shared/settings-cache');

const HOUR = 60 * 60 * 1000;

function keypair(bits: number) {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: bits,
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });
}

const oldKeys = keypair(1024);
const strongKeys = keypair(2048);
const newKeys = [keypair(2048), keypair(2048)];

const silent = { info() {}, warn() {} };

describe('SigningKeyService (integration)', function () {
  let generated: number;

  const createService = ({
    cache = settingsCache,
    onRotationStarted,
  }: { cache?: typeof settingsCache; onRotationStarted?: () => Promise<void> } = {}) =>
    new SigningKeyService({
      settingsCache: cache,
      Settings: models.Settings,
      transaction: (fn) => models.Base.transaction(fn),
      logging: silent,
      generateKeypair: async () => {
        generated += 1;
        return newKeys[(generated - 1) % newKeys.length];
      },
      onRotationStarted,
    });

  // Another instance's settings cache, where some keys were synced without their timestamps
  const staleCache = (keys: string[]) => ({
    get: (key: string, options: { resolve: false }) => {
      const entry = settingsCache.get(key, options);
      return keys.includes(key) ? { ...entry, updated_at: new Date(0) } : entry;
    },
  });

  const advance = (ms: number) => vi.setSystemTime(Date.now() + ms);

  const setting = async (key: string) =>
    (await models.Base.knex('settings').where('key', key).first('value')).value;

  const edit = (values: Record<string, string | null>) =>
    models.Settings.edit(
      Object.entries(values).map(([key, value]) => ({ key, value })),
      { context: { internal: true } },
    );

  const kid = async (pem: string) => (await getPublicKeyInfo(pem)).kid;

  const publishedKids = async (service: SigningKeyService, purpose: 'members' | 'staff') =>
    (await service.forPurpose(purpose).getJwks()).keys.map((key) => key.kid);

  beforeAll(async function () {
    await testUtils.teardownDb();
    await testUtils.setup('settings')();
  });

  afterAll(testUtils.teardownDb);

  beforeEach(async function () {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.UTC(2026, 9, 1));
    generated = 0;
    await edit({
      members_private_key: oldKeys.privateKey,
      members_public_key: oldKeys.publicKey,
      ghost_private_key: strongKeys.privateKey,
      ghost_public_key: strongKeys.publicKey,
      members_next_private_key: null,
      members_previous_public_key: null,
      ghost_next_private_key: null,
      ghost_previous_public_key: null,
    });
  });

  afterEach(function () {
    vi.useRealTimers();
  });

  it('leaves 2048-bit keys alone', async function () {
    await edit({ members_private_key: strongKeys.privateKey });
    const service = createService();
    await service.check();

    assert.equal(service.isRotating(), false);
    assert.equal(generated, 0);
    assert.deepEqual(await publishedKids(service, 'staff'), [await kid(strongKeys.privateKey)]);
  });

  it('publishes a new key for a 1024-bit key without signing with it', async function () {
    const service = createService();
    await service.check();

    assert.equal(await setting('members_next_private_key'), newKeys[0].privateKey);
    assert.equal(service.isRotating(), true);

    const members = service.forPurpose('members');
    assert.equal((await members.getSigningKey()).privateKey, oldKeys.privateKey);
    assert.deepEqual(await publishedKids(service, 'members'), [
      await kid(oldKeys.privateKey),
      await kid(newKeys[0].privateKey),
    ]);
  });

  it('rotates a 2048-bit key on request', async function () {
    const service = createService();

    assert.equal(await service.rotate('staff'), true);
    assert.equal(await service.rotate('staff'), false);

    assert.equal(await setting('ghost_next_private_key'), newKeys[0].privateKey);
    assert.deepEqual(await publishedKids(service, 'staff'), [
      await kid(strongKeys.privateKey),
      await kid(newKeys[0].privateKey),
    ]);
  });

  it('publishes only one new key when instances race', async function () {
    const first = createService();
    const second = createService();

    await Promise.all([first.check(), second.check()]);

    const next = await setting('members_next_private_key');
    assert.ok(next);
    assert.equal((await publishedKids(first, 'members'))[1], await kid(next));
  });

  it('signs with the new key once it has been published long enough', async function () {
    const service = createService();
    await service.check();

    advance(PUBLISH_DELAY_MS - HOUR);
    await service.check();
    const members = service.forPurpose('members');
    assert.equal((await members.getSigningKey()).privateKey, oldKeys.privateKey);

    advance(HOUR);
    await service.check();

    const signing = await members.getSigningKey();
    assert.equal(signing.privateKey, newKeys[0].privateKey);
    assert.equal(signing.kid, await kid(newKeys[0].privateKey));

    // Settings mirror the active key so older versions keep working after a downgrade
    assert.equal(await setting('members_private_key'), newKeys[0].privateKey);
    assert.equal(await setting('members_public_key'), newKeys[0].publicKey);
    assert.equal(await setting('members_next_private_key'), null);
    assert.equal(await setting('members_previous_public_key'), oldKeys.publicKey);

    assert.deepEqual(await publishedKids(service, 'members'), [
      await kid(newKeys[0].privateKey),
      await kid(oldKeys.privateKey),
    ]);

    // The new key is 2048-bit, so no further rotation starts
    assert.equal(generated, 1);
  });

  it('promotes once when instances race', async function () {
    await createService().check();
    advance(PUBLISH_DELAY_MS);

    await Promise.all([createService().check(), createService().check()]);

    assert.equal(await setting('members_private_key'), newKeys[0].privateKey);
    assert.equal(await setting('members_previous_public_key'), oldKeys.publicKey);
    assert.equal(await setting('members_next_private_key'), null);
  });

  it('keeps verifying old tokens through the grace period, then retires the old key', async function () {
    const service = createService();
    const members = service.forPurpose('members');
    await service.check();

    const token = jwt.sign({ sub: 'member@example.com' }, oldKeys.privateKey, {
      algorithm: 'RS512',
      keyid: await kid(oldKeys.privateKey),
    });
    const tokenKid = jwt.decode(token, { complete: true })?.header.kid;
    const verify = async () =>
      jwt.verify(token, await members.getVerificationKey(tokenKid), { ignoreExpiration: true });

    advance(PUBLISH_DELAY_MS);
    await service.check();

    advance(GRACE_PERIOD_MS - 1);
    await service.check();
    assert.ok(await verify());
    assert.equal(service.isRotating(), true);

    advance(1);
    await service.check();
    assert.equal(service.isRotating(), false);
    assert.equal(await setting('members_previous_public_key'), null);
    await assert.rejects(verify, /invalid signature/);
    assert.deepEqual(await publishedKids(service, 'members'), [await kid(newKeys[0].privateKey)]);
  });

  it('does not promote early when the cached timestamp is stale', async function () {
    await createService().check();
    advance(HOUR);

    await createService({ cache: staleCache(['members_next_private_key']) }).check();

    assert.equal(await setting('members_private_key'), oldKeys.privateKey);
    assert.equal(await setting('members_next_private_key'), newKeys[0].privateKey);
  });

  it('does not retire early when the cached timestamp is stale', async function () {
    await createService().check();
    advance(PUBLISH_DELAY_MS);
    await createService().check();
    advance(HOUR);

    await createService({ cache: staleCache(['members_previous_public_key']) }).check();

    assert.equal(await setting('members_previous_public_key'), oldKeys.publicKey);
  });

  it('reports a started rotation so it can be advanced', async function () {
    const onRotationStarted = vi.fn(async () => {});
    const service = createService({ onRotationStarted });

    await service.rotate('staff');
    await service.rotate('staff');

    assert.equal(onRotationStarted.mock.calls.length, 1);
  });

  it('rotates the staff key the same way', async function () {
    await edit({ ghost_private_key: oldKeys.privateKey, ghost_public_key: oldKeys.publicKey });
    const service = createService();
    await service.check();

    advance(PUBLISH_DELAY_MS);
    await service.check();

    const signing = await service.forPurpose('staff').getSigningKey();
    assert.equal(signing.privateKey, await setting('ghost_private_key'));
    assert.notEqual(signing.privateKey, oldKeys.privateKey);
    assert.equal(await setting('ghost_previous_public_key'), oldKeys.publicKey);
  });
});
