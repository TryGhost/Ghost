import assert from 'assert/strict';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import { EmailAddressService } from '../../../../../core/server/services/email-address/email-address-service';

describe('EmailAddressService', function () {
  // Helper to create service config with overrides
  const createConfig = (overrides: any = {}) => ({
    getManagedEmailEnabled: () => true,
    getSendingDomain: () => 'custom.example.com',
    getFallbackDomain: () => 'fallback.example.com',
    getDefaultEmail: () => ({ address: 'noreply@ghost.org', name: 'Ghost' }),
    getFallbackEmail: () => 'fallback@fallback.example.com',
    isValidEmailAddress: () => true,
    ...overrides,
  });

  // Helper to create service instance
  const createService = (configOverrides: any = {}) => {
    return new EmailAddressService(createConfig(configOverrides));
  };

  describe('existing policy contracts', function () {
    afterEach(function () {
      sinon.restore();
    });

    it('returns the preferred object and removes its invalid reply-to in place', function () {
      sinon.stub(logging, 'error');
      const service = createService({
        getManagedEmailEnabled: () => false,
        isValidEmailAddress: (email: string) => email !== 'invalid',
      });
      const preferred = {
        from: { address: 'editor@example.com' },
        replyTo: { address: 'invalid' },
      };

      assert.equal(service.getAddress(preferred), preferred);
      assert.equal(preferred.replyTo, undefined);
      sinon.assert.calledOnceWithExactly(
        logging.error as sinon.SinonStub,
        '[EmailAddresses] Invalid replyTo address: invalid',
      );
    });

    it('retains the requested sender as reply-to when falling back to the default', function () {
      const preferredFrom = { address: 'editor@other.example', name: 'Editor' };
      const service = createService({
        getSendingDomain: () => null,
        // Production builds a new default sender object on every call.
        getDefaultEmail: () => ({ address: 'noreply@ghost.org', name: 'Ghost' }),
      });

      const result = service.getAddress({ from: preferredFrom });

      assert.deepEqual(result, {
        from: { address: 'noreply@ghost.org', name: 'Editor' },
        replyTo: preferredFrom,
      });
    });

    it('keeps mailbox parsing distinct from validation of a configured fallback', function () {
      const service = createService({
        getFallbackEmail: () => 'invalid',
        // Reject the fallback's parsed address so applying validation would change the result.
        isValidEmailAddress: (email: string) => email !== '',
      });
      const preferred = { from: { address: 'editor@example.com' } };

      assert.deepEqual(service.getAddress(preferred, { useFallbackAddress: true }), {
        from: { address: '', name: 'invalid' },
        replyTo: preferred.from,
      });
    });

    it('propagates a live dependency failure synchronously', function () {
      const failure = new Error('settings unavailable');
      const service = createService({
        getDefaultEmail: () => {
          throw failure;
        },
      });

      assert.throws(
        () => service.getAddressFromString(''),
        (error) => error === failure,
      );
      assert.throws(
        () => service.validate('editor@example.com', 'from'),
        (error) => error === failure,
      );
    });

    it('preserves case-sensitive sender restrictions and reply-to verification', function () {
      const service = createService();
      const cases = [
        ['editor@custom.example.com', 'from', { allowed: true, verificationEmailRequired: false }],
        [
          'editor@CUSTOM.example.com',
          'from',
          { allowed: false, verificationEmailRequired: false, reason: 'not allowed' },
        ],
        [
          'noreply@ghost.org',
          'from',
          { allowed: true, verificationEmailRequired: false, reason: 'not allowed' },
        ],
        [
          'NOREPLY@ghost.org',
          'from',
          { allowed: false, verificationEmailRequired: false, reason: 'not allowed' },
        ],
        ['editor@other.example', 'replyTo', { allowed: true, verificationEmailRequired: true }],
        ['noreply@ghost.org', 'replyTo', { allowed: true, verificationEmailRequired: false }],
      ] as const;

      for (const [email, type, expected] of cases) {
        assert.deepEqual(service.validate(email, type), expected, `${type}: ${email}`);
      }
    });

    it('allows the invalid default verbatim without allowing a case variant', function () {
      const service = createService({
        getDefaultEmail: () => ({ address: 'noreply@LOCALHOST' }),
        isValidEmailAddress: () => false,
      });

      assert.deepEqual(service.validate('noreply@LOCALHOST', 'from'), {
        allowed: true,
        verificationEmailRequired: false,
        reason: 'invalid',
      });
      assert.deepEqual(service.validate('noreply@localhost', 'from'), {
        allowed: false,
        verificationEmailRequired: false,
        reason: 'invalid',
      });
    });
  });

  describe('getMembersSupportAddress', function () {
    it('uses the current default address until the support domain is allowed', function () {
      let sendingDomain = 'other.example.com';
      let defaultAddress = 'noreply@first.example.com';
      const service = createService({
        getMembersSupportAddress: () => 'support@custom.example.com',
        getSendingDomain: () => sendingDomain,
        getDefaultEmail: () => ({ address: defaultAddress, name: 'Ghost' }),
      });

      assert.equal(service.getMembersSupportAddress(), 'noreply@first.example.com');

      defaultAddress = 'noreply@second.example.com';
      assert.equal(service.getMembersSupportAddress(), 'noreply@second.example.com');

      sendingDomain = 'custom.example.com';
      assert.equal(service.getMembersSupportAddress(), 'support@custom.example.com');
    });
  });

  describe('getAddress with fallback domain', function () {
    it('uses fallback address when useFallbackAddress is true', function () {
      const service = createService();

      const result = service.getAddress(
        {
          from: { address: 'custom@custom.example.com', name: 'Custom Sender' },
        },
        { useFallbackAddress: true },
      );

      assert.equal(result.from.address, 'fallback@fallback.example.com');
      assert.equal(result.from.name, 'Custom Sender');
      assert.equal(result.replyTo?.address, 'custom@custom.example.com');
      assert.equal(result.replyTo?.name, 'Custom Sender');
    });

    it('does not use fallback address when useFallbackAddress is false', function () {
      const service = createService();

      const result = service.getAddress(
        {
          from: { address: 'custom@custom.example.com', name: 'Custom Sender' },
        },
        { useFallbackAddress: false },
      );

      assert.equal(result.from.address, 'custom@custom.example.com');
      assert.equal(result.from.name, 'Custom Sender');
      assert.equal(result.replyTo, undefined);
    });

    it('does not use fallback address when fallback email is not configured', function () {
      const service = createService({
        getFallbackEmail: () => null,
      });

      const result = service.getAddress(
        {
          from: { address: 'custom@custom.example.com', name: 'Custom Sender' },
        },
        { useFallbackAddress: true },
      );

      // Should fall back to normal behavior when fallback not configured
      assert.equal(result.from.address, 'custom@custom.example.com');
      assert.equal(result.from.name, 'Custom Sender');
      assert.equal(result.replyTo, undefined);
    });

    it('preserves existing replyTo when using fallback address', function () {
      const service = createService();

      const result = service.getAddress(
        {
          from: { address: 'custom@custom.example.com', name: 'Custom Sender' },
          replyTo: { address: 'support@custom.example.com', name: 'Support' },
        },
        { useFallbackAddress: true },
      );

      assert.equal(result.from.address, 'fallback@fallback.example.com');
      assert.equal(result.from.name, 'Custom Sender');
      assert.equal(result.replyTo?.address, 'support@custom.example.com');
      assert.equal(result.replyTo?.name, 'Support');
    });

    it('sets fallback from name to default email name when preferred from has no name', function () {
      const service = createService();

      const result = service.getAddress(
        {
          from: { address: 'custom@custom.example.com' },
        },
        { useFallbackAddress: true },
      );

      assert.equal(result.from.address, 'fallback@fallback.example.com');
      assert.equal(result.from.name, 'Ghost');
      assert.equal(result.replyTo?.address, 'custom@custom.example.com');
    });

    it('preserves fallback email name when already set', function () {
      const service = createService({
        getFallbackEmail: () => '"Fallback Sender" <fallback@fallback.example.com>',
      });

      const result = service.getAddress(
        {
          from: { address: 'custom@custom.example.com', name: 'Custom Sender' },
        },
        { useFallbackAddress: true },
      );

      assert.equal(result.from.address, 'fallback@fallback.example.com');
      assert.equal(result.from.name, 'Fallback Sender');
      assert.equal(result.replyTo?.address, 'custom@custom.example.com');
      assert.equal(result.replyTo?.name, 'Custom Sender');
    });
  });

  describe('getAddress with invalid replyTo', function () {
    afterEach(function () {
      sinon.restore();
    });

    it('warns instead of erroring when the invalid replyTo matches the default from address', function () {
      const errorLog = sinon.stub(logging, 'error');
      const warnLog = sinon.stub(logging, 'warn');

      const service = createService({
        getDefaultEmail: () => ({ address: 'noreply@127.0.0.1', name: 'Ghost' }),
        isValidEmailAddress: (email: string) => email.toLowerCase() !== 'noreply@127.0.0.1',
      });

      const result = service.getAddress({
        from: { address: 'custom@custom.example.com', name: 'Custom Sender' },
        replyTo: { address: 'noreply@127.0.0.1', name: 'Ghost' },
      });

      assert.equal(result.replyTo, undefined);
      sinon.assert.notCalled(errorLog);
      sinon.assert.calledOnce(warnLog);
    });

    it('warns instead of erroring when the invalid replyTo is a case variant of the default from address', function () {
      const errorLog = sinon.stub(logging, 'error');
      const warnLog = sinon.stub(logging, 'warn');

      const service = createService({
        getDefaultEmail: () => ({ address: 'noreply@127.0.0.1', name: 'Ghost' }),
        isValidEmailAddress: (email: string) => email.toLowerCase() !== 'noreply@127.0.0.1',
      });

      const result = service.getAddress({
        from: { address: 'custom@custom.example.com', name: 'Custom Sender' },
        replyTo: { address: 'NoReply@127.0.0.1', name: 'Ghost' },
      });

      assert.equal(result.replyTo, undefined);
      sinon.assert.notCalled(errorLog);
      sinon.assert.calledOnce(warnLog);
    });

    it('logs an error when an invalid replyTo does not match the default from address', function () {
      const errorLog = sinon.stub(logging, 'error');
      const warnLog = sinon.stub(logging, 'warn');

      const service = createService({
        isValidEmailAddress: (email: string) => email !== 'not-an-email',
      });

      const result = service.getAddress({
        from: { address: 'custom@custom.example.com', name: 'Custom Sender' },
        replyTo: { address: 'not-an-email', name: 'Bad' },
      });

      assert.equal(result.replyTo, undefined);
      sinon.assert.calledOnce(errorLog);
      sinon.assert.notCalled(warnLog);
    });
  });

  describe('fallbackDomain getter', function () {
    it('returns the fallback domain', function () {
      const service = createService();

      assert.equal(service.fallbackDomain, 'fallback.example.com');
    });

    it('returns null when not configured', function () {
      const service = createService({
        getFallbackDomain: () => null,
      });

      assert.equal(service.fallbackDomain, null);
    });
  });

  describe('fallbackEmail getter', function () {
    it('returns the parsed fallback email', function () {
      const service = createService({
        getFallbackEmail: () => '"Fallback" <fallback@fallback.example.com>',
      });

      assert.equal(service.fallbackEmail?.address, 'fallback@fallback.example.com');
      assert.equal(service.fallbackEmail?.name, 'Fallback');
    });

    it('returns null when not configured', function () {
      const service = createService({
        getFallbackEmail: () => null,
      });

      assert.equal(service.fallbackEmail, null);
    });
  });
});
