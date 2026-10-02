import { expect, it } from 'vitest';

import { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';
import {
  EXPANDED_COMPOSITION_LIMITS,
  measureExpandedComposition,
  waitForCompositionLayout,
} from './measure-expanded-composition';

async function pixel(dataUrl: string) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d')!;
  context.drawImage(image, 0, 0);
  return [...context.getImageData(180, 50, 1, 1).data];
}

async function pair(html: string) {
  const signal = new AbortController().signal;
  const iframes = [document.createElement('iframe'), document.createElement('iframe')];
  for (const iframe of iframes) {
    iframe.style.cssText = 'width:390px;height:844px;border:0';
    document.body.appendChild(iframe);
  }
  const [device, composition] = iframes.map((iframe) => new IframePreviewDocumentSurface(iframe));
  await Promise.all(
    [device, composition].map((surface) =>
      surface.replaceDocument(
        {
          html,
          revision: 'comparison-1',
          url: 'https://example.com/',
        },
        null,
        signal,
      ),
    ),
  );
  return {
    device,
    composition,
    iframes,
    signal,
    measure: () =>
      measureExpandedComposition(
        composition,
        (height, resizeSignal) => {
          iframes[1].style.height = `${height}px`;
          return waitForCompositionLayout(resizeSignal);
        },
        'home-mobile',
        'comparison-1',
        signal,
      ),
    dispose: () => {
      device.destroy();
      composition.destroy();
      iframes.forEach((iframe) => iframe.remove());
    },
  };
}

it('settles an independent composition while exposing a real height-media-query fidelity difference', async () => {
  const value = await pair(
    `<style>body{margin:0}.query{height:100px;background:rgb(0,255,0)}.tail{height:2000px}@media(min-height:1000px){.query{background:rgb(255,0,0)}}</style><div class="query"></div><div class="tail"></div><script>window.scrollTo(0,123)</script>`,
  );
  try {
    const deviceBefore = await value.device.measureLayout(value.signal);
    const sourceBefore = value.iframes[0].srcdoc;
    const result = await value.measure();
    expect(result.status).toBe('settled');
    expect(result.viewport).toMatchObject({ width: 390, height: 2100 });
    expect(result.configuredViewport).toEqual({ width: 390, height: 844 });
    const region = { kind: 'region' as const, x: 0, y: 0, width: 390, height: 100 };
    expect(await pixel((await value.device.screenshot(region, value.signal)).dataUrl)).toEqual([
      0, 255, 0, 255,
    ]);
    expect(await pixel((await value.composition.screenshot(region, value.signal)).dataUrl)).toEqual(
      [255, 0, 0, 255],
    );
    expect(await value.device.measureLayout(value.signal)).toEqual(deviceBefore);
    expect(value.iframes[0].srcdoc).toBe(sourceBefore);
    expect(
      value.iframes.every((iframe) => iframe.getAttribute('sandbox') === 'allow-scripts'),
    ).toBe(true);
  } finally {
    value.dispose();
  }
});

it.each(['vh', 'svh', 'dvh'])(
  'bounds nonconverging 100%s growth without resizing the device',
  async (unit) => {
    const value = await pair(
      `<style>body{margin:0}.hero{height:100${unit}}.tail{height:100px}</style><div class="hero">Hero</div><div class="tail"></div>`,
    );
    try {
      const before = await value.device.measureLayout(value.signal);
      const result = await value.measure();
      expect(result.status).toBe('round-limit');
      expect(result.measurements).toHaveLength(EXPANDED_COMPOSITION_LIMITS.maxRounds);
      expect(result.document.height).toBe(result.viewport.height + 100);
      expect(result.viewport.height).toBeLessThanOrEqual(EXPANDED_COMPOSITION_LIMITS.maxHeight);
      expect(await value.device.measureLayout(value.signal)).toEqual(before);
      expect(before.viewport.height).toBe(844);
    } finally {
      value.dispose();
    }
  },
);

it('reports a genuinely truncated long composition and keeps the full fixed-device extent', async () => {
  const value = await pair(
    '<style>body{margin:0}.tail{height:100000px}</style><div class="tail">Long content</div>',
  );
  try {
    const before = await value.device.measureLayout(value.signal);
    const result = await value.measure();
    expect(result.status).toBe('height-limit');
    expect(result.document.height).toBe(100_000);
    expect(result.viewport.height).toBe(EXPANDED_COMPOSITION_LIMITS.maxHeight);
    expect(result.warnings.join(' ')).toContain('truncated');
    expect(await value.device.measureLayout(value.signal)).toEqual(before);
  } finally {
    value.dispose();
  }
});
