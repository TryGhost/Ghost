import { afterEach, describe, expect, it } from 'vitest';

import { IframePreviewDocumentSurface } from './preview-document';
import { SCREENSHOT_LIMITS, capturePreviewScreenshot } from './screenshot';

const iframes: HTMLIFrameElement[] = [];

function waitForCaptureFrame(): Promise<HTMLIFrameElement> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      observer.disconnect();
      reject(new Error('The inert screenshot frame was not created.'));
    }, 5_000);
    const observer = new MutationObserver(() => {
      const frame = document.querySelector<HTMLIFrameElement>(
        'iframe[sandbox="allow-same-origin"]',
      );
      if (!frame) {
        return;
      }
      observer.disconnect();
      window.clearTimeout(timeout);
      if (frame.contentDocument?.readyState === 'complete') {
        resolve(frame);
      } else {
        frame.addEventListener('load', () => resolve(frame), { once: true });
      }
    });
    observer.observe(document.body, { childList: true });
  });
}

async function centerPixel(dataUrl: string): Promise<[number, number, number, number]> {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  context?.drawImage(image, 0, 0);
  return Array.from(
    context?.getImageData(Math.floor(image.width / 2), Math.floor(image.height / 2), 1, 1).data ?? [
      0, 0, 0, 0,
    ],
  ) as [number, number, number, number];
}

async function createRenderedPreview(): Promise<HTMLIFrameElement> {
  const html = `
        <html>
            <head><style>body { margin: 0; } main { height: 900px; } #target { width: 120px; height: 80px; background: rgb(21, 71, 52); }</style></head>
            <body><main><h1>Rendered theme preview</h1><div id="target"></div><div style="width:20px;height:20px;background-image:url(https://external.invalid/background.png)"></div><svg width="20" height="20"><image width="20" height="20" href="https://external.invalid/vector.png"></image></svg><img width="64" height="48" style="display:block;width:64px;height:48px" loading="lazy" src="https://external.invalid/image.png" alt="external"></main></body>
        </html>
    `;
  const iframe = document.createElement('iframe');
  iframe.style.width = '320px';
  iframe.style.height = '180px';
  iframe.srcdoc = html;
  document.body.appendChild(iframe);
  iframes.push(iframe);
  await new Promise<void>((resolve) => {
    iframe.addEventListener('load', () => resolve(), { once: true });
  });
  return iframe;
}

afterEach(() => {
  for (const iframe of iframes.splice(0)) {
    iframe.remove();
  }
});

