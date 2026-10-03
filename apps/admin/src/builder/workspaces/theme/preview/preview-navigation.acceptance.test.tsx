import { expect, it, vi } from 'vitest';
import { IframePreviewDocumentSurface } from './preview-document';
import { fakeFrameOrigin } from '@test-utils/acceptance/frames';

// Hold just this surface's load guards so both browser loads precede the
// initial receipt check even when the test worker is busy. Polling and runtime
// timers retain their real clocks; correctness does not depend on CPU speed.
function holdLoadGuards(surface: IframePreviewDocumentSurface) {
  const guards = surface as unknown as { loadChecks: Set<ReturnType<typeof setTimeout>> };
  const original = globalThis.setTimeout;
  const held: (() => void)[] = [];
  const spy = vi.spyOn(globalThis, 'setTimeout').mockImplementation((handler, delay, ...args) => {
    const timer = original(handler, delay, ...args);
    if (delay === 100 && typeof handler === 'function') {
      queueMicrotask(() => {
        if (guards.loadChecks.has(timer)) {
          clearTimeout(timer);
          held.push(() => handler(...args));
        }
      });
    }
    return timer;
  });
  return {
    release: () => {
      spy.mockRestore();
      expect(held.length).toBeGreaterThanOrEqual(2);
      held.forEach((check) => check());
    },
    restore: () => spy.mockRestore(),
  };
}

it.each([false, true])(
  'restores a rapid unbridged load (canvas=%s) instead of consuming the initial receipt',
  async (canvasNavigation) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:600px;height:650px;border:0';
    document.body.appendChild(iframe);
    const surface = new IframePreviewDocumentSurface(iframe, { canvasNavigation });
    const guard = holdLoadGuards(surface);
    const diagnostics: unknown[] = [];
    const loads: number[] = [];
    iframe.addEventListener('load', () => loads.push(performance.now()));
    surface.onDiagnostic((diagnostic) => diagnostics.push(diagnostic));
    const signal = new AbortController().signal;
    try {
      await surface.replaceDocument(
        {
          html: '<h1>Accepted document</h1><script>window.addEventListener("message", event => {if(event.data === "test-rapid-navigation") location.href="about:blank"});</script>',
          url: 'https://example.com/',
          revision: 'rapid-1',
        },
        null,
        signal,
      );
      iframe.contentWindow!.postMessage('test-rapid-navigation', '*');
      await expect.poll(() => loads.length).toBeGreaterThanOrEqual(2);
      guard.release();
      await expect
        .poll(() => diagnostics)
        .toEqual([expect.objectContaining({ code: 'preview_navigation_bypassed' })]);
      await expect
        .poll(async () => {
          try {
            return (await surface.inspectElement({ selector: 'h1' }, signal)).text;
          } catch {
            return null;
          }
        })
        .toBe('Accepted document');
      expect((await surface.measureLayout(signal)).viewport).toMatchObject({
        width: 600,
        height: 650,
      });
    } finally {
      guard.restore();
      surface.destroy();
      iframe.remove();
    }
  },
);

it('restores an expected native form result during the initial guard without a bypass diagnostic', async () => {
  await fakeFrameOrigin('https://forms.example.com', '<p>Native form result</p>');
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:600px;height:650px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe, {
    nativeForms: true,
    artifactDocument: true,
    sandbox: 'allow-scripts allow-forms',
  });
  const diagnostics: unknown[] = [];
  const guard = holdLoadGuards(surface);
  const loads: number[] = [];
  iframe.addEventListener('load', () => loads.push(performance.now()));
  surface.onDiagnostic((diagnostic) => diagnostics.push(diagnostic));
  const signal = new AbortController().signal;
  try {
    await surface.replaceDocument(
      {
        html: '<h1>Accepted form</h1><form action="https://forms.example.com/result/" method="post"><button>Submit</button></form><script>window.addEventListener("message", event => {if(event.data === "test-rapid-form") document.querySelector("form").requestSubmit();});</script>',
        url: 'https://example.com/',
        revision: 'rapid-form-1',
      },
      null,
      signal,
    );
    iframe.contentWindow!.postMessage('test-rapid-form', '*');
    await expect.poll(() => loads.length).toBeGreaterThanOrEqual(2);
    guard.release();
    await expect.poll(() => loads.length).toBeGreaterThanOrEqual(3);
    await expect
      .poll(async () => {
        try {
          return (await surface.inspectElement({ selector: 'h1' }, signal)).text;
        } catch {
          return null;
        }
      })
      .toBe('Accepted form');
    expect(diagnostics).toEqual([]);
  } finally {
    guard.restore();
    surface.destroy();
    iframe.remove();
  }
});
