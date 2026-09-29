import { describe, expect, it } from 'vitest';
import {
  DUNNING_PAY_RETURN_ROUTE_STORAGE_KEY,
  DUNNING_PAYMENT_SETTLED_STORAGE_KEY,
  parseDunningConfig,
} from '../../../src/api/dunning';

const validConfig = {
  active: true,
  paymentFailedAt: '2026-09-01T00:00:00Z',
  suspendsAt: '2026-09-29T00:00:00Z',
};

describe('parseDunningConfig', () => {
  it.each([
    undefined,
    null,
    { active: true },
    { ...validConfig, active: false },
    { ...validConfig, active: 'false' },
    { ...validConfig, paymentFailedAt: 'invalid' },
    { ...validConfig, paymentFailedAt: 1 },
    { ...validConfig, suspendsAt: true },
    { ...validConfig, suspendsAt: validConfig.paymentFailedAt },
    { ...validConfig, suspendsAt: '2026-08-01' },
  ])('rejects unusable host config: %j', (config) => {
    expect(parseDunningConfig(config)).toBeNull();
  });

  it('pins the storage keys both apps handshake through', () => {
    // These literals are the on-the-wire contract between the React admin and
    // the Ember billing service; renaming the constants must not change them.
    expect(DUNNING_PAY_RETURN_ROUTE_STORAGE_KEY).toBe('ghost-dunning-pay-return-route');
    expect(DUNNING_PAYMENT_SETTLED_STORAGE_KEY).toBe('ghost-dunning-payment-settled-for');
  });

  it('parses valid dates, including host timezone offsets', () => {
    expect(
      parseDunningConfig({ ...validConfig, paymentFailedAt: '2026-09-01T04:00:00+04:00' }),
    ).toEqual({
      active: true,
      paymentFailedAt: new Date(validConfig.paymentFailedAt),
      suspendsAt: new Date(validConfig.suspendsAt),
    });
  });
});
