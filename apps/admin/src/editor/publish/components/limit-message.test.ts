import { describe, expect, it } from 'vitest';
import {
  upgradeHref,
  upgradeHrefFromConfig,
} from '@/editor/publish/components/limit-message-helpers';

describe('upgradeHref', () => {
  it('turns an Admin route into a hash href', () => {
    expect(upgradeHref('/pro/billing/plans')).toBe('#/pro/billing/plans');
  });

  it('preserves an absolute host billing URL', () => {
    expect(upgradeHref('https://billing.example.com/upgrade')).toBe(
      'https://billing.example.com/upgrade',
    );
  });

  it('reads a validated host route from config', () => {
    expect(
      upgradeHrefFromConfig({
        config: { hostSettings: { billing: { upgradeUrl: '#/billing/plans' } } },
      }),
    ).toBe('#/billing/plans');
  });

  it('falls back when the configured upgrade URL is malformed', () => {
    expect(
      upgradeHrefFromConfig({
        config: { hostSettings: { billing: { upgradeUrl: 42 } } },
      }),
    ).toBe('#/pro');
  });

  it('falls back when the configured upgrade URL uses an unsafe scheme', () => {
    expect(
      upgradeHrefFromConfig({
        config: { hostSettings: { billing: { upgradeUrl: 'javascript:alert(1)' } } },
      }),
    ).toBe('#/pro');
  });
});
