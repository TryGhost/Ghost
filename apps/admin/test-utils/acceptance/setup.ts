import { afterEach, beforeAll } from 'vitest';
import { cleanup } from 'vitest-browser-react';
import { toast } from 'sonner';

import './matchers';
import { defaultBootResolver, defaultBootRoutes } from './boot';
import {
  resetFakeApi,
  settleRequests,
  startFakeApi,
  trackIssuedRequests,
  verifyNoUnhandledRequests,
} from './worker';
import { resetDeclaredResources } from './resources';
import { guardFrameNavigations, resetFakeFrameOrigins } from './frames';

// At import, before the spec module (and the app) loads.
trackIssuedRequests();

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

  // Journeys end, and the app unmounts, as soon as a navigation lands, often
  // while its view transition still waits on the new screen. The real API then
  // times the transition out and reports an unhandled TimeoutError, so run the
  // update straight away instead: no snapshots, nothing left pending to time out.
  document.startViewTransition = (
    update?: ViewTransitionUpdateCallback | StartViewTransitionOptions,
  ) => {
    const callback = typeof update === 'function' ? update : update?.update;
    const updateCallbackDone = Promise.resolve().then(async () => {
      await callback?.();
    });
    return {
      ready: updateCallbackDone,
      finished: updateCallbackDone,
      updateCallbackDone,
      skipTransition() {},
      types: new Set<string>(),
    };
  };

  await startFakeApi({ resolver: defaultBootResolver, routes: defaultBootRoutes() });
  await guardFrameNavigations();
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
    try {
      const activeToasts = toast.getToasts();
      for (const activeToast of activeToasts) {
        // A save can emit a toast while requests drain after unmount. Dismiss
        // each id to mark it dismissed in Sonner's module-level store too.
        toast.dismiss(activeToast.id);
      }
      if (activeToasts.length > 0) {
        // Drain Sonner's queued publications before the next test mounts a
        // subscriber or reuses an id.
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      }
    } finally {
      resetFakeApi();
      resetDeclaredResources();
      // A journey can end mid screen transition; its markers would hide the next app's content.
      delete document.documentElement.dataset.screenExit;
      delete document.documentElement.dataset.screenTransition;
      sessionStorage.clear();
      // The editor keeps local copies of drafts here, and the restore screen lists them all.
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('post-revision-')) {
          localStorage.removeItem(key);
        }
      }
      window.location.hash = '';
      try {
        await resetFakeFrameOrigins();
      } finally {
        verifyNoUnhandledRequests();
      }
    }
  }
});
