import { expect, it } from 'vitest';

import { fakeFrameImage, getFrameImageRequests } from '../../../../../test-utils/acceptance/frames';
import imageUrl from '../../../../../../../ghost/core/test/utils/fixtures/images/ghost-logo.png?url';
import { IframePreviewDocumentSurface } from './preview-document';

async function fixturePng() {
  const response = await fetch(imageUrl);
  const bytes = new Uint8Array(await response.arrayBuffer());
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
}
async function pixels(dataUrl: string, width = 64, height = 64) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return [...context.getImageData(0, 0, width, height).data];
}
async function expectSamePixels(actualUrl: string, expectedUrl: string, width = 64, height = 64) {
  const actual = await pixels(actualUrl, width, height);
  const expected = await pixels(expectedUrl, width, height);
  // Keep failures bounded while comparing every channel of the real image.
  expect(
    actual.reduce(
      (difference, value, index) => Math.max(difference, Math.abs(value - expected[index])),
      0,
    ),
  ).toBe(0);
}

it('preserves actual draft image and CSS-background pixels through the existing asset resolver', async () => {
  const png = await fixturePng();
  const url = 'https://site.example/assets/images/cover.png';
  await fakeFrameImage(url, png, false);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:390px;height:844px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe, { captureLoadedImages: true });
  const signal = new AbortController().signal;
  try {
    await surface.replaceDocument(
      {
        html: '<link rel="stylesheet" href="/assets/built/test.css"><img data-edit="index.hbs:1:1" src="/assets/images/cover.png"><div data-edit="index.hbs:2:1" class="background"></div>',
        url: 'https://site.example/',
        revision: 'draft-image-1',
        assets: {
          'assets/images/cover.png': {
            content: null,
            binary: Uint8Array.from(atob(png), (character) => character.charCodeAt(0)),
          },
          'assets/built/test.css': {
            content:
              'body{margin:0;background:white}img,.background{display:block;width:64px;height:64px}.background{background:url(../images/cover.png) center/100% 100% no-repeat}',
            binary: null,
          },
        },
      },
      null,
      signal,
    );
    const before = await surface.measureLayout(signal);
    for (const marker of ['index.hbs:1:1', 'index.hbs:2:1']) {
      const capture = await surface.screenshot({ kind: 'element', marker }, signal);
      await expectSamePixels(capture.dataUrl, `data:image/png;base64,${png}`);
      expect(capture.warnings).not.toContain('1 external image was replaced in the screenshot.');
    }
    expect(await surface.measureLayout(signal)).toEqual(before);
    expect(await getFrameImageRequests()).toEqual([]);
  } finally {
    surface.destroy();
    iframe.remove();
  }
});

it('keeps surrounding layout when omitting bordered, padded and transformed images', async () => {
  const bitmap = document.createElement('canvas');
  bitmap.width = 5000;
  bitmap.height = 1;
  const reference = document.createElement('canvas');
  reference.width = 32;
  reference.height = 32;
  const context = reference.getContext('2d')!;
  context.fillStyle = 'blue';
  context.fillRect(0, 0, 32, 32);
  for (const boxSizing of ['content-box', 'border-box']) {
    for (const transform of ['none', 'scale(2)']) {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'width:390px;height:844px;border:0';
      document.body.appendChild(iframe);
      const surface = new IframePreviewDocumentSurface(iframe, { captureLoadedImages: true });
      const signal = new AbortController().signal;
      try {
        await surface.replaceDocument(
          {
            html: `<style>body{margin:0;background:white}img{display:block;width:64px;height:64px;padding:10px;border:2px solid;box-sizing:${boxSizing};transform:${transform};transform-origin:top left}div{margin-left:250px;width:32px;height:32px;background:blue}</style><img src="${bitmap.toDataURL()}"><div data-edit="index.hbs:2:1"></div>`,
            url: 'https://site.example/',
            revision: 'omission-layout-1',
          },
          null,
          signal,
        );
        const before = await surface.measureLayout(signal);
        const following = await surface.inspectElement({ marker: 'index.hbs:2:1' }, signal);
        const capture = await surface.screenshot({ kind: 'region', ...following.box }, signal);
        await expectSamePixels(capture.dataUrl, reference.toDataURL(), 32, 32);
        expect(capture.warnings).toContain('1 image exceeded the snapshot bitmap limits.');
        expect(await surface.measureLayout(signal)).toEqual(before);
      } finally {
        surface.destroy();
        iframe.remove();
      }
    }
  }
});