describe('preview screenshot proof', () => {
  it('captures viewport, full-page, and element images from a rendered theme iframe', async () => {
    const iframe = await createRenderedPreview();

    const viewport = await capturePreviewScreenshot(iframe, { kind: 'viewport' });
    const fullPage = await capturePreviewScreenshot(iframe, { kind: 'full_page' });
    const element = await capturePreviewScreenshot(iframe, {
      kind: 'element',
      selector: '#target',
    });

    expect(viewport.dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(viewport.width).toBe(320);
    expect(viewport.height).toBe(180);
    expect(fullPage.height).toBeGreaterThan(viewport.height);
    expect(element.width).toBe(120);
    expect(element.height).toBe(80);
  });

  it('replaces external images and reports a warning instead of tainting the canvas', async () => {
    const iframe = await createRenderedPreview();

    const screenshot = await capturePreviewScreenshot(iframe, { kind: 'full_page' });

    expect(screenshot.dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(screenshot.warnings).toEqual(['3 external images were replaced in the screenshot.']);
  });

  it('replaces an external image when that image is the element target', async () => {
    const iframe = await createRenderedPreview();

    const screenshot = await capturePreviewScreenshot(iframe, { kind: 'element', selector: 'img' });

    expect(screenshot.dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(screenshot.width).toBe(64);
    expect(screenshot.height).toBe(48);
    expect(screenshot.warnings).toEqual(['1 external image was replaced in the screenshot.']);
  });

  it('captures through the production opaque-origin preview bridge', async () => {
    const iframe = document.createElement('iframe');
    iframe.style.width = '320px';
    iframe.style.height = '180px';
    document.body.appendChild(iframe);
    iframes.push(iframe);
    const surface = new IframePreviewDocumentSurface(iframe);
    const replacing = surface.replaceDocument(
      {
        html: '<html><body><canvas data-edit="index.hbs:1:1" width="32" height="24"></canvas><script>const context = document.querySelector("canvas").getContext("2d"); context.fillStyle = "rgb(255, 0, 0)"; context.fillRect(0, 0, 32, 24);</script></body></html>',
        url: 'https://example.com/',
        revision: 'rev-1',
      },
      null,
      new AbortController().signal,
    );

    await replacing;
    const screenshot = await surface.screenshot(
      { kind: 'element', marker: 'index.hbs:1:1' },
      new AbortController().signal,
    );

    expect(screenshot.dataUrl).toMatch(/^data:image\/png;base64,/);
    const [red, green, blue, alpha] = await centerPixel(screenshot.dataUrl);
    expect(red).toBeGreaterThan(240);
    expect(green).toBeLessThan(20);
    expect(blue).toBeLessThan(20);
    expect(alpha).toBe(255);
    surface.destroy();
  });

  it('replaces an unreadable runtime canvas with a warning', async () => {
    const iframe = document.createElement('iframe');
    iframe.style.width = '320px';
    iframe.style.height = '180px';
    document.body.appendChild(iframe);
    iframes.push(iframe);
    const surface = new IframePreviewDocumentSurface(iframe);
    await surface.replaceDocument(
      {
        html: '<html><body><canvas data-edit="index.hbs:1:1" width="80" height="40"></canvas><script>HTMLCanvasElement.prototype.toDataURL = () => { throw new DOMException("Tainted", "SecurityError"); };</script></body></html>',
        url: 'https://example.com/',
        revision: 'rev-tainted',
      },
      null,
      new AbortController().signal,
    );

    const screenshot = await surface.screenshot(
      { kind: 'element', marker: 'index.hbs:1:1' },
      new AbortController().signal,
    );

    expect(screenshot.dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(screenshot.warnings).toEqual([
      '1 canvas was replaced in the screenshot because its pixels could not be read.',
    ]);
    surface.destroy();
  });

  it('captures a selected file input without serializing its fake path', async () => {
    const iframe = document.createElement('iframe');
    iframe.style.width = '320px';
    iframe.style.height = '180px';
    document.body.appendChild(iframe);
    iframes.push(iframe);
    const surface = new IframePreviewDocumentSurface(iframe);
    await surface.replaceDocument(
      {
        html: '<html><body><input data-edit="index.hbs:1:1" type="file"><script>const transfer = new DataTransfer(); transfer.items.add(new File(["demo"], "demo.txt")); document.querySelector("input").files = transfer.files;</script></body></html>',
        url: 'https://example.com/',
        revision: 'rev-file',
      },
      null,
      new AbortController().signal,
    );

    const screenshot = await surface.screenshot(
      { kind: 'element', marker: 'index.hbs:1:1' },
      new AbortController().signal,
    );

    expect(screenshot.dataUrl).toMatch(/^data:image\/png;base64,/);
    surface.destroy();
  });

  it('releases an in-flight bridge screenshot immediately when aborted', async () => {
    const iframe = document.createElement('iframe');
    iframe.style.width = '320px';
    iframe.style.height = '180px';
    document.body.appendChild(iframe);
    iframes.push(iframe);
    const surface = new IframePreviewDocumentSurface(iframe);
    await surface.replaceDocument(
      {
        html: '<html><body><main style="height:4000px">Large preview</main></body></html>',
        url: 'https://example.com/',
        revision: 'rev-abort',
      },
      null,
      new AbortController().signal,
    );
    const controller = new AbortController();

    const captureFrame = waitForCaptureFrame();
    const capture = surface.screenshot({ kind: 'full_page' }, controller.signal);
    await captureFrame;
    controller.abort();

    await expect(capture).rejects.toMatchObject({ name: 'AbortError' });
    expect(document.querySelector('iframe[sandbox="allow-same-origin"]')).toBeNull();
    surface.destroy();
  });

  it('rejects an oversized capture before allocating a canvas', async () => {
    const iframe = await createRenderedPreview();
    const document = iframe.contentDocument;
    const target = document?.getElementById('target');
    target?.style.setProperty('width', `${SCREENSHOT_LIMITS.maxDimension + 1}px`);

    await expect(
      capturePreviewScreenshot(iframe, { kind: 'element', selector: '#target' }),
    ).rejects.toThrow('size limit');
  });
});
