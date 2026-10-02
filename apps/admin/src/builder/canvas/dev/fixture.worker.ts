import { createRenderer } from '@tryghost/theme-renderer';

import { instance, responses, theme } from './fixture';

// One worker and a serial render loop: renderer instances share module-level helper state.
self.onmessage = () => {
  void render().catch((error: unknown) => {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) });
  });
};

async function render() {
  const renderer = await createRenderer({
    siteUrl: instance.siteUrl,
    contentApiKey: instance.contentApiKey,
    theme,
    config: instance.config,
    fetch: (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const recorded = (responses as Record<string, { status: number; body: string }>)[url];
      if (!recorded) {
        return Promise.reject(new Error(`No recorded Content API response for ${url}`));
      }
      return Promise.resolve(
        new Response(recorded.body, {
          status: recorded.status,
          headers: { 'content-type': 'application/json' },
        }),
      );
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
  self.postMessage({ html });
}