it('preserves responsive image detail at the displayed size and density-corrected intrinsic layout', async () => {
  const bitmap = document.createElement('canvas');
  bitmap.width = 128;
  bitmap.height = 128;
  const context = bitmap.getContext('2d')!;
  for (let x = 0; x < 128; x++) {
    context.fillStyle = x % 2 ? 'red' : 'blue';
    context.fillRect(x, 0, 1, 128);
  }
  const png = bitmap.toDataURL();
  for (const descriptor of ['2x', '128w']) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:390px;height:844px;border:0';
    document.body.appendChild(iframe);
    const surface = new IframePreviewDocumentSurface(iframe, { captureLoadedImages: true });
    const signal = new AbortController().signal;
    try {
      await surface.replaceDocument(
        {
          html: `<style>body{margin:0;background:white}img{display:block}.scaled{width:128px;height:128px}div{width:64px;height:64px;background:blue}</style><img class="scaled" data-edit="index.hbs:1:1" srcset="${png} ${descriptor}" sizes="64px"><img srcset="${png} ${descriptor}" sizes="64px"><div data-edit="index.hbs:3:1"></div>`,
          url: 'https://site.example/',
          revision: 'density-1',
        },
        null,
        signal,
      );
      const before = await surface.measureLayout(signal);
      const following = await surface.inspectElement({ marker: 'index.hbs:3:1' }, signal);
      expect(following.box.y).toBe(192);
      const capture = await surface.screenshot(
        { kind: 'element', marker: 'index.hbs:1:1' },
        signal,
      );
      await expectSamePixels(capture.dataUrl, png, 128, 128);
      const after = await surface.screenshot({ kind: 'region', ...following.box }, signal);
      expect((await pixels(after.dataUrl)).slice(0, 4)).toEqual([0, 0, 255, 255]);
      expect(await surface.measureLayout(signal)).toEqual(before);
    } finally {
      surface.destroy();
      iframe.remove();
    }
  }
});

it('preserves intrinsic image contributions to flex allocation around sibling pixels', async () => {
  const bitmap = document.createElement('canvas');
  bitmap.width = 128;
  bitmap.height = 128;
  const context = bitmap.getContext('2d')!;
  context.fillStyle = 'red';
  context.fillRect(0, 0, 128, 128);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:390px;height:844px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe, { captureLoadedImages: true });
  const signal = new AbortController().signal;
  try {
    await surface.replaceDocument(
      {
        html: `<style>body{margin:0;background:white}.row{display:flex;width:128px}img{min-width:0}.sibling{width:128px;background:blue}</style><div class="row"><img src="${bitmap.toDataURL()}"><div class="sibling" data-edit="index.hbs:2:1"></div></div>`,
        url: 'https://site.example/',
        revision: 'flex-image-1',
      },
      null,
      signal,
    );
    const before = await surface.measureLayout(signal);
    const sibling = await surface.inspectElement({ marker: 'index.hbs:2:1' }, signal);
    expect(sibling.box.x).toBe(64);
    const capture = await surface.screenshot(
      { kind: 'region', x: 48, y: 0, width: 8, height: 8 },
      signal,
    );
    expect(await pixels(capture.dataUrl, 8, 8)).toEqual(
      Array.from({ length: 64 }, () => [255, 0, 0, 255]).flat(),
    );
    expect(await surface.measureLayout(signal)).toEqual(before);
  } finally {
    surface.destroy();
    iframe.remove();
  }
});

it('preserves flex allocation when omitting an over-budget image', async () => {
  const bitmap = document.createElement('canvas');
  bitmap.width = 5000;
  bitmap.height = 1;
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:390px;height:844px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe, { captureLoadedImages: true });
  const signal = new AbortController().signal;
  try {
    await surface.replaceDocument(
      {
        html: `<style>body{margin:0;background:white}.row{display:flex;width:128px}img{width:128px;height:128px;min-width:0}.sibling{width:128px;background:blue}</style><div class="row"><img src="${bitmap.toDataURL()}"><div class="sibling" data-edit="index.hbs:2:1"></div></div>`,
        url: 'https://site.example/',
        revision: 'flex-omission-1',
      },
      null,
      signal,
    );
    expect((await surface.inspectElement({ marker: 'index.hbs:2:1' }, signal)).box.x).toBe(64);
    const capture = await surface.screenshot(
      { kind: 'region', x: 48, y: 0, width: 8, height: 8 },
      signal,
    );
    expect(
      (await pixels(capture.dataUrl, 8, 8)).every(
        (value, index) => value === [243, 244, 246, 255][index % 4],
      ),
    ).toBe(true);
    expect(capture.warnings).toContain('1 image exceeded the snapshot bitmap limits.');
  } finally {
    surface.destroy();
    iframe.remove();
  }
});

