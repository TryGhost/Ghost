import { expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { Box } from '@tryghost/shade/primitives';
import { renderInApp } from '@test-utils/acceptance/render-in-app';
import { CanvasHarness } from './canvas-harness';
import type { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';

// This journey includes separate bounded initial-load and accepted-render waits.
it(
  'edits real Source template text through the canvas and prevents a second retained draft',
  { timeout: 60_000 },
  async () => {
    const devices = new Map<string, IframePreviewDocumentSurface>();
    const signal = new AbortController().signal;
    const text = async (id: string, selector: string) =>
      (await devices.get(id)!.inspectElement({ selector }, signal)).text;
    const screen = await renderInApp(
      <Box style={{ width: 1500, height: 1100 }}>
        <CanvasHarness
          fixtureId="source"
          onDeviceSurface={(id, surface) => {
            if (surface) {
              devices.set(id, surface);
            } else {
              devices.delete(id);
            }
          }}
        />
      </Box>,
    );
    try {
      await expect
        .poll(
          () =>
            Array.from(document.querySelectorAll('[aria-live="polite"]')).filter(
              (element) => element.textContent === 'Ready',
            ).length,
          { timeout: 30_000 },
        )
        .toBe(4);
      await expect
        .element(page.getByRole('button', { name: 'Refresh captures', exact: true }))
        .toBeEnabled();
      await page.getByRole('button', { name: 'Home · Mobile', exact: true }).dblClick();
      const frame = (name: string) =>
        page.frameLocator(page.getByTitle(`${name} preview`, { exact: true }));
      const originalDevices = [...devices.entries()];
      await frame('Home · Mobile').getByRole('link', { name: 'Ghost', exact: true }).dblClick();
      const editor = frame('Home · Mobile').getByRole('textbox', { name: /^Edit Ghost/ });
      await editor.fill('Retained source draft');
      expect(document.querySelector('details pre')?.textContent).toContain('https://ghost.org/');
      await page.getByRole('button', { name: 'Back to overview', exact: true }).click();
      await page.getByRole('button', { name: 'Post · Mobile', exact: true }).dblClick();
      await frame('Post · Mobile').getByRole('link', { name: 'Ghost', exact: true }).dblClick();
      expect((await devices.get('post-mobile')!.measureLayout(signal)).localEdits.active).toBe(
        false,
      );
      expect(await text('home-mobile', '[contenteditable="plaintext-only"]')).toBe(
        'Retained source draft',
      );
      await expect
        .element(page.getByRole('button', { name: 'Resume text draft', exact: true }))
        .toBeVisible();
      await page.getByRole('button', { name: 'Resume text draft', exact: true }).click();
      // Opaque frames are asserted through their real bridge; parent DOM matchers
      // cannot inspect their content even though trusted browser actions can.
      expect(await text('home-mobile', '[contenteditable="plaintext-only"]')).toBe(
        'Retained source draft',
      );
      await editor.click();
      await userEvent.keyboard('{Enter}');
      await expect
        .poll(
          () => {
            const renderedDevices = Array.from(
              document.querySelectorAll('[data-fixture-revision]'),
            );
            return (
              renderedDevices.length === 4 &&
              renderedDevices.every((element) =>
                element.getAttribute('data-fixture-revision')?.endsWith(':edit-1'),
              )
            );
          },
          { timeout: 30_000 },
        )
        .toBe(true);
      expect([...devices.entries()]).toEqual(originalDevices);
      expect(document.querySelector('details')).toBeNull();
      for (const [id, device] of devices) {
        expect(await text(id, 'a[href="https://ghost.org/"]')).toBe('Retained source draft');
        expect((await device.measureLayout(signal)).localEdits.active).toBe(false);
      }
      await frame('Home · Mobile')
        .getByRole('link', { name: 'Retained source draft', exact: true })
        .dblClick();
      await frame('Home · Mobile')
        .getByRole('textbox', { name: /^Edit Retained/ })
        .fill('Cancelled second draft');
      await page.getByRole('button', { name: 'Cancel text draft', exact: true }).click();
      await expect
        .poll(() => text('home-mobile', 'a[href="https://ghost.org/"]'))
        .toBe('Retained source draft');
      expect((await devices.get('home-mobile')!.measureLayout(signal)).localEdits.active).toBe(
        false,
      );
    } finally {
      await screen.unmount();
    }
  },
);
