import { describe, expect, it } from 'vitest';
import { isAutomationStatusActive } from './is-automation-status-active';

describe('isAutomationStatusActive', () => {
  it('returns true when status is "active"', () => {
    expect(isAutomationStatusActive('active')).toBe(true);
  });

  it('returns false when status is "inactive"', () => {
    expect(isAutomationStatusActive('inactive')).toBe(false);
  });

  it('returns false when status is "archived"', () => {
    expect(isAutomationStatusActive('archived')).toBe(false);
  });
});