it('keeps broken image fallback layout when intrinsic dimensions are unknown', async () => {
  const url = 'https://image-fixture.example/broken.png';
  await fakeFrameImage(url, '', true);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:390px;height:844px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe, { captureLoadedImages: true });
  const signal = new AbortController().signal;
  try {
    await surface.replaceDocument(
      {
        html: `<style>body{margin:0;background:white}img{display:block}div{width:64px;height:64px;background:blue}</style><img src="${url}" alt="Unavailable cover image"><div data-edit="index.hbs:2:1"></div>`,
        url: 'https://site.example/',
        revision: 'unknown-image-1',
      },
      null,
      signal,
    );
    const before = await surface.measureLayout(signal);
    const following = await surface.inspectElement({ marker: 'index.hbs:2:1' }, signal);
    expect(following.box.y).toBeGreaterThan(0);
    const capture = await surface.screenshot({ kind: 'region', ...following.box }, signal);
    expect(
      (await pixels(capture.dataUrl)).every(
        (value, index) => value === [0, 0, 255, 255][index % 4],
      ),
    ).toBe(true);
    expect(await surface.measureLayout(signal)).toEqual(before);
    expect(await getFrameImageRequests()).toEqual([url]);
    expect(capture.warnings).toEqual([
      '1 image was omitted because loaded pixels were unavailable or exceeded the bitmap budget.',
    ]);
  } finally {
    surface.destroy();
    iframe.remove();
  }
});

it('preserves blank pending lazy-image layout without inventing a broken-image fallback', async () => {
  const url = 'https://image-fixture.example/dimensionless-lazy.png';
  await fakeFrameImage(url, await fixturePng(), true);
  for (const alt of ['', 'Unavailable cover image']) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:390px;height:844px;border:0';
    document.body.appendChild(iframe);
    const surface = new IframePreviewDocumentSurface(iframe, { captureLoadedImages: true });
    const signal = new AbortController().signal;
    try {
      await surface.replaceDocument(
        {
          html: `<style>body{margin:0;background:white}.spacer{height:12000px}img{display:block}.following{width:64px;height:64px;background:blue}</style><div class="spacer"></div><img loading="lazy" crossorigin="anonymous" src="${url}" alt="${alt}"><div class="following" data-edit="index.hbs:2:1"></div>`,
          url: 'https://site.example/',
          revision: 'pending-image-1',
        },
        null,
        signal,
      );
      const before = await surface.measureLayout(signal);
      const following = await surface.inspectElement({ marker: 'index.hbs:2:1' }, signal);
      expect(following.box.y).toBe(12000);
      const capture = await surface.screenshot({ kind: 'region', ...following.box }, signal);
      expect(
        (await pixels(capture.dataUrl)).every(
          (value, index) => value === [0, 0, 255, 255][index % 4],
        ),
      ).toBe(true);
      expect(await surface.measureLayout(signal)).toEqual(before);
      expect(await getFrameImageRequests()).toEqual([]);
    } finally {
      surface.destroy();
      iframe.remove();
    }
  }
});

it('keeps missing and empty image sources blank without creating a failure icon', async () => {
  await fakeFrameImage('https://site.example/', await fixturePng(), false);
  for (const source of ['', 'src=""']) {
    for (const alt of ['', 'alt="Unavailable cover image"']) {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'width:390px;height:844px;border:0';
      document.body.appendChild(iframe);
      const surface = new IframePreviewDocumentSurface(iframe, { captureLoadedImages: true });
      const signal = new AbortController().signal;
      try {
        await surface.replaceDocument(
          {
            html: `<style>body{margin:0;background:white}img{display:block}div{width:64px;height:64px;background:blue}</style><img ${source} ${alt}><div data-edit="index.hbs:2:1"></div>`,
            url: 'https://site.example/',
            revision: 'missing-source-1',
          },
          null,
          signal,
        );
        const before = await surface.measureLayout(signal);
        const following = await surface.inspectElement({ marker: 'index.hbs:2:1' }, signal);
        const capture = await surface.screenshot({ kind: 'region', ...following.box }, signal);
        expect(
          (await pixels(capture.dataUrl)).every(
            (value, index) => value === [0, 0, 255, 255][index % 4],
          ),
        ).toBe(true);
        expect(await surface.measureLayout(signal)).toEqual(before);
        expect(await getFrameImageRequests()).toEqual([]);
      } finally {
        surface.destroy();
        iframe.remove();
      }
    }
  }
});

