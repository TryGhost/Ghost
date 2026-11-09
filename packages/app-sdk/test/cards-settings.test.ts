// @vitest-environment jsdom
import { ThreadFunctionsManualMemoryManagement, ThreadMessagePort } from '@quilted/threads';
import type { CardSettingsExports, CardSettingsHost } from '@tryghost/app-contracts/cards';
import { describe, expect, it } from 'vitest';

import { defineCardSettings } from '../src/cards/settings/index.ts';

const site = { url: 'https://site.example', title: 'Site', locale: 'en', timezone: 'UTC' };
const settle = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 50);
  });

describe('defineCardSettings', () => {
  it('mirrors the panel over the connection and proposes the author’s changes', async () => {
    defineCardSettings({
      hello: (panel) => {
        const input = document.createElement('ghost-card-input');
        input.label = 'Name';
        input.value = String(panel.properties.name ?? '');
        input.addEventListener('change', (event) => {
          void panel.propose({ name: (event as CustomEvent<string>).detail });
        });
        document.body.append(input);
      },
    });

    const channel = new MessageChannel();
    (globalThis as unknown as Record<string, (port: MessagePort) => void>).__ghostCardStart!(
      channel.port2,
    );
    const thread = new ThreadMessagePort<CardSettingsExports>(channel.port1, {
      functions: new ThreadFunctionsManualMemoryManagement(),
    });
    channel.port1.start();

    const mutations: unknown[] = [];
    const proposals: unknown[] = [];
    const connection = {
      mutate: (records: unknown[]) => void mutations.push(...records),
      call: () => undefined,
    };
    const host: CardSettingsHost = {
      propose: async (patch) => void proposals.push(patch),
      fetch: async () => ({ status: 200, headers: {}, body: '' }),
      uploadImage: async () => ({ url: 'https://site.example/a.png' }),
    };

    await thread.imports.renderSettings(
      { card: 'hello', properties: { name: 'Ghost' }, site },
      connection,
      host,
    );
    await settle();
    expect(JSON.stringify(mutations)).toContain('ghost-card-input');

    document
      .querySelector('ghost-card-input')!
      .dispatchEvent(new CustomEvent('change', { detail: 'Casper' }));
    await settle();
    expect(proposals).toEqual([{ name: 'Casper' }]);

    await expect(
      thread.imports.renderSettings({ card: 'hello', properties: {}, site }, connection, host),
    ).rejects.toThrow('already');
  });
});
