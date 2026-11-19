import { describe, expect, it } from 'vitest';

import {
  allowUnhandledRequests,
  currentRoute,
  fakeTags,
  renderAdminApp,
} from '@test-utils/acceptance';
import { sidebarScreen } from './sidebar.screen';

/** Records every element that animates from now on, until stopped, finished animations included. */
function recordAnimatedElements() {
  const animated = new Set<Element>();
  let frame = 0;
  const record = () => {
    for (const animation of document.getAnimations()) {
      const target = (animation.effect as KeyframeEffect | null)?.target;
      if (target) {
        animated.add(target);
      }
    }
    frame = requestAnimationFrame(record);
  };
  record();
  return { animated, stop: () => cancelAnimationFrame(frame) };
}

/** The Settings navigation's rows (Help included), not the copy of the main navigation leaving. */
const settingsRows = () =>
  Array.from(
    sidebarScreen.shellNav().element().querySelectorAll('[data-nav-row], [data-sidebar=menu-item]'),
  ).filter((row) => !row.closest('[data-sidebar-swap-ghost]'));

describe('Navigation swap', () => {
  it.each([false, true])(
    'brings every Settings navigation row in as it swaps in: inAppSupport %s',
    async (inAppSupport) => {
      // The settings app owns its request graph; this spec asserts only the navigation.
      allowUnhandledRequests();
      fakeTags([]);
      await renderAdminApp('/tags', { labs: { inAppSupport } });
      await expect.element(sidebarScreen.navLink('Settings')).toBeVisible();
      const recording = recordAnimatedElements();

      try {
        await sidebarScreen.navLink('Settings').click();
        await expect.poll(currentRoute).toMatch(/^\/settings/);
        await expect
          .element(sidebarScreen.shellNav().getByRole('button', { name: 'Back to app' }))
          .toBeVisible();

        await expect
          .poll(() => {
            const rows = settingsRows();
            return rows.length > 0 && rows.every((row) => recording.animated.has(row));
          })
          .toBe(true);
      } finally {
        recording.stop();
      }
    },
  );
});
