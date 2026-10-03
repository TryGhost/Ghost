import { expect, it } from 'vitest';

import { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';
import { getThemeFixture, instance, loadAssets } from './fixture';

type Result = {
  fixtureId: string;
  html?: Record<string, string>;
  editMarkerAttribute: string;
  error?: string;
};

it('serially renders complete Source and Casper fixtures without mixing templates or helper defaults', async () => {
  const worker = new Worker(new URL('./fixture.worker.ts', import.meta.url), { type: 'module' });
  const results: Result[] = [];
  const complete = new Promise<void>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<Result>) => {
      results.push(event.data);
      if (event.data.error) {
        reject(new Error(event.data.error));
      }
      if (results.length === 2) {
        resolve();
      }
    };
    worker.onerror = (event) => reject(new Error(event.message));
  });
  try {
    worker.postMessage({ fixtureId: 'source' });
    worker.postMessage({ fixtureId: 'casper' });
    await complete;
    expect(results.map((result) => result.fixtureId)).toEqual(['source', 'casper']);
    const source = new DOMParser().parseFromString(results[0].html!.home, 'text/html');
    const casper = new DOMParser().parseFromString(results[1].html!.home, 'text/html');
    expect(source.querySelectorAll('.gh-card')).toHaveLength(12);
    expect(source.querySelector('.gh-navigation')).not.toBeNull();
    expect(casper.querySelectorAll('.post-card')).toHaveLength(25);
    expect(casper.querySelector('.gh-card')).toBeNull();
    expect(results[0].html!.post).toContain('gh-article');
    expect(results[1].html!.post).toContain('article-title');
    expect(source.querySelector(`[${results[0].editMarkerAttribute}]`)).not.toBeNull();
  } finally {
    worker.terminate();
  }
});

it('embeds Source assets including fonts in its opaque fixed mobile preview', async () => {
  const fixture = getThemeFixture('source');
  const assets = await loadAssets('source');
  expect(assets['assets/fonts/inter-roman.woff2'].binary!.byteLength).toBeGreaterThan(1000);
  expect(assets['assets/built/source.js'].content).toBeTruthy();
  expect(assets['assets/built/casper.js']).toBeUndefined();
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:390px;height:844px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe);
  const signal = new AbortController().signal;
  try {
    await surface.replaceDocument(
      {
        html: '<link rel="stylesheet" href="/assets/built/screen.css"><body class="has-sans-title has-sans-body"><h1 class="gh-article-title">Source font and layout</h1></body>',
        assets,
        revision: fixture.revision,
        url: instance.siteUrl,
      },
      null,
      signal,
    );
    const encodedCss = /href="(data:text\/css[^"]+)"/.exec(iframe.srcdoc)![1];
    const css = atob(encodedCss.split(',')[1]);
    expect(css).toContain('data:font/woff2;base64,');
    expect(css).not.toContain('url("http://localhost:2368/assets/fonts/');
    const layout = await surface.measureLayout(signal);
    expect(layout.viewport).toMatchObject({ width: 390, height: 844 });
    expect((await surface.inspectPage(instance.siteUrl, signal)).text).toContain(
      'Source font and layout',
    );
    const screenshot = await surface.screenshot({ kind: 'viewport' }, signal);
    expect(screenshot).toMatchObject({ width: 390, height: 844, warnings: [] });
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
  } finally {
    surface.destroy();
    iframe.remove();
  }
});
