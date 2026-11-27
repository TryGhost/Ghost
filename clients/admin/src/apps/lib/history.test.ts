import { describe, expect, it } from 'vitest';
import type { AppInstallationHistoryEntry } from '@tryghost/admin-x-framework/api/app-installations';
import { historyTitle } from './history';

const entry = (
  event: AppInstallationHistoryEntry['event'],
  overrides: Partial<AppInstallationHistoryEntry> = {},
): AppInstallationHistoryEntry => ({
  id: `${event}-1`,
  event,
  actor: null,
  created_at: '2026-10-01T10:00:00.000Z',
  ...overrides,
});

describe('historyTitle', () => {
  it('puts each event in a few words', () => {
    expect(historyTitle(entry('installed'))).toBe('Installed');
    expect(historyTitle(entry('updated'))).toBe('Updated');
    expect(historyTitle(entry('suspended'))).toBe('Updated, needs approval');
    expect(historyTitle(entry('resumed'))).toBe('Resumed, changes withdrawn');
    expect(historyTitle(entry('changes_approved'))).toBe('Changes approved');
    expect(historyTitle(entry('uninstalled'))).toBe('Uninstalled');
  });

  it('still calls an event it has no words for a change', () => {
    expect(historyTitle(entry('refreshed' as AppInstallationHistoryEntry['event']))).toBe(
      'Changed',
    );
  });

  it('says where an approval moved the app to', () => {
    expect(historyTitle(entry('changes_approved', { moved_to: 'podcast.example.net' }))).toBe(
      'Moved to podcast.example.net',
    );
  });
});
