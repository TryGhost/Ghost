import { ThreadMessagePort } from '@quilted/threads';
import type { CardRenderExports } from '@tryghost/app-contracts/cards';
import { afterEach, describe, expect, it } from 'vitest';

import { defineCardRenderers } from '../src/cards/index.ts';

const site = { url: 'https://site.example', title: 'Site', locale: 'en', timezone: 'UTC' };
const scope = globalThis as unknown as Record<string, unknown>;

function start(): CardRenderExports {
  const channel = new MessageChannel();
  (scope.__ghostCardStart as (port: MessagePort) => void)(channel.port2);
  const thread = new ThreadMessagePort<CardRenderExports>(channel.port1);
  channel.port1.start();
  return thread.imports;
}

describe('defineCardRenderers', () => {
  afterEach(() => {
    delete scope.__ghostCardStart;
  });

  it('renders a card by name over the channel, with defaults filled in', async () => {
    defineCardRenderers({
      hello: ({ properties }) => ({ html: `<p>${String(properties.name)}</p>` }),
    });
    const output = await start().render({ card: 'hello', properties: { name: 'Ghost' }, site });
    expect(output).toEqual({
      html: '<p>Ghost</p>',
      css: '',
      height: 320,
      email_html: '',
      public_properties: [],
    });
  });

  it('keeps the height within bounds', async () => {
    defineCardRenderers({ tall: () => ({ html: '<p></p>', height: 99_999 }) });
    expect((await start().render({ card: 'tall', properties: {}, site })).height).toBe(4000);
  });

  it('refuses a card the bundle has no renderer for, and empty output', async () => {
    defineCardRenderers({ empty: () => ({ html: ' ' }) });
    const render = start();
    await expect(render.render({ card: 'missing', properties: {}, site })).rejects.toThrow(
      'no renderer',
    );
    await expect(render.render({ card: 'empty', properties: {}, site })).rejects.toThrow(
      'web output',
    );
  });
});
