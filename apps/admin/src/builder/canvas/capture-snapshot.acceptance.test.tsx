import { expect, it } from 'vitest';
import { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';
import { captureOverview } from './capture-overview';

async function pixel(dataUrl: string) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d')!;
  context.drawImage(image, 0, 0);
  return [...context.getImageData(100, 100, 1, 1).data];
}

it('preserves static attribute-selector styling when freezing the snapshot', async () => {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:200px;height:200px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe);
  const signal = new AbortController().signal;
  let session: Awaited<ReturnType<typeof surface.createScreenshotSession>> | undefined;
  try {
    await surface.replaceDocument(
      {
        html: '<style>body{margin:0;background:rgb(0,0,255)}body[style]{background:rgb(255,0,0)}</style>',
        url: 'https://example.com/',
        revision: 'attribute-styles',
      },
      null,
      signal,
    );
    session = await surface.createScreenshotSession(signal);
    expect(await pixel((await session.screenshot({ kind: 'viewport' })).dataUrl)).toEqual([
      0, 0, 255, 255,
    ]);
  } finally {
    session?.dispose();
    surface.destroy();
    iframe.remove();
  }
});

it('keeps every overview tile on one snapshot when theme pixels change without changing layout', async () => {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:200px;height:200px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe);
  const signal = new AbortController().signal;
  try {
    await surface.replaceDocument(
      {
        html: '<style>body{margin:0;height:4100px;background:rgb(0,0,255)}</style><script>window.addEventListener("message",event=>{if(event.data==="change-theme-pixels")document.body.style.backgroundColor="rgb(255,0,0)"});</script>',
        url: 'https://example.com/',
        revision: 'one-render',
      },
      null,
      signal,
    );
    const measure = surface.measureLayout.bind(surface);
    const before = await measure(signal);
    let measurements = 0;
    surface.measureLayout = async (currentSignal) => {
      measurements += 1;
      // captureOverview checks the backing layout after each rasterized tile.
      if (measurements === 2) {
        iframe.contentWindow!.postMessage('change-theme-pixels', '*');
        await expect
          .poll(
            async () =>
              (await surface.inspectElement({ selector: 'body' }, currentSignal)).styles
                .backgroundColor,
          )
          .toBe('rgb(255, 0, 0)');
      }
      return measure(currentSignal);
    };
    const capture = await captureOverview(surface, 'home-mobile', 'one-render', signal);
    expect(capture.tiles).toHaveLength(3);
    expect(await pixel(capture.tiles[0].dataUrl)).toEqual([0, 0, 255, 255]);
    expect(await pixel(capture.tiles[1].dataUrl)).toEqual([0, 0, 255, 255]);
    expect(await measure(signal)).toEqual(before);
    expect(
      (await surface.inspectElement({ selector: 'body' }, signal)).styles.backgroundColor,
    ).toBe('rgb(255, 0, 0)');
    expect(document.querySelector('iframe[sandbox="allow-same-origin"]')).toBeNull();
  } finally {
    surface.destroy();
    iframe.remove();
  }
});

it.each(['dispose', 'abort', 'replace', 'restore', 'destroy'] as const)(
  'retires the capture snapshot on %s and refuses further regions',
  async (action) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:200px;height:200px;border:0';
    document.body.appendChild(iframe);
    const surface = new IframePreviewDocumentSurface(iframe);
    const controller = new AbortController();
    const signal = new AbortController().signal;
    let session: Awaited<ReturnType<typeof surface.createScreenshotSession>> | undefined;
    try {
      await surface.replaceDocument(
        {
          html: '<h1>Accepted</h1><script>window.addEventListener("message",event=>{if(event.data==="leave")location.href="about:blank"});</script>',
          url: 'https://example.com/',
          revision: 'accepted',
        },
        null,
        signal,
      );
      session = await surface.createScreenshotSession(controller.signal);
      expect(document.querySelectorAll('[data-builder-capture-snapshot]')).toHaveLength(1);
      if (action === 'dispose') {
        session.dispose();
      } else if (action === 'abort') {
        controller.abort();
      } else if (action === 'replace') {
        await surface.replaceDocument(
          { html: '<h1>Replacement</h1>', url: 'https://example.com/', revision: 'replacement' },
          null,
          signal,
        );
      } else if (action === 'restore') {
        iframe.contentWindow!.postMessage('leave', '*');
        await expect
          .poll(() => document.querySelector('[data-builder-capture-snapshot]'))
          .toBeNull();
        await expect
          .poll(async () => {
            try {
              return (await surface.inspectElement({ selector: 'h1' }, signal)).text;
            } catch {
              return null;
            }
          })
          .toBe('Accepted');
      } else {
        surface.destroy();
      }
      expect(document.querySelector('[data-builder-capture-snapshot]')).toBeNull();
      await expect(session.screenshot({ kind: 'viewport' })).rejects.toMatchObject({
        name: 'AbortError',
      });
    } finally {
      session?.dispose();
      surface.destroy();
      iframe.remove();
    }
  },
);

