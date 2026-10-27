import { describe, expect, it } from 'vitest';
import { getSiteCardKind } from './help-site-card-kinds';

describe('getSiteCardKind', () => {
  it('only shows billing to those who can manage it', () => {
    expect(getSiteCardKind('manage-your-subscription', { canManage: true })).toBe('subscription');
    expect(getSiteCardKind('manage-your-subscription', { canManage: false })).toBeNull();
    expect(getSiteCardKind('publishing-content', { canManage: false })).toBe('schedule');
  });

  it('only offers the domain to those who can manage it, as billing owns it', () => {
    expect(getSiteCardKind('using-custom-domains', { canManage: true })).toBe('domain');
    expect(getSiteCardKind('using-custom-domains', { canManage: false })).toBeNull();
  });

  it('shows nothing for articles without a card', () => {
    expect(getSiteCardKind('posts', { canManage: true })).toBeNull();
  });
});
