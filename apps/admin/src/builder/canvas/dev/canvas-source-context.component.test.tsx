import { expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { Box } from '@tryghost/shade/primitives';
import { renderInApp } from '@test-utils/acceptance/render-in-app';
import { CanvasHarness } from './canvas-harness';
import type { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';

it(
  'keeps source peek keyboard dismissal, selection replacement and retained draft interaction current',
  { timeout: 60_000 },
  async () => {
    await commands.canvasPointerViewport(true);
    const surfaces = new Map<string, IframePreviewDocumentSurface>();
    const screen = await renderInApp(
      <Box style={{ width: 1500, height: 1100 }}>
        <CanvasHarness
          fixtureId="source"
          onCompositionSurface={(id, surface) => {
            if (surface) {
              surfaces.set(id, surface);
            }
          }}
        />
      </Box>,
    );
    const footer = (label: string) =>
      page
        .frameLocator(page.getByTitle(`${label} composition`, { exact: true }))
        .getByRole('link', { name: 'Ghost', exact: true });
    const source = page.getByRole('button', { name: 'View template source', exact: true });
    try {
      await expect
        .poll(() => document.querySelectorAll('iframe[data-preview-status="Ready"]').length, {
          timeout: 30_000,
        })
        .toBe(8);
      await footer('Home · Mobile').hover();
      await footer('Home · Mobile').click();
      await source.click();
      await expect.element(page.getByRole('dialog', { name: 'Template source' })).toBeVisible();
      await userEvent.keyboard('{Escape}');
      await expect.poll(() => document.querySelector('[data-source-context]')).toBeNull();
      expect(document.activeElement).toBe(source.element());
      await footer('Home · Mobile').hover();
      await footer('Home · Mobile').dblClick();
      const editor = page
        .frameLocator(page.getByTitle('Home · Mobile composition', { exact: true }))
        .getByRole('textbox', { name: /^Edit Ghost/ });
      await editor.fill('Source popover retained draft');
      await source.click();
      await expect.element(page.getByRole('dialog', { name: 'Template source' })).toBeVisible();
      await userEvent.keyboard('{Escape}');
      await expect.poll(() => document.querySelector('[data-source-context]')).toBeNull();
      expect(
        (
          await surfaces
            .get('home-mobile')!
            .inspectElement({ selector: '[role="textbox"]' }, new AbortController().signal)
        ).text,
      ).toBe('Source popover retained draft');
      await page.getByRole('button', { name: 'Fit Post', exact: true }).click();
      await source.click();
      await footer('Post · Desktop').hover();
      await footer('Post · Desktop').click();
      await expect.poll(() => document.querySelector('[data-source-context]')).toBeNull();
      const postIframe = document.querySelector('iframe[title="Post · Desktop composition"]');
      expect.soft(document.activeElement).toBe(postIframe);
      expect(
        (
          await surfaces
            .get('home-mobile')!
            .inspectElement({ selector: '[role="textbox"]' }, new AbortController().signal)
        ).text,
      ).toBe('Source popover retained draft');
      await page.getByRole('button', { name: 'Cancel text draft', exact: true }).click();
      await source.click();
      await page.getByRole('button', { name: 'Refresh recorded content', exact: true }).click();
      await expect.poll(() => document.querySelector('[data-source-context]')).toBeNull();
      await expect.element(source).toBeDisabled();
      await expect
        .poll(() => document.querySelectorAll('iframe[data-preview-status="Ready"]').length, {
          timeout: 30_000,
        })
        .toBe(8);
    } finally {
      await screen.unmount();
      await commands.canvasPointerViewport(false);
    }
  },
);