it('refuses overlapping regions while keeping its snapshot available for serial use', async () => {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:200px;height:200px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe);
  const signal = new AbortController().signal;
  let session: Awaited<ReturnType<typeof surface.createScreenshotSession>> | undefined;
  try {
    await surface.replaceDocument(
      {
        html: '<style>body{margin:0;background:rgb(0,0,255)}</style>',
        url: 'https://example.com/',
        revision: 'serial',
      },
      null,
      signal,
    );
    session = await surface.createScreenshotSession(signal);
    const first = session.screenshot({ kind: 'viewport' });
    await expect(session.screenshot({ kind: 'viewport' })).rejects.toThrow('serially');
    expect(await pixel((await first).dataUrl)).toEqual([0, 0, 255, 255]);
    expect(await pixel((await session.screenshot({ kind: 'viewport' })).dataUrl)).toEqual([
      0, 0, 255, 255,
    ]);
  } finally {
    session?.dispose();
    surface.destroy();
    iframe.remove();
  }
});

it.each([
  '<style>body::before{content:"Animated decoration";animation:pulse 1s infinite}@keyframes pulse{from{opacity:0}to{opacity:1}}</style>',
  '<svg width="100" height="100"><rect width="100" height="100"><animate attributeName="fill" values="red;blue" dur="1s" repeatCount="indefinite"/></rect></svg>',
  '<video controls></video>',
])('refuses unsupported animation snapshots without leaking an inert frame', async (html) => {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:200px;height:200px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe);
  const signal = new AbortController().signal;
  try {
    await surface.replaceDocument(
      { html, url: 'https://example.com/', revision: 'unsupported' },
      null,
      signal,
    );
    await expect(surface.createScreenshotSession(signal)).rejects.toMatchObject({
      code: 'preview_snapshot_animation_unsupported',
    });
    expect(document.querySelector('[data-builder-capture-snapshot]')).toBeNull();
    const legacy = await surface.screenshot({ kind: 'viewport' }, signal);
    expect(legacy).toMatchObject({ width: 200, height: 200 });
    expect(document.querySelector('[data-builder-capture-snapshot]')).toBeNull();
  } finally {
    surface.destroy();
    iframe.remove();
  }
});

it('freezes the observed CSS animation value without changing the live animation', async () => {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:200px;height:200px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe);
  const signal = new AbortController().signal;
  let session: Awaited<ReturnType<typeof surface.createScreenshotSession>> | undefined;
  try {
    await surface.replaceDocument(
      {
        html: '<style>body{margin:0;height:4100px;background:rgb(0,0,255);animation:colour 1000s linear infinite}@keyframes colour{from{background-color:rgb(0,0,255)}to{background-color:rgb(255,0,0)}}</style><body>Animated theme<script>getComputedStyle(document.body).backgroundColor;const animation=document.body.getAnimations()[0];animation.pause();animation.currentTime=500000;</script>',
        url: 'https://example.com/',
        revision: 'animated-render',
      },
      null,
      signal,
    );
    expect(
      (await surface.inspectElement({ selector: 'body' }, signal)).styles.backgroundColor,
    ).toBe('rgb(128, 0, 128)');
    session = await surface.createScreenshotSession(signal);
    for (const y of [0, 2000]) {
      const image = await session.screenshot({ kind: 'region', x: 0, y, width: 200, height: 200 });
      expect(await pixel(image.dataUrl)).toEqual([128, 0, 128, 255]);
    }
    expect(
      (await surface.inspectElement({ selector: 'body' }, signal)).styles.backgroundColor,
    ).toBe('rgb(128, 0, 128)');
  } finally {
    session?.dispose();
    surface.destroy();
    iframe.remove();
  }
});

