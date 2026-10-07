import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { SigningKeyService } from '../../../../../core/server/services/signing-keys/signing-key-service';

const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
});

function createService(entries: Record<string, unknown>) {
  return new SigningKeyService({
    settingsCache: { get: (key: string) => entries[key] },
    Settings: {
      findOne: async () => null,
      edit: async () => [],
    },
    transaction: (fn) => fn({} as never),
    logging: { info() {}, warn() {} },
  });
}

describe('SigningKeyService', function () {
  it('reads keys from settings cache entries in either database date format', async function () {
    const service = createService({
      members_private_key: {
        value: privateKey,
        created_at: '2026-01-01 00:00:00',
        updated_at: new Date('2026-02-01T00:00:00Z'),
      },
    });

    const { privateKey: signing } = await service.forPurpose('members').getSigningKey();

    assert.equal(signing, privateKey);
  });

  it('rejects a malformed key setting with the setting name', async function () {
    const service = createService({
      members_private_key: { value: 123, created_at: '2026-01-01 00:00:00', updated_at: null },
    });

    await assert.rejects(
      service.forPurpose('members').getSigningKey(),
      /Invalid signing key setting: members_private_key/,
    );
  });
});
