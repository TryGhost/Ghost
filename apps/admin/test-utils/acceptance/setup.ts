import { afterEach, beforeAll } from 'vitest';
import { cleanup } from 'vitest-browser-react';

import './matchers';
import { defaultBootResolver, defaultBootRoutes } from './boot';
import { resetFakeApi, settleRequests, startFakeApi, verifyNoUnhandledRequests } from './worker';

/**
 * Freeze CSS motion. Chromium's Playwright stability check accepts a single
 * unchanged pair of animation frames, so a dropped frame can mark a
 * still-moving element actionable — and a sheet mid-slide-in is outside the
 * viewport, so the click is dispatched into empty space. Nothing receives it,
 * nothing navigates, and the call still reports success, which is what makes
 * this failure mode expensive to diagnose.
 *
 * Zero the durations rather than blanking `animation`: Radix's `Presence`
 * reads the computed animation NAME to decide whether an exiting element stays
 * mounted until `animationend`, so removing the name would route every exit
 * down a different path than production takes.
 */
function freezeAnimations(): void {
  const style = document.createElement('style');

  style.textContent = `*, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }`;
  document.head.appendChild(style);
}

beforeAll(async () => {
  freezeAnimations();
  await startFakeApi({ resolver: defaultBootResolver, routes: defaultBootRoutes() });
});

afterEach(async () => {
  // Order is load-bearing: unmount first (a live app refetches against a
  // reset worker); drain before the reset (stragglers must hit their
  // declared fakes) and before the verification (late 418s belong to the
  // test that caused them); finally so a drain timeout can't leak handlers
  // or 418 records into the next test.
  await cleanup();
  try {
    await settleRequests();
  } finally {
    resetFakeApi();
    window.location.hash = '';
    verifyNoUnhandledRequests();
  }
});
