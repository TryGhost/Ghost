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
