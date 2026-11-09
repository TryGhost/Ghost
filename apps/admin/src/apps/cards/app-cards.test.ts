import { describe, expect, it, vi } from 'vitest';
import type { AppInstallation } from '@tryghost/admin-x-framework/api/app-installations';
import { buildAppCardsConfig } from './app-cards-config';
import { CARD_SANDBOX_CSP, cardSandboxSrcdoc } from './card-sandbox';
import { createSettingsHost } from './card-runtime';

const site = {
  url: 'https://site.example/',
  title: 'Example site',
  locale: 'en',
  timezone: 'UTC',
};

function installation(
  overrides: Partial<AppInstallation> = {},
  surfaces: AppInstallation['manifest']['surfaces'] = [],
): AppInstallation {
  return {
    id: 'inst-1',
    app_id: 'org.ghost.cards',
    status: 'active',
    revision: 1,
    manifest_url: 'http://cards.localhost:5181/ghost-app.json',
    icon_data_url: null,
    created_at: '2026-11-09T00:00:00.000Z',
    updated_at: null,
    manifest: {
      id: 'org.ghost.cards',
      name: 'Demo cards',
      description: 'Cards',
      author: { name: 'Ghost', url: 'https://ghost.org' },
      accent_color: '#ff5500',
      icon: { name: 'layout-grid' },
      surfaces,
      manifest_url: 'http://cards.localhost:5181/ghost-app.json',
      identity_key: { kty: 'OKP', crv: 'Ed25519', x: 'a' },
      backend_key: { kty: 'OKP', crv: 'Ed25519', x: 'b' },
      development: true,
    },
    ...overrides,
  };
}

const chart = {
  type: 'card' as const,
  name: 'chart',
  label: 'Chart',
  render: 'http://cards.localhost:5181/editor/render.js',
  settings: 'http://cards.localhost:5181/editor/settings.js',
  image_origins: ['https://images.example'],
  backend_origins: ['http://cards.localhost:5181'],
};

describe('buildAppCardsConfig', () => {
  it('lists active installations’ cards, with the site’s own hosts allowed', () => {
    const config = buildAppCardsConfig({
      installations: [
        installation({}, [{ type: 'admin_page', url: 'http://cards.localhost:5181/' }, chart]),
        installation({ id: 'inst-2', status: 'suspended' }, [{ ...chart, name: 'other' }]),
      ],
      site,
      siteOrigins: ['https://site.example'],
    });
    expect(config.cards).toEqual([
      expect.objectContaining({
        appId: 'org.ghost.cards',
        appName: 'Demo cards',
        name: 'chart',
        hasSettings: true,
        imageOrigins: ['https://site.example', 'https://images.example'],
        mediaOrigins: ['https://site.example'],
      }),
    ]);
    expect(config.definition('org.ghost.cards', 'other')).toBeUndefined();
  });

  it('reads a bundle once for the cards that share it', async () => {
    const fetchBundle = vi.fn(() => Promise.reject(new Error('offline')));
    const config = buildAppCardsConfig({
      installations: [installation({}, [chart, { ...chart, name: 'other' }])],
      site,
      siteOrigins: [],
      fetchBundle,
    });
    await expect(config.render('org.ghost.cards', 'chart', {})).rejects.toThrow('offline');
    await expect(config.render('org.ghost.cards', 'gone', {})).rejects.toThrow('isn’t installed');
    expect(fetchBundle).toHaveBeenCalledWith(chart.render);
  });

  it('opens no settings for a card without them', async () => {
    const config = buildAppCardsConfig({
      installations: [installation({}, [{ ...chart, settings: undefined }])],
      site,
      siteOrigins: [],
    });
    expect(
      await config.openSettings({
        appId: 'org.ghost.cards',
        card: 'chart',
        properties: {},
        propose: vi.fn(),
        uploadImage: vi.fn(),
      }),
    ).toBeNull();
  });
});

describe('the settings host', () => {
  const propose = vi.fn(() => Promise.resolve());
  const uploadImage = vi.fn(() =>
    Promise.resolve({ url: 'https://site.example/content/images/a.png' }),
  );
  const host = createSettingsHost(chart, { propose, uploadImage });

  it('passes on valid proposals and refuses anything else', async () => {
    await host.propose({ number: '73%', table: [[1, 2]] });
    expect(propose).toHaveBeenCalledWith({ number: '73%', table: [[1, 2]] });
    await expect(host.propose({ 'bad name': 1 })).rejects.toThrow();
    await expect(host.propose('not an object' as never)).rejects.toThrow();
  });

  it('only calls the card’s declared backend, without credentials', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"ok":true}'));
    await expect(host.fetch({ url: 'https://evil.example/steal', method: 'GET' })).rejects.toThrow(
      'declared backend',
    );
    const response = await host.fetch({
      url: 'http://cards.localhost:5181/api/resolve',
      method: 'POST',
      body: '{}',
    });
    expect(response).toMatchObject({ status: 200, body: '{"ok":true}' });
    expect(fetch).toHaveBeenCalledWith(
      new URL('http://cards.localhost:5181/api/resolve'),
      expect.objectContaining({ credentials: 'omit', redirect: 'error' }),
    );
    fetch.mockRestore();
  });

  it('uploads generated images through the editor', async () => {
    const result = await host.uploadImage({
      name: 'chart.png',
      type: 'image/png',
      bytes: new Uint8Array([137, 80, 78, 71]),
    });
    expect(result.url).toContain('/content/images/');
    await expect(
      host.uploadImage({ name: 'x.svg', type: 'image/svg+xml', bytes: new Uint8Array() } as never),
    ).rejects.toThrow();
  });
});

describe('the sandbox document', () => {
  it('locks the network down in both modes and parses as script', () => {
    for (const mode of ['static', 'interactive'] as const) {
      const doc = cardSandboxSrcdoc(mode);
      expect(doc).toContain(CARD_SANDBOX_CSP);
      expect(CARD_SANDBOX_CSP).toContain("connect-src 'none'");
      const script = /<script>([\s\S]*)<\/script>/.exec(doc)![1];
      // Parses the shim without running it, to catch a quoting mistake in the generated code.
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      expect(() => new Function(script)).not.toThrow();
    }
  });
});
