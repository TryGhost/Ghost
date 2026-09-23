import { expect, it, vi } from 'vitest';
import { saveAddonConfiguration } from '../../src/host/configuration.ts';
import type { AddonInstallRecord } from '../../src/types.ts';

const record: AddonInstallRecord = {
  handle: 'podcast',
  name: 'Podcast',
  manifestUrl: 'https://podcast.example/manifest.json',
  enabled: true,
  version: '1',
  apiVersion: '2026-01',
  targeting: [],
};

it('saves app JSON into the latest install record and preserves other apps and pins', async () => {
  const configuration = { shows: [{ id: 'stable-id', title: 'My show' }] };
  const other = { ...record, handle: 'events', configuration: { calendar: true } };
  const latest = { ...record, version: '2' };
  const write = vi.fn().mockResolvedValue(undefined);
  await saveAddonConfiguration('podcast', configuration, {
    read: () => Promise.resolve([other, latest]),
    write,
  });
  expect(write).toHaveBeenCalledWith([other, { ...latest, configuration }]);
});

it('rejects missing installs and invalid configuration without writing', async () => {
  const write = vi.fn();
  await expect(
    saveAddonConfiguration('missing', {}, { read: () => Promise.resolve([record]), write }),
  ).rejects.toThrow('Install');
  for (const value of [null, [], { huge: 'x'.repeat(100_001) }]) {
    await expect(
      saveAddonConfiguration('podcast', value as unknown as Record<string, unknown>, {
        read: () => Promise.resolve([record]),
        write,
      }),
    ).rejects.toThrow('Invalid');
  }
  expect(write).not.toHaveBeenCalled();
});

it('preserves both app updates when configuration saves overlap', async () => {
  let records = [record, { ...record, handle: 'events' }];
  const store = {
    read: () => Promise.resolve(structuredClone(records)),
    write: (next: typeof records) => {
      records = next;
      return Promise.resolve();
    },
  };
  await Promise.all([
    saveAddonConfiguration('podcast', { shows: ['new'] }, store),
    saveAddonConfiguration('events', { calendar: true }, store),
  ]);
  expect(records).toEqual([
    { ...record, configuration: { shows: ['new'] } },
    { ...record, handle: 'events', configuration: { calendar: true } },
  ]);
});
