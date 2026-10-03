import { expect, it } from 'vitest';
import { IframePreviewDocumentSurface } from './preview-document';
import { fakeFrameOrigin } from '@test-utils/acceptance/frames';

it.each([false, true])(
  'restores a rapid unbridged load (canvas=%s) instead of consuming the initial receipt',
  async (canvasNavigation) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:600px;height:650px;border:0';
    document.body.appendChild(iframe);
    const surface = new IframePreviewDocumentSurface(iframe, { canvasNavigation });
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
      // Remain in the same parent continuation so navigation precedes the 100ms
      // initial-load check, rather than adding a browser locator round trip.
      iframe.contentWindow!.postMessage('test-rapid-navigation', '*');
      await expect.poll(() => loads.length).toBeGreaterThanOrEqual(2);
      expect(loads[1] - loads[0]).toBeLessThan(100);
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
    await expect.poll(() => loads.length).toBeGreaterThanOrEqual(3);
    expect(loads[1] - loads[0]).toBeLessThan(100);
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
    surface.destroy();
    iframe.remove();
  }
});
