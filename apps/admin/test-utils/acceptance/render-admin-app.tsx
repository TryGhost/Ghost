import { render } from 'vitest-browser-react';

import '@/index.css';
import { AdminAppRoot } from '@/app-root';

import {
  composeConfigBootOverrides,
  composeLabsBootOverrides,
  installBootOverrides,
  type BootOverrides,
} from './boot';
import { createFrameworkProps } from './framework-props';

export interface RenderAdminAppOptions {
  /**
   * Labs flags for this test; compiles to lockstep settings + config boot
   * overrides (the admin client reads labs from both). Merges into any
   * `boot` override for those entries; flags named here win.
   */
  labs?: Record<string, boolean>;
  /**
   * Boot-table overrides keyed by entry name (see boot.ts); `labs` flags
   * merge into `browseConfig`/`browseSettings` override responses.
   */
  boot?: BootOverrides;
  /**
   * The editor's autosave debounce in milliseconds, for a spec that must keep
   * autosave out of the way or run it fast; defaults to the editor's 3s.
   */
  autosaveDebounceMs?: number;
}

/**
 * The app's current hash route (e.g. "/members?filter=..."), for URL
 * assertions: `await expect.poll(currentRoute).toBe("/members")`.
 */
export function currentRoute(): string {
  return window.location.hash.replace(/^#/, '');
}

/**
 * Boots the real admin app (the same provider stack as src/main.tsx) at the
 * given hash route, e.g. "/tags" or "/members?filter=label:VIP". Cross-app
 * (Ember-owned) navigations are recorded on
 * `document.body.dataset.externalNavigate` instead of navigating.
 */
export async function renderAdminApp(
  route: string = '/',
  { labs, boot, autosaveDebounceMs }: RenderAdminAppOptions = {},
): Promise<Awaited<ReturnType<typeof render>>> {
  let overrides: BootOverrides = labs ? composeLabsBootOverrides(labs, boot) : { ...boot };
  if (autosaveDebounceMs !== undefined) {
    overrides = composeConfigBootOverrides(
      { editorAutosaveDebounceMs: autosaveDebounceMs },
      overrides,
    );
  }

  if (Object.keys(overrides).length > 0) {
    installBootOverrides(overrides);
  }

  // Mirror the production host page (index.html): the react-admin body
  // class and the #root mount point drive the shell's grid layout — without
  // them the body grows with content and virtualized lists never scroll.
  document.body.classList.add('react-admin');
  let rootElement = document.getElementById('root');
  if (!rootElement) {
    rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);
  }

  // EmberRoot expects the Ember host element to exist; there is no Ember
  // app in the test page, so provide an empty stand-in.
  if (!document.getElementById('ember-app')) {
    const emberApp = document.createElement('div');
    emberApp.id = 'ember-app';
    document.body.appendChild(emberApp);
  }

  // The framework RouterProvider is hash-based; set the initial route
  // before the router is created.
  window.location.hash = `#${route}`;

  const framework = createFrameworkProps({
    externalNavigate: (link) => {
      document.body.dataset.externalNavigate = JSON.stringify(link);
    },
  });

  return await render(<AdminAppRoot framework={framework} />, { container: rootElement });
}
