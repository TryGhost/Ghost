import { describe, expect, it } from 'vitest';

import { configResponse, renderAdminApp, settleRequests } from '@test-utils/acceptance';
import { sidebarScreen } from '@/layout/sidebar.screen';

declare global {
  interface Window {
    clientExtensionRuns?: number;
  }
}

const src = 'data:text/javascript,window.clientExtensionRuns=(window.clientExtensionRuns||0)+1';
const container = '<div id="client-extension-container"></div>';

function configWithExtension() {
  const response = configResponse();
  return { config: { ...response.config, clientExtensions: { script: { container, src } } } };
}

describe('Client extension script', () => {
  it('loads the configured script once, after its container', async () => {
    window.clientExtensionRuns = 0;

    await renderAdminApp('/site', {
      boot: { browseConfig: { response: configWithExtension() } },
    });

    await expect.poll(() => window.clientExtensionRuns).toBe(1);
    await settleRequests();
    expect(window.clientExtensionRuns).toBe(1);

    const scripts = document.querySelectorAll(`script[src="${src}"]`);
    expect(scripts).toHaveLength(1);
    expect(document.querySelectorAll('#client-extension-container')).toHaveLength(1);
    expect(scripts[0].previousElementSibling?.id).toBe('client-extension-container');
  });

  it('adds nothing when no extension is configured', async () => {
    await renderAdminApp('/site');

    await expect.element(sidebarScreen.shellNav()).toBeVisible();
    await settleRequests();
    expect(document.querySelectorAll('script[src^="data:"]')).toHaveLength(0);
    expect(document.getElementById('client-extension-container')).toBeNull();
  });
});
