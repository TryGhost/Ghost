import assert from 'node:assert/strict';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { BackoffLimiter as Limiter } from '../../../../../../../core/server/web/shared/middleware/api/backoff-limiter';
import configUtils from '../../../../../../utils/config-utils';
import type { SpamPrevention } from '../../../../../../../core/server/web/shared/middleware/api/spam-prevention';

const spamPrevention: SpamPrevention = require('../../../../../../../core/server/web/shared/middleware/api/spam-prevention');
// required, not imported, so it is the same module instance spam-prevention loads
const {
  BackoffLimiter,
} = require('../../../../../../../core/server/web/shared/middleware/api/backoff-limiter');

type FactoryName =
  | 'upgradeBlock'
  | 'upgradeApiBlock'
  | 'staffInviteBlock'
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
  | 'emailPreviewBlock';

const factories: Array<{
  name: FactoryName;
  configKey?: string;
  ignoreIP?: boolean;
  isMemoryBacked?: boolean;
}> = [
  { name: 'upgradeBlock', configKey: 'upgrade_block', ignoreIP: true },
  { name: 'upgradeApiBlock', configKey: 'upgrade_api_block' },
  { name: 'staffInviteBlock', configKey: 'staff_invite_block', ignoreIP: true },
  { name: 'globalBlock', configKey: 'global_block' },
  { name: 'globalReset', configKey: 'global_reset' },
  { name: 'userLogin', configKey: 'user_login' },
  { name: 'sendVerificationCode', configKey: 'send_verification_code' },
  { name: 'userVerification', configKey: 'user_verification' },
  { name: 'membersAuth', configKey: 'user_login' },
  { name: 'membersAuthEnumeration', configKey: 'member_login' },
  { name: 'checkoutSessionGlobal', configKey: 'checkout_session_global' },
  { name: 'checkoutSessionEmail', configKey: 'checkout_session_email', ignoreIP: true },
  { name: 'otcVerification', configKey: 'otc_verification', ignoreIP: true },
  { name: 'otcVerificationEnumeration', configKey: 'otc_verification_enumeration' },
  { name: 'userReset', configKey: 'user_reset' },
  { name: 'privateBlog', configKey: 'private_block' },
  { name: 'contentApiKey', configKey: 'content_api_key', isMemoryBacked: true },
  { name: 'webmentionsBlock' },
  { name: 'emailPreviewBlock', ignoreIP: true },
];

const build = (name: FactoryName) => spamPrevention[name]();

// the counter is private; tests read it to check which store a limiter uses
const counter = (instance: Limiter) => (instance as unknown as { count: object }).count;

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

  it('creates and caches a limiter for every factory', function () {
    for (const { name, isMemoryBacked } of factories) {
      const factory = spamPrevention[name];
      const instance = factory();

      assert(instance instanceof BackoffLimiter, `${name} returns a BackoffLimiter`);
      assert.strictEqual(factory(), instance, `${name} caches its limiter`);
      assert.equal(
        counter(instance) instanceof RateLimiterMemory,
        Boolean(isMemoryBacked),
        `${name} store`,
      );
    }
  });

  it('gives every limiter its own name, as they share one table', function () {
    const names = factories.map(({ name }) => build(name).name);

    assert.equal(new Set(names).size, names.length);
  });

  it('configures each limiter correctly', function () {
    const spam = Object.fromEntries(
      factories
        .filter(({ configKey }) => configKey)
        .map(({ configKey }, index) => [configKey, fakeSpamConfig((index + 1) * 10)]),
    );
    for (const [block, settings] of Object.entries(spam)) {
      configUtils.set(`spam:${block}`, settings);
    }

    spamPrevention.reset();

    for (const { name, configKey, ignoreIP } of factories) {
      const instance = build(name);

      assert.equal(Boolean(instance.options.ignoreIP), Boolean(ignoreIP), `${name} ignoreIP`);

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

  it('keeps upgrade and invite budgets stable when limiter construction order changes', function () {
    const firstRequestLimiter = build('upgradeBlock');
    const firstApiLimiter = build('upgradeApiBlock');
    const firstInviteLimiter = build('staffInviteBlock');

    spamPrevention.reset();
    spamPrevention.globalBlock();
    const secondInviteLimiter = build('staffInviteBlock');
    const secondApiLimiter = build('upgradeApiBlock');
    const secondRequestLimiter = build('upgradeBlock');

    assert.equal(firstRequestLimiter.name, secondRequestLimiter.name);
    assert.equal(firstApiLimiter.name, secondApiLimiter.name);
    assert.notEqual(secondRequestLimiter.name, secondApiLimiter.name);
    assert.equal(firstInviteLimiter.name, secondInviteLimiter.name);
    assert.notEqual(secondInviteLimiter.name, secondRequestLimiter.name);
  });

  it('reset clears cached limiters and reloads spam configuration', function () {
    configUtils.set('spam:content_api_key', fakeSpamConfig(10));
    spamPrevention.reset();
    const first = build('contentApiKey');

    configUtils.set('spam:content_api_key', fakeSpamConfig(20));
    spamPrevention.reset();
    const second = build('contentApiKey');

    assert.notStrictEqual(second, first);
    assert.equal(second.options.freeRetries, 20);
    assert.equal(second.options.minWait, 21);
    assert.equal(second.options.maxWait, 22);
    assert.equal(second.options.lifetime, 23);
  });

  it('keys member sign-ins and staff resets on a normalized email', function () {
    const fields = [
      ['membersAuth', 'email'],
      ['userReset', 'username'],
      ['checkoutSessionEmail', 'customerEmail'],
    ] as const;

    for (const [name, field] of fields) {
      const key = (value: string) =>
        build(name).options.key?.({ body: { [field]: value } } as never);

      assert.equal(key(' Foo@Example.com '), 'foo@example.com', name);
    }
    assert.equal(spamPrevention.emailKey(' Foo@Example.com '), 'foo@example.com');
    assert.equal(spamPrevention.emailKey(undefined), undefined);
  });
});
