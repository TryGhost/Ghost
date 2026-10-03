import { expect, it } from 'vitest';

import { IframePreviewDocumentSurface } from './preview-document';

async function pixel(dataUrl: string, x: number, y: number) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d')!;
  context.drawImage(image, 0, 0);
  return [...context.getImageData(x, y, 1, 1).data];
}

it('measures and captures below-fold regions without changing a fixed device viewport or scroll', async () => {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:390px;height:844px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe);
  const signal = new AbortController().signal;
  try {
    await surface.replaceDocument(
      {
        html: `<style>body{margin:0}.hero{height:100vh;background:rgb(255,0,0)}.tail{height:16000px;background:rgb(0,0,255)}.height-check{height:200px;background:rgb(255,0,0)}@media(max-height:900px){.height-check{background:rgb(0,255,0)}}</style><div class="hero">Device hero</div><div class="tail"><div class="height-check"></div>Below fold</div><script>window.scrollTo(0,123)</script>`,
        url: 'https://example.com/',
        revision: 'device-layout-1',
      },
      null,
      signal,
    );
    const before = await surface.measureLayout(signal);
    expect(before.viewport).toEqual({ width: 390, height: 844, scrollX: 0, scrollY: 123 });
    expect(before.document).toEqual({ width: 390, height: 16_844 });
    const heightQuery = await surface.screenshot(
      { kind: 'region', x: 0, y: 844, width: 390, height: 120 },
      signal,
    );
    expect(await pixel(heightQuery.dataUrl, 180, 50)).toEqual([0, 255, 0, 255]);
    const distant = await surface.screenshot(
      { kind: 'region', x: 0, y: 10_000, width: 390, height: 120 },
      signal,
    );
    expect(await pixel(distant.dataUrl, 180, 50)).toEqual([0, 0, 255, 255]);
    expect(await surface.measureLayout(signal)).toEqual(before);
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
    expect(document.querySelector('iframe[sandbox="allow-same-origin"]')).toBeNull();
    await expect(
      surface.screenshot({ kind: 'region', x: 0, y: 16_800, width: 390, height: 120 }, signal),
    ).rejects.toThrow('bounds');
    await expect(
      surface.screenshot({ kind: 'region', x: 0, y: NaN, width: 390, height: 120 }, signal),
    ).rejects.toThrow('bounds');
  } finally {
    surface.destroy();
    iframe.remove();
  }
});

it('coalesces late layout changes on the current authenticated document port', async () => {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:390px;height:844px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe, { observeLayout: true });
  const notices: import('./preview-document').PreviewLayoutChange[] = [];
  const remove = surface.onLayoutChange((change) => notices.push(change));
  const signal = new AbortController().signal;
  try {
    await surface.replaceDocument(
      {
        html: `<style>body{margin:0}</style><div style="height:1000px"></div><script>window.addEventListener('message', event => { if(event.data?.kind === 'test-layout') { for(let i=0;i<20;i++) document.querySelector('div').style.height = (event.data.height + i) + 'px'; } });</script>`,
        url: 'https://example.com/',
        revision: 'late-layout-1',
      },
      null,
      signal,
    );
    const initial = await surface.measureLayout(signal);
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 200);
    });
    notices.length = 0;
    const bridge = surface as unknown as { commandPort: MessagePort; channel: string };
    const forged = {
      channel: bridge.channel,
      documentId: initial.documentId,
      type: 'layout-changed',
      sequence: 1_000_000,
      layoutSample: 1_000_000,
      layoutGeneration: 1_000_000,
      viewport: { width: 390, height: 844 },
      document: { width: 390, height: Infinity },
    };
    bridge.commandPort.dispatchEvent(new MessageEvent('message', { data: forged }));
    window.dispatchEvent(
      new MessageEvent('message', {
        source: iframe.contentWindow,
        data: { ...forged, document: { width: 390, height: 9999 } },
      }),
    );
    expect(notices).toEqual([]);
    iframe.contentWindow!.postMessage({ kind: 'test-layout', height: 2400 }, '*');
    await expect.poll(() => notices.at(-1)?.document.height).toBe(2419);
    expect(notices.at(-1)).toMatchObject({
      documentId: initial.documentId,
      documentInstanceId: initial.documentInstanceId,
      viewport: { width: 390, height: 844 },
    });
    expect(notices.length).toBeLessThanOrEqual(2);
    const beforeShrink = notices.length;
    iframe.contentWindow!.postMessage({ kind: 'test-layout', height: 1000 }, '*');
    await expect.poll(() => notices.at(-1)?.document.height).toBe(1019);
    expect(notices.length).toBeGreaterThan(beforeShrink);
    expect((await surface.measureLayout(signal)).documentInstanceId).toBe(
      initial.documentInstanceId,
    );
    const count = notices.length;
    remove();
    iframe.contentWindow!.postMessage({ kind: 'test-layout', height: 3000 }, '*');
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 200);
    });
    expect(notices).toHaveLength(count);
  } finally {
    remove();
    surface.destroy();
    iframe.remove();
  }
});

it('leaves layout observation disabled for existing preview consumers', async () => {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:390px;height:844px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe);
  const notices: unknown[] = [];
  surface.onLayoutChange((change) => notices.push(change));
  try {
    await surface.replaceDocument(
      { html: '<p>Legacy preview</p>', url: 'https://example.com/', revision: 'legacy-layout' },
      null,
      new AbortController().signal,
    );
    iframe.style.height = '1000px';
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 200);
    });
    expect(notices).toEqual([]);
  } finally {
    surface.destroy();
    iframe.remove();
  }
});