it('keeps failed and unselected responsive-source fallback layout without repeating requests', async () => {
  await fakeFrameImage('https://site.example/', await fixturePng(), false);
  const url = 'https://image-fixture.example/broken-responsive.png';
  await fakeFrameImage(url, '', true);
  for (const kind of ['srcset', 'picture', 'unselected']) {
    for (const alt of ['', 'alt="Unavailable cover image"']) {
      const img =
        kind === 'srcset'
          ? `<img srcset="${url} 2x" ${alt}>`
          : kind === 'picture'
            ? `<picture><source srcset="${url}"><img ${alt}></picture>`
            : `<img srcset="invalid 0x" ${alt}>`;
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'width:390px;height:844px;border:0';
      document.body.appendChild(iframe);
      const surface = new IframePreviewDocumentSurface(iframe, { captureLoadedImages: true });
      const signal = new AbortController().signal;
      try {
        await surface.replaceDocument(
          {
            html: `<style>body{margin:0;background:white}img{display:block}div{width:64px;height:64px;background:blue}</style>${img}<div data-edit="index.hbs:2:1"></div>`,
            url: 'https://site.example/',
            revision: 'failed-responsive-1',
          },
          null,
          signal,
        );
        const before = await surface.measureLayout(signal);
        const requests = await getFrameImageRequests();
        const following = await surface.inspectElement({ marker: 'index.hbs:2:1' }, signal);
        const capture = await surface.screenshot({ kind: 'region', ...following.box }, signal);
        expect(
          (await pixels(capture.dataUrl)).every(
            (value, index) => value === [0, 0, 255, 255][index % 4],
          ),
          `${kind}:${alt}:${following.box.y}`,
        ).toBe(true);
        expect(await surface.measureLayout(signal)).toEqual(before);
        expect(await getFrameImageRequests()).toEqual(requests);
      } finally {
        surface.destroy();
        iframe.remove();
      }
    }
  }
});

it('does not fetch the site base URL for empty-source omissions on the capture origin', async () => {
  const base = `${location.origin}/snapshot-empty-fallback/`;
  const broken = 'https://image-fixture.example/same-origin-broken.png';
  await fakeFrameImage(base, await fixturePng(), false);
  await fakeFrameImage(broken, '', false);
  for (const img of ['<img src="">', `<img srcset="${broken} 2x">`]) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:390px;height:844px;border:0';
    document.body.appendChild(iframe);
    const surface = new IframePreviewDocumentSurface(iframe, { captureLoadedImages: true });
    const signal = new AbortController().signal;
    try {
      await surface.replaceDocument(
        {
          html: `<style>body{margin:0}img{display:block}div{height:64px;background:blue}</style>${img}<div></div>`,
          url: base,
          revision: 'same-origin-empty-1',
        },
        null,
        signal,
      );
      const requests = await getFrameImageRequests();
      await surface.screenshot({ kind: 'viewport' }, signal);
      expect(await getFrameImageRequests()).toEqual(requests);
    } finally {
      surface.destroy();
      iframe.remove();
    }
  }
});

it('applies image dimension limits to the actual raster needed for the displayed size', async () => {
  const bitmap = document.createElement('canvas');
  bitmap.width = 2;
  bitmap.height = 2;
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:390px;height:844px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe, { captureLoadedImages: true });
  const signal = new AbortController().signal;
  try {
    await surface.replaceDocument(
      {
        html: `<style>body{margin:0}img{display:block;width:5000px;height:5000px}</style><img src="${bitmap.toDataURL()}">`,
        url: 'https://site.example/',
        revision: 'displayed-limit-1',
      },
      null,
      signal,
    );
    const capture = await surface.screenshot(
      { kind: 'region', x: 0, y: 0, width: 64, height: 64 },
      signal,
    );
    expect(capture.warnings).toEqual([
      '1 image was omitted because loaded pixels were unavailable or exceeded the bitmap budget.',
      '1 image exceeded the snapshot bitmap limits.',
    ]);
  } finally {
    surface.destroy();
    iframe.remove();
  }
});

