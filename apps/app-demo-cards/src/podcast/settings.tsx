import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { CardSettingsPanel } from '@tryghost/app-sdk/cards/settings';

import { Input, Note } from '../remote.ts';
import { APP_ORIGIN, text } from '../shared.ts';

const RESOLVED_FIELDS = [
  'title',
  'showName',
  'description',
  'artworkUrl',
  'audioUrl',
  'canonicalUrl',
  'duration',
];

/** Covers are stored at most this wide or tall, which is plenty for a 142px player. */
const COVER_SIZE = 600;

/**
 * Copies the episode's cover onto the site: the app's backend downloads it, the panel shrinks it,
 * and Ghost stores it. The card then never loads pictures from the podcast's own host.
 */
async function copyCover(panel: CardSettingsPanel, artworkUrl: string): Promise<string> {
  const response = await panel.fetch(`${APP_ORIGIN}/api/artwork`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: artworkUrl }),
  });
  const body = (await response.json()) as { type?: string; data?: string; error?: string };
  if (!response.ok || !body.type || !body.data) {
    throw new Error(body.error ?? 'The cover could not be loaded');
  }
  const source = Uint8Array.from(atob(body.data), (character) => character.charCodeAt(0));
  const bitmap = await createImageBitmap(new Blob([source], { type: body.type }));
  const scale = Math.min(1, COVER_SIZE / Math.max(bitmap.width, bitmap.height));
  const canvas = new OffscreenCanvas(
    Math.max(1, Math.round(bitmap.width * scale)),
    Math.max(1, Math.round(bitmap.height * scale)),
  );
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('The cover could not be resized');
  }
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const jpeg = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
  const { url } = await panel.uploadImage({
    name: 'podcast-cover.jpg',
    type: 'image/jpeg',
    bytes: new Uint8Array(await jpeg.arrayBuffer()),
  });
  return url;
}

function Settings({ panel }: { panel: CardSettingsPanel }) {
  const [properties, setProperties] = useState(() => panel.properties);
  const [status, setStatus] = useState<{ tone: 'info' | 'error'; text: string }>({
    tone: 'info',
    text: 'Paste the link to a public episode page or podcast feed.',
  });
  const revision = useRef(0);

  useEffect(() => panel.onPropertiesChange(setProperties), [panel]);

  const propose = async (patch: Record<string, unknown>) => {
    setProperties((current) => ({ ...current, ...patch }));
    await panel.propose(patch);
  };

  const resolve = async (submittedUrl: string) => {
    revision.current += 1;
    const current = revision.current;
    const cleared = Object.fromEntries(RESOLVED_FIELDS.map((field) => [field, '']));
    await propose({ submittedUrl, ...cleared });

    if (URL.parse(submittedUrl)?.protocol !== 'https:') {
      setStatus({ tone: 'error', text: 'Use a complete https:// link.' });
      return;
    }

    setStatus({ tone: 'info', text: 'Looking up the episode…' });
    try {
      const response = await panel.fetch(`${APP_ORIGIN}/api/resolve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: submittedUrl }),
      });
      const body = (await response.json()) as { episode?: Record<string, unknown>; error?: string };
      if (!response.ok || !body.episode) {
        throw new Error(body.error ?? 'The episode could not be found');
      }
      if (current !== revision.current) {
        return;
      }
      const episode = body.episode;
      let artworkUrl = '';
      let found = 'Episode found. Paste the link again to refresh it.';
      if (typeof episode.artworkUrl === 'string' && episode.artworkUrl) {
        setStatus({ tone: 'info', text: 'Copying the cover to your site…' });
        try {
          artworkUrl = await copyCover(panel, episode.artworkUrl);
        } catch (error) {
          found = `Episode found, without its cover: ${error instanceof Error ? error.message : 'it could not be copied'}.`;
        }
        if (current !== revision.current) {
          return;
        }
      }
      await propose({ ...episode, artworkUrl });
      setStatus({ tone: 'info', text: found });
    } catch (error) {
      if (current === revision.current) {
        setStatus({
          tone: 'error',
          text: error instanceof Error ? error.message : 'The episode could not be found',
        });
      }
    }
  };

  return (
    <>
      <Input
        label="Episode link"
        placeholder="https://"
        value={text(properties, 'submittedUrl')}
        onChange={(event) => void resolve(event.detail)}
      />
      <Note tone={status.tone}>{status.text}</Note>
    </>
  );
}

export function podcastSettings(panel: CardSettingsPanel) {
  render(<Settings panel={panel} />, document.body);
}