it.each(['data-expanded', 'aria-expanded'])(
  'remeasures selector-driven shrinkage from %s despite the expanded viewport floor',
  async (attribute) => {
    const { observeExpandedComposition } =
      await import('@/builder/canvas/observe-expanded-composition');
    const { waitForCompositionLayout } =
      await import('@/builder/canvas/measure-expanded-composition');
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:390px;height:844px;border:0';
    document.body.appendChild(iframe);
    const surface = new IframePreviewDocumentSurface(iframe, { observeLayout: true });
    const controller = new AbortController();
    const results: import('@/builder/canvas/measure-expanded-composition').ExpandedComposition[] =
      [];
    try {
      await surface.replaceDocument(
        {
          html: `<style>body{margin:0;min-height:100vh}main{height:1000px}main[${attribute}="true"]{height:2400px}</style><main ${attribute}="true">Expandable content</main><script>window.addEventListener('message', event=>{if(event.data==='test-collapse') document.querySelector('main').setAttribute('${attribute}', 'false');});</script>`,
          url: 'https://example.com/',
          revision: 'selector-shrink',
        },
        null,
        controller.signal,
      );
      const observation = observeExpandedComposition({
        surface,
        frameId: 'home-mobile',
        revision: 'selector-shrink',
        viewport: { width: 390, height: 844 },
        signal: controller.signal,
        isPaused: () => false,
        resize: (height, signal) => {
          iframe.style.height = `${height}px`;
          return waitForCompositionLayout(signal);
        },
        onResult: (result) => results.push(result),
        onError: (error) => {
          throw error;
        },
      });
      await observation.ready;
      const initial = await surface.measureLayout(controller.signal);
      expect(initial.viewport.height).toBe(2400);
      iframe.contentWindow!.postMessage('test-collapse', '*');
      await expect.poll(() => results.at(-1)?.viewport.height).toBe(1000);
      expect(results.at(-1)?.status).toBe('settled');
      expect((await surface.measureLayout(controller.signal)).documentInstanceId).toBe(
        initial.documentInstanceId,
      );
    } finally {
      controller.abort();
      surface.destroy();
      iframe.remove();
    }
  },
);

it('bounds ongoing viewport-dependent growth in the real sandbox without resize feedback retries', async () => {
  const { observeExpandedComposition } =
    await import('@/builder/canvas/observe-expanded-composition');
  const { waitForCompositionLayout } =
    await import('@/builder/canvas/measure-expanded-composition');
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:390px;height:844px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe, { observeLayout: true });
  const controller = new AbortController();
  const results: import('@/builder/canvas/measure-expanded-composition').ExpandedComposition[] = [];
  try {
    await surface.replaceDocument(
      {
        html: '<style>body{margin:0;min-height:calc(100vh + 100px)}</style><p>Nonconverging page</p>',
        url: 'https://example.com/',
        revision: 'unstable-layout',
      },
      null,
      controller.signal,
    );
    const observation = observeExpandedComposition({
      surface,
      frameId: 'home-mobile',
      revision: 'unstable-layout',
      viewport: { width: 390, height: 844 },
      signal: controller.signal,
      isPaused: () => false,
      resize: (height, signal) => {
        iframe.style.height = `${height}px`;
        return waitForCompositionLayout(signal);
      },
      onResult: (result) => results.push(result),
      onError: (error) => {
        throw error;
      },
    });
    await observation.ready;
    expect(results[0].status).toBe('round-limit');
    expect(results[0].measurements).toHaveLength(8);
    const height = iframe.clientHeight;
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 300);
    });
    expect(results).toHaveLength(1);
    expect(iframe.clientHeight).toBe(height);
  } finally {
    controller.abort();
    surface.destroy();
    iframe.remove();
  }
});

it('reports intrinsic imagery that loads after the initial document is ready', async () => {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:390px;height:844px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe, { observeLayout: true });
  const notices: import('./preview-document').PreviewLayoutChange[] = [];
  surface.onLayoutChange((change) => notices.push(change));
  const signal = new AbortController().signal;
  try {
    await surface.replaceDocument(
      {
        html: `<style>body{margin:0}img{display:block;width:390px}</style><img><script>window.addEventListener('message', event=>{if(event.data==='test-late-image') document.querySelector('img').src='data:image/svg+xml;base64,'+btoa('<svg xmlns="http://www.w3.org/2000/svg" width="390" height="1300"><rect width="390" height="1300" fill="blue"/></svg>');});</script>`,
        url: 'https://example.com/',
        revision: 'late-image',
      },
      null,
      signal,
    );
    const before = await surface.measureLayout(signal);
    iframe.contentWindow!.postMessage('test-late-image', '*');
    await expect.poll(() => notices.at(-1)?.document.height).toBe(1300);
    const after = await surface.measureLayout(signal);
    expect(after.documentInstanceId).toBe(before.documentInstanceId);
    expect(after.viewport).toEqual(before.viewport);
    expect(after.layoutGeneration).toBeGreaterThan(before.layoutGeneration!);
  } finally {
    surface.destroy();
    iframe.remove();
  }
});
