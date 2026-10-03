import { expect, it, vi } from 'vitest';
import { commands, page } from 'vitest/browser';
import { Box } from '@tryghost/shade/primitives';
import { renderInApp } from '@test-utils/acceptance/render-in-app';
import { CanvasHarness } from './canvas-harness';
import { FixtureClient } from './fixture-client';
import type { CanvasProbe } from './webmcp-probe';
import type { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';

it.each(['expanded', 'device'] as const)(
  'keeps healthy previews editable and refresh available after one %s delivery fails',
  { timeout: 60_000 },
  async (failedKind) => {
    await commands.canvasPointerViewport(true);
    let fallback: IframePreviewDocumentSurface | null = null;
    const screen = await renderInApp(
      <Box style={{ width: 1500, height: 1100 }}>
        <CanvasHarness
          fixtureId="source"
          onCompositionSurface={(id, surface) => {
            if (failedKind === 'expanded' && id === 'home-mobile' && surface) {
              vi.spyOn(surface, 'measureLayout').mockRejectedValueOnce(
                new Error('Controlled composition delivery failure'),
              );
            }
            if (failedKind === 'device' && id === 'home-mobile') {
              fallback = surface;
            }
          }}
          onDeviceSurface={(id, surface) => {
            if (failedKind === 'expanded' && id === 'home-mobile') {
              fallback = surface;
            }
            if (failedKind === 'device' && id === 'home-mobile' && surface) {
              vi.spyOn(surface, 'measureLayout').mockRejectedValueOnce(
                new Error('Controlled device delivery failure'),
              );
            }
          }}
        />
      </Box>,
    );
    try {
      await expect
        .poll(() => document.querySelectorAll('iframe[data-preview-status="Ready"]').length, {
          timeout: 30_000,
        })
        .toBe(7);
      if (failedKind === 'expanded') {
        await expect
          .element(page.getByText('Controlled composition delivery failure', { exact: true }))
          .toBeVisible();
      }
      const refresh = document.querySelector<HTMLButtonElement>(
        'button[aria-label="Refresh recorded content"]',
      );
      expect(refresh?.disabled).toBe(false);
      if (failedKind === 'expanded') {
        await page
          .getByRole('button', { name: 'Use fixed viewport for Home · Mobile', exact: true })
          .click();
      }
      const footer = page
        .frameLocator(
          page.getByTitle(
            `Home · Mobile ${failedKind === 'expanded' ? 'preview' : 'composition'}`,
            { exact: true },
          ),
        )
        .getByRole('link', { name: 'Ghost', exact: true });
      await footer.hover();
      await footer.dblClick();
      await expect
        .poll(
          async () =>
            (await fallback!.measureLayout(new AbortController().signal)).localEdits.active,
        )
        .toBe(true);
      await page.getByRole('button', { name: 'Cancel text draft', exact: true }).click();
      await expect
        .element(page.getByRole('button', { name: 'Refresh recorded content', exact: true }))
        .toBeEnabled();
      await page.getByRole('button', { name: 'Refresh recorded content', exact: true }).click();
      await expect
        .poll(() => document.querySelectorAll('iframe[data-preview-status="Ready"]').length, {
          timeout: 30_000,
        })
        .toBe(8);
    } finally {
      await screen.unmount();
      await commands.canvasPointerViewport(false);
      vi.restoreAllMocks();
    }
  },
);

it(
  'does not admit a device draft while its composition is initially pending, then edits once delivery completes',
  { timeout: 60_000 },
  async () => {
    await commands.canvasPointerViewport(true);
    let release = () => {};
    let device: IframePreviewDocumentSurface | null = null;
    const screen = await renderInApp(
      <Box style={{ width: 1500, height: 1100 }}>
        <CanvasHarness
          fixtureId="source"
          onCompositionSurface={(id, surface) => {
            if (id === 'home-mobile' && surface) {
              const original = surface.replaceDocument.bind(surface);
              vi.spyOn(surface, 'replaceDocument').mockImplementationOnce(
                async (document, selection, signal) => {
                  const restored = await original(document, selection, signal);
                  await new Promise<void>((resolve) => {
                    release = resolve;
                  });
                  return restored;
                },
              );
            }
          }}
          onDeviceSurface={(id, surface) => {
            if (id === 'home-mobile') {
              device = surface;
            }
          }}
        />
      </Box>,
    );
    try {
      await expect
        .poll(() => document.querySelectorAll('iframe[data-preview-status="Ready"]').length, {
          timeout: 30_000,
        })
        .toBe(7);
      await page.getByRole('button', { name: 'Fit all', exact: true }).click();
      await page
        .getByRole('button', { name: 'Use fixed viewport for Home · Mobile', exact: true })
        .click();
      const footer = page
        .frameLocator(page.getByTitle('Home · Mobile preview', { exact: true }))
        .getByRole('link', { name: 'Ghost', exact: true });
      await footer.dblClick();
      await expect
        .poll(
          async () => (await device!.measureLayout(new AbortController().signal)).localEdits.active,
        )
        .toBe(false);
      expect(document.body.textContent).not.toContain('A text draft is retained.');
      release();
      await expect
        .poll(() => document.querySelectorAll('iframe[data-preview-status="Ready"]').length, {
          timeout: 30_000,
        })
        .toBe(8);
      await footer.dblClick();
      await expect
        .poll(
          async () => (await device!.measureLayout(new AbortController().signal)).localEdits.active,
        )
        .toBe(true);
      await page.getByRole('button', { name: 'Cancel text draft', exact: true }).click();
    } finally {
      release();
      await screen.unmount();
      await commands.canvasPointerViewport(false);
      vi.restoreAllMocks();
    }
  },
);

it(
  'downgrades a later failed composition without disabling its healthy device fallback or refresh',
  { timeout: 60_000 },
  async () => {
    await commands.canvasPointerViewport(true);
    let composition: IframePreviewDocumentSurface | null = null;
    let device: IframePreviewDocumentSurface | null = null;
    const observed: { probe: CanvasProbe | null } = { probe: null };
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const original = FixtureClient.prototype.render;
    vi.spyOn(FixtureClient.prototype, 'render').mockImplementation(
      async function (this: FixtureClient, edit) {
        const result = await original.call(this, edit);
        const script =
          '<script>window.addEventListener("message", event => {if (event.data === "review-layout-change") document.body.setAttribute("data-review-layout", "changed");});</script>';
        return { ...result, html: { ...result.html, home: result.html.home + script } };
      },
    );
    const screen = await renderInApp(
      <Box style={{ width: 1500, height: 1100 }}>
        <CanvasHarness
          fixtureId="source"
          onCompositionSurface={(id, surface) => {
            if (id === 'home-mobile') {
              composition = surface;
            }
          }}
          onDeviceSurface={(id, surface) => {
            if (id === 'home-mobile') {
              device = surface;
            }
          }}
          onProbe={(probe) => {
            observed.probe = probe;
          }}
        />
      </Box>,
    );
    try {
      await expect
        .poll(() => document.querySelectorAll('iframe[data-preview-status="Ready"]').length, {
          timeout: 30_000,
        })
        .toBe(8);
      await page.getByRole('button', { name: 'Refresh recorded content', exact: true }).hover();
      const board = page.getByRole('region', { name: 'Theme canvas' }).element();
      const boardHeight = board.getBoundingClientRect().height;
      vi.spyOn(composition!, 'measureLayout').mockRejectedValueOnce(
        new Error('Controlled later composition failure'),
      );
      document
        .querySelector<HTMLIFrameElement>('iframe[title="Home · Mobile composition"]')!
        .contentWindow!.postMessage('review-layout-change', '*');
      await expect
        .element(page.getByText('Controlled later composition failure', { exact: true }))
        .toBeVisible();
      expect(board.getBoundingClientRect().height).toBe(boardHeight);
      await expect
        .poll(() => observed.probe!.state().diagnostics.delivery)
        .toMatchObject({
          failedSurfaces: ['home-mobile:expanded'],
          allReadyMs: null,
        });
      expect(
        typeof (observed.probe!.state().diagnostics.delivery as { allCompleteMs: unknown })
          .allCompleteMs,
      ).toBe('number');
      await expect
        .element(page.getByRole('button', { name: 'Refresh recorded content', exact: true }))
        .toBeEnabled();
      await page
        .getByRole('button', { name: 'Use fixed viewport for Home · Mobile', exact: true })
        .click();
      await page
        .frameLocator(page.getByTitle('Home · Mobile preview', { exact: true }))
        .getByRole('link', { name: 'Ghost', exact: true })
        .dblClick();
      await expect
        .poll(
          async () => (await device!.measureLayout(new AbortController().signal)).localEdits.active,
        )
        .toBe(true);
      await page.getByRole('button', { name: 'Cancel text draft', exact: true }).click();
      await page.getByRole('button', { name: 'Refresh recorded content', exact: true }).click();
      await expect
        .poll(() => document.querySelectorAll('iframe[data-preview-status="Ready"]').length, {
          timeout: 30_000,
        })
        .toBe(8);
    } finally {
      await screen.unmount();
      await commands.canvasPointerViewport(false);
      vi.restoreAllMocks();
    }
  },
);

it(
  'does not let an older initial mode acknowledgment recertify a composition that failed later',
  { timeout: 60_000 },
  async () => {
    await commands.canvasPointerViewport(true);
    let composition: IframePreviewDocumentSurface | null = null;
    let release = () => {};
    const observed: { probe: CanvasProbe | null } = { probe: null };
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const original = FixtureClient.prototype.render;
    vi.spyOn(FixtureClient.prototype, 'render').mockImplementation(
      async function (this: FixtureClient, edit) {
        const result = await original.call(this, edit);
        const script =
          '<script>window.addEventListener("message", event => {if (event.data === "review-layout-change") document.body.setAttribute("data-review-layout", "changed");});</script>';
        return { ...result, html: { ...result.html, home: result.html.home + script } };
      },
    );
    const screen = await renderInApp(
      <Box style={{ width: 1500, height: 1100 }}>
        <CanvasHarness
          fixtureId="source"
          onCompositionSurface={(id, surface) => {
            if (id === 'home-mobile' && surface) {
              composition = surface;
              const originalMode = surface.setInteractionMode.bind(surface);
              let held = false;
              vi.spyOn(surface, 'setInteractionMode').mockImplementation(async (mode, signal) => {
                await originalMode(mode, signal);
                if (mode === 'edit' && !held) {
                  held = true;
                  await new Promise<void>((resolve) => {
                    release = resolve;
                  });
                }
              });
            }
          }}
          onProbe={(probe) => {
            observed.probe = probe;
          }}
        />
      </Box>,
    );
    try {
      await expect
        .poll(() => document.querySelectorAll('iframe[data-preview-status="Ready"]').length, {
          timeout: 30_000,
        })
        .toBe(7);
      const iframe = document.querySelector<HTMLIFrameElement>(
        'iframe[title="Home · Mobile composition"]',
      )!;
      await expect.poll(() => iframe.dataset.compositionStatus).toBe('settled');
      vi.spyOn(composition!, 'measureLayout').mockRejectedValueOnce(
        new Error('Controlled failure before initial mode ack'),
      );
      iframe.contentWindow!.postMessage('review-layout-change', '*');
      await expect
        .element(page.getByText('Controlled failure before initial mode ack', { exact: true }))
        .toBeVisible();
      release();
      await page.getByRole('button', { name: 'Fit all', exact: true }).click();
      await composition!.measureLayout(new AbortController().signal);
      await expect
        .poll(() => iframe.dataset.previewStatus)
        .toBe('Controlled failure before initial mode ack');
      await expect
        .poll(() => observed.probe!.state().diagnostics.delivery)
        .toMatchObject({ failedSurfaces: ['home-mobile:expanded'], allReadyMs: null });
    } finally {
      release();
      await screen.unmount();
      await commands.canvasPointerViewport(false);
      vi.restoreAllMocks();
    }
  },
);
