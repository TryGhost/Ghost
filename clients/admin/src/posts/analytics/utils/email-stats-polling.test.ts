import { afterEach, describe, expect, it, vi } from 'vitest';
import { getEmailStatsRefetchInterval } from '@/posts/analytics/utils/email-stats-polling';

describe('getEmailStatsRefetchInterval', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps polling when the browser clock is behind the send timestamp', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-16T12:00:00Z'));
    expect(getEmailStatsRefetchInterval({ submitted_at: '2026-09-16T12:00:10Z' })).toBe(5000);
  });

  it('slows polling at the one-hour boundary', () => {
    const sentAt = '2026-09-16T12:00:00Z';
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(Date.parse(sentAt) + 3600000 - 1);
    expect(getEmailStatsRefetchInterval({ submitted_at: sentAt })).toBe(5000);
    now.mockReturnValue(Date.parse(sentAt) + 3600000);
    expect(getEmailStatsRefetchInterval({ submitted_at: sentAt })).toBe(30000);
  });

  it('stops polling at the three-day boundary', () => {
    const submittedAt = '2026-09-16T12:00:00Z';
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(Date.parse(submittedAt) + 3 * 24 * 60 * 60 * 1000 - 1);
    expect(getEmailStatsRefetchInterval({ submitted_at: submittedAt })).toBe(30000);
    now.mockReturnValue(Date.parse(submittedAt) + 3 * 24 * 60 * 60 * 1000);
    expect(getEmailStatsRefetchInterval({ submitted_at: submittedAt })).toBe(false);
  });

  it('does not poll failed sends', () => {
    const submittedAt = '2026-09-16T12:00:00Z';
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(submittedAt));

    expect(getEmailStatsRefetchInterval({ submitted_at: submittedAt, status: 'failed' })).toBe(
      false,
    );
  });

  it('does not poll without a valid send timestamp', () => {
    expect(getEmailStatsRefetchInterval()).toBe(false);
    expect(getEmailStatsRefetchInterval(null)).toBe(false);
    expect(getEmailStatsRefetchInterval({ submitted_at: 'invalid' })).toBe(false);
  });
});
