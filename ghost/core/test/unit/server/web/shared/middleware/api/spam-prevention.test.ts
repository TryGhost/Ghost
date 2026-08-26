import ExpressBrute from 'express-brute';
import assert from 'node:assert/strict';
// @ts-expect-error This module lacks type definitions.
import configUtils from '../../../../../../utils/config-utils';
// @ts-expect-error This module lacks type definitions.
import * as spamPrevention from '../../../../../../../core/server/web/shared/middleware/api/spam-prevention';

type FactoryName =
  | 'globalBlock'
  | 'globalReset'
  | 'userLogin'
  | 'sendVerificationCode'
  | 'userVerification'
  | 'membersAuth'
  | 'membersAuthEnumeration'
  | 'checkoutSessionGlobal'
  | 'checkoutSessionEmail'
  | 'otcVerification'
  | 'otcVerificationEnumeration'
  | 'userReset'
  | 'privateBlog'
  | 'contentApiKey'
  | 'webmentionsBlock'
  | 'emailPreviewBlock'
  | 'presenceBlock'
  | 'presenceIpBlock';

const factories: Array<{
  name: FactoryName;
  configKey?: string;
  attachResetToRequest: boolean;
  isMemoryBacked?: boolean;
}> = [
  { name: 'globalBlock', configKey: 'global_block', attachResetToRequest: false },
  { name: 'globalReset', configKey: 'global_reset', attachResetToRequest: false },
  { name: 'userLogin', configKey: 'user_login', attachResetToRequest: true },
  { name: 'sendVerificationCode', configKey: 'send_verification_code', attachResetToRequest: true },
  { name: 'userVerification', configKey: 'user_verification', attachResetToRequest: true },
  { name: 'membersAuth', configKey: 'user_login', attachResetToRequest: true },
  { name: 'membersAuthEnumeration', configKey: 'member_login', attachResetToRequest: true },
  {
    name: 'checkoutSessionGlobal',
    configKey: 'checkout_session_global',
    attachResetToRequest: true,
  },
  { name: 'checkoutSessionEmail', configKey: 'checkout_session_email', attachResetToRequest: true },
  { name: 'otcVerification', configKey: 'otc_verification', attachResetToRequest: false },
  {
    name: 'otcVerificationEnumeration',
    configKey: 'otc_verification_enumeration',
    attachResetToRequest: false,
  },
  { name: 'userReset', configKey: 'user_reset', attachResetToRequest: true },
  { name: 'privateBlog', configKey: 'private_block', attachResetToRequest: false },
  {
    name: 'contentApiKey',
    configKey: 'content_api_key',
    attachResetToRequest: true,
    isMemoryBacked: true,
  },
  { name: 'webmentionsBlock', attachResetToRequest: false },
  { name: 'emailPreviewBlock', attachResetToRequest: false },
  { name: 'presenceBlock', configKey: 'presence_block', attachResetToRequest: false },
  { name: 'presenceIpBlock', configKey: 'presence_ip_block', attachResetToRequest: false },
];

const fakeSpamConfig = (seed: number) => ({
  freeRetries: seed,
  minWait: seed + 1,
  maxWait: seed + 2,
  lifetime: seed + 3,
  ignored: seed + 4,
});

describe('Spam Prevention', function () {
  afterEach(async function () {
    await configUtils.restore();
    spamPrevention.reset();
  });

  it('creates and caches an express-brute limiter for every factory', function () {
    const databaseStores = new Set<unknown>();

    for (const { name, isMemoryBacked } of factories) {
      const factory = spamPrevention[name];
      const instance = factory();

      assert(instance instanceof ExpressBrute, `${name} returns ExpressBrute`);
      assert.strictEqual(factory(), instance, `${name} caches its limiter`);

      // `store` is a property we test with, even though it's not on the types.
      const { store } = instance as any;
      if (isMemoryBacked) {
        assert(store instanceof ExpressBrute.MemoryStore, `${name} uses MemoryStore`);
      } else {
        assert(!(store instanceof ExpressBrute.MemoryStore), `${name} does not use MemoryStore`);
        databaseStores.add(store);
      }
    }

    assert.equal(databaseStores.size, 1, 'all database-backed limiters share the same store');
  });

  it('configures each limiter correctly', function () {
    const spam = Object.fromEntries(
      factories
        .filter(({ configKey }) => configKey)
        .map(({ configKey }, index) => [configKey, fakeSpamConfig((index + 1) * 10)]),
    );
    configUtils.set('spam', spam);

    spamPrevention.reset();

    for (const { name, configKey, attachResetToRequest } of factories) {
      const instance = spamPrevention[name]();

      assert.equal(
        instance.options.attachResetToRequest,
        attachResetToRequest,
        `${name} reset setting`,
      );

      if (!configKey) {
        continue;
      }

      const expected = spam[configKey];
      assert.deepEqual(
        {
          freeRetries: instance.options.freeRetries,
          minWait: instance.options.minWait,
          maxWait: instance.options.maxWait,
          lifetime: instance.options.lifetime,
        },
        {
          freeRetries: expected.freeRetries,
          minWait: expected.minWait,
          maxWait: expected.maxWait,
          lifetime: expected.lifetime,
        },
        `${name} config`,
      );
    }
  });

  it('reset clears cached limiters and reloads spam configuration', function () {
    configUtils.set('spam', { content_api_key: fakeSpamConfig(10) });
    spamPrevention.reset();
    const first = spamPrevention.contentApiKey();

    configUtils.set('spam', { content_api_key: fakeSpamConfig(20) });
    spamPrevention.reset();
    const second = spamPrevention.contentApiKey();

    assert.notStrictEqual(second, first);
    assert.equal(second.options.freeRetries, 20);
    assert.equal(second.options.minWait, 21);
    assert.equal(second.options.maxWait, 22);
    assert.equal(second.options.lifetime, 23);
  });
});