it('captures an already loaded CORS-readable real image without fetching it again, changing the live image or weakening the sandbox', async () => {
  const png = await fixturePng();
  const url = 'https://image-fixture.example/readable.png';
  await fakeFrameImage(url, png, true);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:390px;height:844px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe, { captureLoadedImages: true });
  const signal = new AbortController().signal;
  try {
    await surface.replaceDocument(
      {
        html: `<style>body{margin:0;background:white}img{display:block;width:64px;height:64px}</style><img data-edit="index.hbs:1:1" crossorigin="anonymous" src="${url}">`,
        url: 'https://site.example/',
        revision: 'images-1',
      },
      null,
      signal,
    );
    const before = await surface.inspectElement({ marker: 'index.hbs:1:1' }, signal);
    const layout = await surface.measureLayout(signal);
    const capture = await surface.screenshot({ kind: 'element', marker: 'index.hbs:1:1' }, signal);
    await expectSamePixels(capture.dataUrl, `data:image/png;base64,${png}`);
    expect(capture.warnings).toEqual([
      '1 loaded image was frozen as a readable bitmap; animation is captured at one instant.',
    ]);
    expect(await getFrameImageRequests()).toEqual([url]);
    expect(await surface.inspectElement({ marker: 'index.hbs:1:1' }, signal)).toEqual(before);
    expect(await surface.measureLayout(signal)).toEqual(layout);
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
    expect(document.querySelector('iframe[sandbox="allow-same-origin"]')).toBeNull();
  } finally {
    surface.destroy();
    iframe.remove();
  }
});

it('freezes the chosen picture source while leaving unreadable remote imagery explicitly omitted', async () => {
  const png = await fixturePng();
  const readable = 'https://image-fixture.example/picture.png';
  const denied = 'https://image-fixture.example/unreadable.png';
  await fakeFrameImage(readable, png, true);
  await fakeFrameImage(denied, png, false);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:390px;height:844px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe, { captureLoadedImages: true });
  const signal = new AbortController().signal;
  try {
    await surface.replaceDocument(
      {
        html: `<style>body{margin:0;background:white}img{display:block;width:64px;height:64px}</style><picture><source srcset="${readable}"><img data-edit="index.hbs:1:1" crossorigin="anonymous" src="${denied}"></picture><img src="${denied}" alt="Unreadable publication cover">`,
        url: 'https://site.example/',
        revision: 'picture-1',
      },
      null,
      signal,
    );
    const selected = await surface.screenshot({ kind: 'element', marker: 'index.hbs:1:1' }, signal);
    await expectSamePixels(selected.dataUrl, `data:image/png;base64,${png}`);
    const whole = await surface.screenshot({ kind: 'viewport' }, signal);
    expect(whole.warnings).toContain('1 external image was replaced in the screenshot.');
    expect((await getFrameImageRequests()).filter((request) => request === readable)).toEqual([
      readable,
    ]);
  } finally {
    surface.destroy();
    iframe.remove();
  }
});

it('captures decoded blob pixels after the original blob URL has been revoked', async () => {
  const png = await fixturePng();
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:390px;height:844px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe, { captureLoadedImages: true });
  const signal = new AbortController().signal;
  try {
    await surface.replaceDocument(
      {
        html: `<style>body{margin:0;background:white}img{display:block;width:64px;height:64px}</style><img data-edit="index.hbs:1:1"><script>const bytes=Uint8Array.from(atob('${png}'),c=>c.charCodeAt(0));const image=document.querySelector('img');image.src=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));window.addEventListener('load',()=>URL.revokeObjectURL(image.src));</script>`,
        url: 'https://site.example/',
        revision: 'blob-1',
      },
      null,
      signal,
    );
    const capture = await surface.screenshot({ kind: 'element', marker: 'index.hbs:1:1' }, signal);
    await expectSamePixels(capture.dataUrl, `data:image/png;base64,${png}`);
    expect(capture.warnings).toEqual([
      '1 loaded image was frozen as a readable bitmap; animation is captured at one instant.',
    ]);
    expect(await getFrameImageRequests()).toEqual([]);
  } finally {
    surface.destroy();
    iframe.remove();
  }
});

