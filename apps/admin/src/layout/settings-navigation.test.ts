import { describe, expect, it } from 'vitest';
import { getSettingsReturnTo, settingsReturnToState } from './settings-navigation';

describe('getSettingsReturnTo', () => {
  it('returns the stored in-app path', () => {
    expect(getSettingsReturnTo(settingsReturnToState('/posts?type=draft#top'))).toBe(
      '/posts?type=draft#top',
    );
  });

  it('ignores missing or malformed state', () => {
    expect(getSettingsReturnTo(undefined)).toBeUndefined();
    expect(getSettingsReturnTo(null)).toBeUndefined();
    expect(getSettingsReturnTo('/posts')).toBeUndefined();
    expect(getSettingsReturnTo({ settingsReturnTo: 42 })).toBeUndefined();
  });

  it('rejects paths that are not same-app paths', () => {
    expect(getSettingsReturnTo(settingsReturnToState('posts'))).toBeUndefined();
    expect(getSettingsReturnTo(settingsReturnToState('//example.com'))).toBeUndefined();
    expect(getSettingsReturnTo(settingsReturnToState('https://example.com'))).toBeUndefined();
  });

  it('rejects paths back into Settings', () => {
    expect(getSettingsReturnTo(settingsReturnToState('/settings'))).toBeUndefined();
    expect(getSettingsReturnTo(settingsReturnToState('/settings/staff/jamie'))).toBeUndefined();
    expect(getSettingsReturnTo(settingsReturnToState('/settings?x=1'))).toBeUndefined();
    expect(getSettingsReturnTo(settingsReturnToState('/settings-archive'))).toBe(
      '/settings-archive',
    );
  });
});
