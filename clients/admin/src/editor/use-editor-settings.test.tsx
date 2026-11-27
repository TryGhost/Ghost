import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEditorSettings, useSiteTimezone } from './use-editor-settings';

const mocks = vi.hoisted(() => ({
  useBrowseSettings: vi.fn(() => ({ data: { settings: [] as Array<Record<string, unknown>> } })),
}));

vi.mock('@tryghost/admin-x-framework/api/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tryghost/admin-x-framework/api/settings')>();
  return {
    ...actual,
    useBrowseSettings: mocks.useBrowseSettings,
  };
});

function withSettings(settings: Array<Record<string, unknown>>) {
  mocks.useBrowseSettings.mockReturnValue({ data: { settings } });
}

describe('useEditorSettings', () => {
  it('reads the shared settings key without the global error handler or the redirect', () => {
    withSettings([]);

    renderHook(() => useEditorSettings());

    expect(mocks.useBrowseSettings).toHaveBeenCalledWith({
      defaultErrorHandler: false,
      requestOptions: { sessionExpiryRedirect: false },
    });
  });
});

describe('useSiteTimezone', () => {
  it('reads the site timezone setting', () => {
    withSettings([{ key: 'timezone', value: 'Europe/Amsterdam' }]);

    expect(renderHook(() => useSiteTimezone()).result.current).toBe('Europe/Amsterdam');
  });

  it.each([
    ['absent', []],
    ['empty', [{ key: 'timezone', value: '' }]],
    ['not a string', [{ key: 'timezone', value: 42 }]],
  ])('falls back to UTC when the setting is %s', (_name, settings) => {
    withSettings(settings);

    expect(renderHook(() => useSiteTimezone()).result.current).toBe('Etc/UTC');
  });
});
