// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import { render, h } from 'preact';
import { Player } from '../src/player.tsx';
import type { AddonEditorBlockRequest } from '@tryghost/addon-kit/editor';

afterEach(() => render(null, document.body));
const request = (body: unknown): AddonEditorBlockRequest => ({
  blockName: 'episode',
  props: {},
  envelope: {
    site: 'https://site.test',
    apiVersion: '2026-01',
    context: { postId: 'post', cardId: 'card', member: null },
  },
  bridge: { fetch: vi.fn(async () => ({ status: 200, body })), requestSignin: vi.fn() },
});
it('renders selected audio and video with current title and delegates sign-in to Portal', async () => {
  const input = request({
    state: 'ready',
    feeds: {
      audio: 'https://provider.test/feeds/one/audio.xml',
      video: 'https://provider.test/feeds/one/video.xml',
    },
    episode: { title: 'Current title' },
    show: { title: 'My show' },
    media: {
      audio: { url: 'https://site.test/free.mp3', variant: 'free' },
      video: { url: 'https://site.test/free.mp4', variant: 'free' },
    },
  });
  act(() => render(h(Player, { request: input }), document.body));
  await act(async () => {
    await Promise.resolve();
  });
  expect(document.querySelector('h2')?.textContent).toBe('Current title');
  expect(document.querySelector('audio')?.src).toBe('https://site.test/free.mp3');
  expect(document.querySelector('video')?.src).toBe('https://site.test/free.mp4');
  expect(document.querySelector('summary')?.textContent).toBe('Subscribe to podcast');
  expect(document.querySelector('a')?.href).toBe('https://provider.test/feeds/one/audio.xml');
  document.querySelector('button')!.click();
  expect(input.bridge?.requestSignin).toHaveBeenCalledOnce();
  expect(input.bridge?.fetch).toHaveBeenCalledWith('/api/player', {
    method: 'POST',
    body: { post_id: 'post', card_id: 'card', member: null },
  });
});
it('emits no shell for hidden cards and a bounded error for provider failure', async () => {
  act(() => render(h(Player, { request: request({ state: 'hidden' }) }), document.body));
  await act(async () => {
    await Promise.resolve();
  });
  expect(document.body.textContent).toBe('');
  render(null, document.body);
  const input = request(null);
  input.bridge!.fetch = vi.fn().mockRejectedValue(new Error('Offline'));
  act(() => render(h(Player, { request: input }), document.body));
  await act(async () => {
    await Promise.resolve();
  });
  expect(document.body.textContent).toBe('This episode is currently unavailable.');
  expect(document.querySelector('audio,video')).toBeNull();
});
