import { describe, it, expect } from 'vitest';
import { getReadyAtForAction } from '../../../../../../core/server/services/automations/util/get-ready-at-for-action';

describe('getReadyAtForAction', () => {
  const now = new Date('2026-01-01T10:00:00.000Z');

  describe('for send_email actions', () => {
    it('returns now', () => {
      const result = getReadyAtForAction({ type: 'send_email' }, now, null);
      expect(result).toEqual(now);
    });
  });

  describe('for wait actions', () => {
    it('returns a time N hours from now', () => {
      const result = getReadyAtForAction({ type: 'wait', wait_hours: 2 }, now, null);
      expect(result).toEqual(new Date('2026-01-01T12:00:00.000Z'));
    });

    it('can override how long an hour is', () => {
      const result = getReadyAtForAction({ type: 'wait', wait_hours: 3 }, now, 1000);
      expect(result).toEqual(new Date(now.getTime() + 3000));
    });

    it('falls back to hours if fake-hour override is 0', () => {
      const result = getReadyAtForAction({ type: 'wait', wait_hours: 2 }, now, 0);
      expect(result).toEqual(new Date('2026-01-01T12:00:00.000Z'));
    });
  });
});