it.each(['body', 'body::before'])('does not restart a completed %s animation', async (target) => {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:200px;height:200px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe);
  const signal = new AbortController().signal;
  let session: Awaited<ReturnType<typeof surface.createScreenshotSession>> | undefined;
  try {
    await surface.replaceDocument(
      {
        html: `<style>body{margin:0;background:rgb(0,0,255)}${target}{content:"";display:block;width:200px;height:200px;background:rgb(0,0,255);animation:colour 1000s linear}@keyframes colour{from{background-color:rgb(255,0,0)}to{background-color:rgb(255,0,0)}}</style><body><script>getComputedStyle(document.body,"::before").backgroundColor;getComputedStyle(document.body).backgroundColor;document.getAnimations().forEach(animation=>animation.finish())</script>`,
        url: 'https://example.com/',
        revision: 'finished-animation',
      },
      null,
      signal,
    );
    session = await surface.createScreenshotSession(signal);
    expect(await pixel((await session.screenshot({ kind: 'viewport' })).dataUrl)).toEqual([
      0, 0, 255, 255,
    ]);
    expect(await pixel((await session.screenshot({ kind: 'viewport' })).dataUrl)).toEqual([
      0, 0, 255, 255,
    ]);
  } finally {
    session?.dispose();
    surface.destroy();
    iframe.remove();
  }
});

it('does not add author-visible inline styles to an animated element', async () => {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:200px;height:200px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe);
  const signal = new AbortController().signal;
  let session: Awaited<ReturnType<typeof surface.createScreenshotSession>> | undefined;
  try {
    await surface.replaceDocument(
      {
        html: '<style>body{margin:0;background:rgb(0,0,255);animation:fade 1000s infinite}body[style]{background:rgb(255,0,0)}@keyframes fade{from{opacity:1}to{opacity:1}}</style>',
        url: 'https://example.com/',
        revision: 'animated-selector',
      },
      null,
      signal,
    );
    session = await surface.createScreenshotSession(signal);
    expect(await pixel((await session.screenshot({ kind: 'viewport' })).dataUrl)).toEqual([
      0, 0, 255, 255,
    ]);
    expect(
      (await surface.inspectElement({ selector: 'body' }, signal)).styles.backgroundColor,
    ).toBe('rgb(0, 0, 255)');
  } finally {
    session?.dispose();
    surface.destroy();
    iframe.remove();
  }
});

it('refuses an unfrozen GIF background on a pseudo-element', async () => {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:200px;height:200px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe);
  const signal = new AbortController().signal;
  try {
    await surface.replaceDocument(
      {
        html: '<style>body::before{content:"";display:block;width:200px;height:200px;background-image:url("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")}</style>',
        url: 'https://example.com/',
        revision: 'pseudo-background',
      },
      null,
      signal,
    );
    await expect(surface.createScreenshotSession(signal)).rejects.toMatchObject({
      code: 'preview_snapshot_animation_unsupported',
    });
    expect(document.querySelector('[data-builder-capture-snapshot]')).toBeNull();
  } finally {
    surface.destroy();
    iframe.remove();
  }
});

it('does not restart a completed marker animation in the retained source snapshot', async () => {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:200px;height:200px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe);
  const signal = new AbortController().signal;
  let session: Awaited<ReturnType<typeof surface.createScreenshotSession>> | undefined;
  try {
    await surface.replaceDocument(
      {
        html: '<style>li::marker{color:rgb(0,0,255);animation:colour 1000s linear}@keyframes colour{from{color:rgb(255,0,0)}to{color:rgb(255,0,0)}}</style><ul><li>Item</li></ul><script>getComputedStyle(document.querySelector("li"),"::marker").color;document.getAnimations().forEach(animation=>animation.finish());document.body.style.color=getComputedStyle(document.querySelector("li"),"::marker").color;</script>',
        url: 'https://example.com/',
        revision: 'finished-marker',
      },
      null,
      signal,
    );
    expect((await surface.inspectElement({ selector: 'body' }, signal)).styles.color).toBe(
      'rgb(0, 0, 255)',
    );
    session = await surface.createScreenshotSession(signal);
    const captureFrame = document.querySelector<HTMLIFrameElement>(
      '[data-builder-capture-snapshot]',
    )!;
    const snapshot = captureFrame.contentDocument!;
    expect(
      snapshot.defaultView!.getComputedStyle(snapshot.querySelector('li')!, '::marker').color,
    ).toBe('rgb(0, 0, 255)');
    expect(snapshot.getAnimations()).toHaveLength(0);
  } finally {
    session?.dispose();
    surface.destroy();
    iframe.remove();
  }
});
