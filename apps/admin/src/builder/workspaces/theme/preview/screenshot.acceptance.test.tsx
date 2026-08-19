import {afterEach, describe, expect, it} from 'vitest';

import {capturePreviewScreenshot} from './screenshot';

const iframes: HTMLIFrameElement[] = [];

async function createRenderedPreview(): Promise<HTMLIFrameElement> {
    const html = `
        <html>
            <head><style>body { margin: 0; } main { height: 900px; } #target { width: 120px; height: 80px; background: rgb(21, 71, 52); }</style></head>
            <body><main><h1>Rendered theme preview</h1><div id="target"></div><img width="64" height="48" loading="lazy" src="https://external.invalid/image.png" alt="external"></main></body>
        </html>
    `;
    const iframe = document.createElement('iframe');
    iframe.style.width = '320px';
    iframe.style.height = '180px';
    iframe.srcdoc = html;
    document.body.appendChild(iframe);
    iframes.push(iframe);
    await new Promise<void>((resolve) => {
        iframe.addEventListener('load', () => resolve(), {once: true});
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

        const viewport = await capturePreviewScreenshot(iframe, {kind: 'viewport'});
        const fullPage = await capturePreviewScreenshot(iframe, {kind: 'full_page'});
        const element = await capturePreviewScreenshot(iframe, {kind: 'element', selector: '#target'});

        expect(viewport.dataUrl).toMatch(/^data:image\/png;base64,/);
        expect(viewport.width).toBe(320);
        expect(viewport.height).toBe(180);
        expect(fullPage.height).toBeGreaterThan(viewport.height);
        expect(element.width).toBe(120);
        expect(element.height).toBe(80);
    });

    it('replaces external images and reports a warning instead of tainting the canvas', async () => {
        const iframe = await createRenderedPreview();

        const screenshot = await capturePreviewScreenshot(iframe, {kind: 'full_page'});

        expect(screenshot.dataUrl).toMatch(/^data:image\/png;base64,/);
        expect(screenshot.warnings).toEqual(['1 external image was replaced in the screenshot.']);
    });

    it('replaces an external image when that image is the element target', async () => {
        const iframe = await createRenderedPreview();

        const screenshot = await capturePreviewScreenshot(iframe, {kind: 'element', selector: 'img'});

        expect(screenshot.dataUrl).toMatch(/^data:image\/png;base64,/);
        expect(screenshot.width).toBe(64);
        expect(screenshot.height).toBe(48);
        expect(screenshot.warnings).toEqual(['1 external image was replaced in the screenshot.']);
    });
});
