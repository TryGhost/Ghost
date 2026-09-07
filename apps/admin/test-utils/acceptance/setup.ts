import { afterEach, beforeAll } from 'vitest';
import { cleanup } from 'vitest-browser-react';

import './matchers';
import { defaultBootResolver, defaultBootRoutes } from './boot';
import { resetFakeApi, settleRequests, startFakeApi, verifyNoUnhandledRequests } from './worker';
import { resetDeclaredResources } from './resources';

beforeAll(async () => {
  // Playwright waits for an element to stop moving before it acts on it, so every
  // click that opens an animated surface pays that animation — Shade's toaster-in
  // alone is 0.8s, and a modal-opening click costs ~209ms against ~37ms without.
  // Scoped to elements carrying an `animate-*` utility (Shade's --animate-* tokens
  // plus Radix's data-[state]:animate-in), so transitions — which one analytics
  // test asserts on — are untouched.
  const style = document.createElement('style');
  style.textContent = `[class*="animate-"] {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
  }`;
  document.head.appendChild(style);

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
    resetDeclaredResources();
    sessionStorage.clear();
    window.location.hash = '';
    verifyNoUnhandledRequests();
  }
});
