import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { CardSettingsPanel } from '@tryghost/app-sdk/cards/settings';

import { Input } from '../remote.ts';
import { readBigNumber } from './render.tsx';

function Settings({ panel }: { panel: CardSettingsPanel }) {
  const [properties, setProperties] = useState(() => panel.properties);
  useEffect(() => panel.onPropertiesChange(setProperties), [panel]);
  const value = readBigNumber(properties);

  const propose = (patch: Record<string, unknown>) => {
    setProperties((current) => ({ ...current, ...patch }));
    void panel.propose(patch);
  };

  return (
    <>
      <Input
        label="Title"
        value={value.title}
        onChange={(event) => propose({ title: event.detail })}
      />
      <Input
        label="Number"
        description="Written as it should appear, such as 73%, 1.2 million or €4bn."
        value={value.number}
        onChange={(event) => propose({ number: event.detail })}
      />
      <Input
        label="Label"
        value={value.label}
        onChange={(event) => propose({ label: event.detail })}
      />
      <Input
        label="Source"
        value={value.source}
        onChange={(event) => propose({ source: event.detail })}
      />
    </>
  );
}

export function bigNumberSettings(panel: CardSettingsPanel) {
  render(<Settings panel={panel} />, document.body);
}
