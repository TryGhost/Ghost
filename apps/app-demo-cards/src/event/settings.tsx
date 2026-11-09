import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { CardSettingsPanel } from '@tryghost/app-sdk/cards/settings';

import { Input, Textarea } from '../remote.ts';
import { readEvent } from './render.tsx';

function Settings({ panel }: { panel: CardSettingsPanel }) {
  const [properties, setProperties] = useState(() => panel.properties);
  useEffect(() => panel.onPropertiesChange(setProperties), [panel]);
  const event = readEvent(properties);

  const propose = (patch: Record<string, unknown>) => {
    setProperties((current) => ({ ...current, ...patch }));
    void panel.propose(patch);
  };

  return (
    <>
      <Input label="Title" value={event.title} onChange={(e) => propose({ title: e.detail })} />
      <Input
        label="Starts at"
        description={`Date and time with an offset, such as 2026-12-03T19:00:00+01:00. Shown in the site's timezone (${panel.site.timezone}).`}
        value={event.startsAt}
        onChange={(e) => propose({ startsAt: e.detail })}
      />
      <Input
        label="Location"
        value={event.location}
        onChange={(e) => propose({ location: e.detail })}
      />
      <Textarea
        label="Description"
        value={event.description}
        onChange={(e) => propose({ description: e.detail })}
      />
      <Input
        label="Registration link"
        placeholder="https://"
        value={event.url}
        onChange={(e) => propose({ url: e.detail })}
      />
    </>
  );
}

export function eventSettings(panel: CardSettingsPanel) {
  render(<Settings panel={panel} />, document.body);
}