it('does not load below-fold lazy imagery to manufacture a faithful capture', async () => {
  const url = 'https://image-fixture.example/unloaded.png';
  await fakeFrameImage(url, await fixturePng(), true);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:390px;height:844px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe, { captureLoadedImages: true });
  const signal = new AbortController().signal;
  try {
    await surface.replaceDocument(
      {
        html: `<style>body{margin:0}img{display:block;width:64px;height:64px;margin-top:12000px}</style><img loading="lazy" crossorigin="anonymous" src="${url}">`,
        url: 'https://site.example/',
        revision: 'lazy-1',
      },
      null,
      signal,
    );
    expect(await getFrameImageRequests()).toEqual([]);
    const before = await surface.measureLayout(signal);
    const capture = await surface.screenshot(
      { kind: 'region', x: 0, y: 12000, width: 64, height: 64 },
      signal,
    );
    expect(capture.warnings).toEqual([
      '1 image was omitted because loaded pixels were unavailable or exceeded the bitmap budget.',
    ]);
    expect(await getFrameImageRequests()).toEqual([]);
    expect(await surface.measureLayout(signal)).toEqual(before);
  } finally {
    surface.destroy();
    iframe.remove();
  }
});

it('reports dimension and image-count limits without adopting their omitted pixels', async () => {
  const large = document.createElement('canvas');
  large.width = 5000;
  large.height = 1;
  const tiny = document.createElement('canvas');
  tiny.width = 2;
  tiny.height = 2;
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:390px;height:844px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe, { captureLoadedImages: true });
  const signal = new AbortController().signal;
  try {
    await surface.replaceDocument(
      {
        html: `<style>body{margin:0}img{display:block;width:64px;height:2px}</style><img src="${large.toDataURL()}">${Array.from({ length: 17 }, () => `<img src="${tiny.toDataURL()}">`).join('')}`,
        url: 'https://site.example/',
        revision: 'limits-1',
      },
      null,
      signal,
    );
    const capture = await surface.screenshot({ kind: 'viewport' }, signal);
    expect(capture.warnings).toEqual([
      '16 loaded images were frozen as a readable bitmap; animation is captured at one instant.',
      '2 images were omitted because loaded pixels were unavailable or exceeded the bitmap budget.',
      '2 images exceeded the snapshot bitmap limits.',
    ]);
  } finally {
    surface.destroy();
    iframe.remove();
  }
});

it('omits an encoded real bitmap that exceeds the per-image character budget', async () => {
  const image = document.createElement('canvas');
  image.width = 800;
  image.height = 600;
  const context = image.getContext('2d')!;
  const data = context.createImageData(image.width, image.height);
  let seed = 123;
  for (let index = 0; index < data.data.length; index += 4) {
    for (let channel = 0; channel < 3; channel++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data.data[index + channel] = seed >>> 24;
    }
    data.data[index + 3] = 255;
  }
  context.putImageData(data, 0, 0);
  const png = image.toDataURL();
  expect(png.length).toBeGreaterThan(1024 * 1024);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:390px;height:844px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe, { captureLoadedImages: true });
  const signal = new AbortController().signal;
  try {
    await surface.replaceDocument(
      {
        html: `<style>body{margin:0}img{display:block;width:64px;height:64px}</style><img src="${png}">`,
        url: 'https://site.example/',
        revision: 'encoded-1',
      },
      null,
      signal,
    );
    const capture = await surface.screenshot({ kind: 'viewport' }, signal);
    expect(capture.warnings).toEqual([
      '1 image was omitted because loaded pixels were unavailable or exceeded the bitmap budget.',
      '1 image exceeded the snapshot bitmap limits.',
    ]);
  } finally {
    surface.destroy();
    iframe.remove();
  }
});

it('rejects a forged non-PNG canvas encoder result instead of adding an image fetch', async () => {
  const png = await fixturePng();
  const injected = 'https://image-fixture.example/injected.png';
  await fakeFrameImage(injected, png, false);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:390px;height:844px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe, { captureLoadedImages: true });
  const signal = new AbortController().signal;
  try {
    await surface.replaceDocument(
      {
        html: `<style>body{margin:0}img{width:64px;height:64px}</style><img src="data:image/png;base64,${png}"><script>HTMLCanvasElement.prototype.toDataURL=()=> '${injected}';</script>`,
        url: 'https://site.example/',
        revision: 'forged-image-1',
      },
      null,
      signal,
    );
    const capture = await surface.screenshot({ kind: 'viewport' }, signal);
    expect(capture.warnings).toEqual([
      '1 image was omitted because loaded pixels were unavailable or exceeded the bitmap budget.',
    ]);
    expect(await getFrameImageRequests()).toEqual([]);
  } finally {
    surface.destroy();
    iframe.remove();
  }
});
