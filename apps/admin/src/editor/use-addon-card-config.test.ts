import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Setting } from '@tryghost/admin-x-framework/api/settings';
import { useAddonCardConfig } from './use-addon-card-config';

const manifest = {
  name: 'Events',
  handle: 'events',
  version: '2',
  api_version: '2026-01',
  targeting: [],
  editor: { content: { bundle: './content.js' }, blocks: [{ name: 'event', label: 'Event' }] },
};
const settings: Setting[] = [
  {
    key: 'addons',
    value: JSON.stringify([
      {
        handle: 'events',
        name: 'Events',
        enabled: true,
        version: '1',
        apiVersion: '2026-01',
        manifestUrl: 'https://events.example/manifest.json',
        targeting: [],
        editor: {
          contentBundleUrl: 'https://events.example/old.js',
          blocks: [{ name: 'event', label: 'Old event' }],
        },
      },
    ]),
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useAddonCardConfig', () => {
  it('exposes refreshed cards without writing settings or waiting to render the editor', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(manifest) });
    vi.stubGlobal('fetch', fetch);
    const { result } = renderHook(() => useAddonCardConfig(settings, true, 'Europe/Rome'));
    expect(result.current).toBeUndefined();
    await waitFor(() => expect(result.current?.blocks[0]?.label).toBe('Event'));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('https://events.example/manifest.json', {
      cache: 'no-cache',
    });
  });
  it.each([
    { settings: null, enabled: true },
    { settings: [], enabled: true },
    { settings, enabled: false },
  ])(
    'does not request manifests without flag and backend support ($enabled)',
    ({ settings: currentSettings, enabled }) => {
      const fetch = vi.fn();
      vi.stubGlobal('fetch', fetch);
      const { result } = renderHook(() => useAddonCardConfig(currentSettings, enabled, 'Etc/UTC'));
      expect(result.current).toBeUndefined();
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it('keeps installed definitions when the provider is offline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useAddonCardConfig(settings, true, 'Etc/UTC'));
    await waitFor(() => expect(result.current?.blocks[0]?.label).toBe('Old event'));
  });

  it('drops obsolete results after settings change or the flag is disabled', async () => {
    let resolve!: (response: unknown) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        new Promise((r) => {
          resolve = r;
        }),
      ),
    );
    const { result, rerender } = renderHook(
      ({ settings: currentSettings, enabled }) =>
        useAddonCardConfig(currentSettings, enabled, 'Etc/UTC'),
      { initialProps: { settings, enabled: true } },
    );
    rerender({ settings: [{ key: 'addons', value: '[]' }], enabled: true });
    await waitFor(() => expect(result.current?.blocks).toEqual([]));
    await act(async () => {
      resolve({ ok: true, json: () => Promise.resolve(manifest) });
      await Promise.resolve();
    });
    expect(result.current?.blocks).toEqual([]);
    rerender({ settings, enabled: false });
    expect(result.current).toBeUndefined();
  });
});
