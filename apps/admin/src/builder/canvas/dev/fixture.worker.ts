import { createRenderer } from '@tryghost/theme-renderer';

import { getThemeFixture, instance } from './fixture';
import { recordedContentResponse } from './recorded-content';
import type { ThemeFixtureId } from './fixture';

// One worker and a serial render loop: renderer instances share module-level helper state.
let pending = Promise.resolve();
self.onmessage = (event: MessageEvent<{ fixtureId?: ThemeFixtureId }>) => {
  const fixtureId = event.data.fixtureId ?? 'casper';
  pending = pending
    .then(() => render(fixtureId))
    .catch((error: unknown) => {
      self.postMessage({
        fixtureId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
};

async function render(fixtureId: ThemeFixtureId) {
  const fixture = getThemeFixture(fixtureId);
  const renderer = await createRenderer({
    siteUrl: instance.siteUrl,
    contentApiKey: instance.contentApiKey,
    theme: fixture.theme,
    config: instance.config,
    fetch: (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      return Promise.resolve(recordedContentResponse(url));
    },
  });
  const html: Record<string, string> = {};
  for (const [group, path] of Object.entries(instance.routes)) {
    const response = await renderer.render(new Request(new URL(path, instance.siteUrl)), {
      markers: true,
    });
    if (response.status !== 200) {
      throw new Error(`${group} fixture render returned ${response.status}`);
    }
    html[group] = await response.text();
  }
  self.postMessage({ fixtureId, html });
}
