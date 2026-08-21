import path from 'node:path';
import {expect, test} from '@playwright/test';

const runtimePath = path.resolve(import.meta.dirname, '../../../../../ghost/core/core/frontend/src/cards/js/artifact.js');

function card(id: string, html: string) {
    const payload = JSON.stringify({
        id,
        version: 1,
        title: 'Interactive chart',
        description: '',
        html
    }).replaceAll('<', '\\u003c');

    return `
        <figure class="kg-card kg-artifact-card" id="artifact-${id}" data-artifact-id="${id}" data-artifact-title="Interactive chart">
            <div class="kg-artifact-card-fallback"><strong class="kg-artifact-card-title">Interactive chart</strong></div>
            <script type="application/json" class="kg-artifact-card-data">${payload}</script>
        </figure>
    `;
}

test('runs public Artifacts in an opaque responsive sandbox and preserves startup failures', async ({page}) => {
    await page.clock.install();
    const workingHtml = `<!doctype html><html><head><title>Interactive chart</title></head><body>
        <button id="counter">0</button>
        <a href="https://example.com/details">Details</a>
        <a id="self-link" href="https://example.com/self" target="_self">Self</a>
        <div style="height: 640px"></div>
        <script>document.querySelector('#counter').textContent = 'Ready';</script>
    </body></html>`;
    const brokenHtml = `<!doctype html><html><head><title>Broken embed</title><script async src="https://artifact.test/fail.js"></script></head><body>
        <p>Waiting for startup</p>
    </body></html>`;
    const stalledHtml = `<!doctype html><html><head><title>Stalled embed</title><script async src="https://artifact.test/hang.js"></script></head><body>
        <p>Waiting forever</p>
    </body></html>`;

    await page.route('https://artifact.test/fail.js', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        await route.fulfill({contentType: 'text/javascript', body: 'throw new Error("async startup failed");'});
    });
    await page.route('https://artifact.test/hang.js', () => {});
    await page.setContent(`<!doctype html><html><body>${card('working', workingHtml)}${card('broken', brokenHtml)}${card('stalled', stalledHtml)}</body></html>`);
    await page.addScriptTag({path: runtimePath});

    const working = page.locator('#artifact-working');
    const workingFrame = working.locator('iframe');
    await expect(working).toHaveAttribute('data-state', 'ready');
    await expect(workingFrame).toBeVisible();
    await expect(workingFrame).toHaveJSProperty('contentDocument', null);
    await expect(workingFrame).toHaveAttribute('sandbox', /allow-scripts/);
    await expect(workingFrame).not.toHaveAttribute('sandbox', /allow-same-origin/);
    await expect.poll(async () => workingFrame.evaluate(frame => Number.parseInt((frame as HTMLIFrameElement).style.height))).toBeGreaterThan(600);
    await expect(workingFrame.contentFrame().locator('#counter')).toHaveText('Ready');
    await expect(workingFrame.contentFrame().getByRole('link', {name: 'Details'})).toHaveAttribute('target', '_top');
    await expect(workingFrame.contentFrame().locator('#self-link')).toHaveAttribute('target', '_top');

    const broken = page.locator('#artifact-broken');
    await expect(broken).toHaveAttribute('data-state', 'failed');
    await expect(broken.locator('iframe')).toHaveCount(0);
    await expect(broken.locator('.kg-artifact-card-error')).toHaveText('This embed couldn’t load');
    await expect(broken.locator('.kg-artifact-card-retry')).toBeVisible();

    const stalled = page.locator('#artifact-stalled');
    await expect(stalled).toHaveAttribute('data-state', 'ready');
    await page.clock.fastForward(10_001);
    await expect(stalled).toHaveAttribute('data-state', 'failed');
    await expect(stalled.locator('iframe')).toHaveCount(0);
});
