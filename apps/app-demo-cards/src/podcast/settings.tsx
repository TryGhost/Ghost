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
      await propose(body.episode);
      setStatus({ tone: 'info', text: 'Episode found. Paste the link again to refresh it.' });
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
