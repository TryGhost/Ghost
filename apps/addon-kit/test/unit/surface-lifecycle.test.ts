import { renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { GhostMutationMirror } from '../../src/addon/mutation-mirror.ts';
import { useAddonSurface } from '../../src/host/use-addon-surface.ts';
import type { AddonInstallRecord } from '../../src/types.ts';

vi.mock('../../src/host/capabilities.ts', () => ({ useHostCapabilities: () => ({}) }));
vi.mock('@tryghost/admin-x-framework/api/site', () => ({
  useBrowseSite: () => ({ data: { site: { url: 'https://example.com', title: 'Site' } } }),
}));
vi.mock('../../src/host/sandbox-controller.ts', () => ({
  AddonSandboxController: class {
    async start() {
      await Promise.resolve();
    }
    async loadBundle() {
      await Promise.resolve();
    }
    async render({
      connection,
    }: {
      connection: ConstructorParameters<typeof GhostMutationMirror>[0];
    }) {
      const root = document.createElement('div');
      const mirror = new GhostMutationMirror(connection);
      mirror.observe(root);
      root.append(document.createTextNode('Show settings'));
      await Promise.resolve();
    }
    async updateData() {
      await Promise.resolve();
    }
    destroy() {}
  },
}));

it('replaces the old remote tree when a new app version starts', async () => {
  const install: AddonInstallRecord = {
    handle: 'podcast',
    name: 'Podcasts',
    enabled: true,
    manifestUrl: 'https://example.com/manifest.json',
    version: '1',
    apiVersion: '2026-01',
    targeting: [{ target: 'admin.page.render', bundleUrl: 'https://example.com/page.js' }],
  };
  const { result, rerender } = renderHook(
    ({ version }) =>
      useAddonSurface({
        install: { ...install, version },
        target: 'admin.page.render',
        context: {},
      }),
    { initialProps: { version: '1' } },
  );
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(result.current.receiver.root.children).toHaveLength(1);
  rerender({ version: '2' });
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(result.current.receiver.root.children).toHaveLength(1);
});
