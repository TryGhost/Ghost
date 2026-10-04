import { expect, it, vi } from 'vitest';
import { commands, page } from 'vitest/browser';
import { Box } from '@tryghost/shade/primitives';
import { renderInApp } from '@test-utils/acceptance/render-in-app';
import { CanvasHarness } from './canvas-harness';
import { FixtureClient } from './fixture-client';
import { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';
import type { PreviewLayout } from '@/builder/workspaces/theme/preview/preview-document';

it.each(['source', 'casper'] as const)(
  '%s keeps live geometry current, defers resizing a draft, and falls back one frame without replacing documents',
  { timeout: 60_000 },
  async (fixtureId) => {
    await commands.canvasPointerViewport(true);
    const compositions = new Map<string, IframePreviewDocumentSurface>();
    const devices = new Map<string, IframePreviewDocumentSurface>();
    const signal = new AbortController().signal;
    let releaseInitialMode = () => {};
    let initialModeHeld = false;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setMode = IframePreviewDocumentSurface.prototype.setInteractionMode;
    vi.spyOn(IframePreviewDocumentSurface.prototype, 'setInteractionMode').mockImplementation(
      async function (this: IframePreviewDocumentSurface, mode, active) {
        const element = (this as unknown as { iframe: HTMLIFrameElement }).iframe;
        if (mode === 'edit' && element.title === 'Home · Mobile composition' && !initialModeHeld) {
          initialModeHeld = true;
          await new Promise<void>((resolve) => {
            releaseInitialMode = resolve;
          });
        }
        return setMode.call(this, mode, active);
      },
    );
    // Retain the real fixture worker and its source-proven text targets.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const render = FixtureClient.prototype.render;
    const renderer = vi
      .spyOn(FixtureClient.prototype, 'render')
      .mockImplementation(async function (this: FixtureClient, edit) {
        const result = await render.call(this, edit);
        const late = `<div id="late-layout" style="height:0"></div><script>document.querySelector('main').append(document.querySelector('#late-layout'));window.addEventListener('message', event => { if(event.data?.kind === 'test-late-layout') document.querySelector('#late-layout').style.height = event.data.height + 'px'; });</script>`;
        return {
          ...result,
          html: { home: result.html.home + late, post: result.html.post + late },
        };
      });
    const screen = await renderInApp(
      <Box style={{ width: 1500, height: 1100 }}>
        <CanvasHarness
          fixtureId={fixtureId}
          onCompositionSurface={(id, surface) => {
            if (surface) {
              compositions.set(id, surface);
            } else {
              compositions.delete(id);
            }
          }}
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
      await expect.poll(() => initialModeHeld, { timeout: 30_000 }).toBe(true);
      const pending = document.querySelector<HTMLIFrameElement>(
        'iframe[title="Home · Mobile composition"]',
      )!;
      expect(pending.dataset.previewStatus).not.toBe('Ready');
      releaseInitialMode();
      await expect
        .poll(() => document.querySelectorAll('iframe[data-preview-status="Ready"]').length, {
          timeout: 30_000,
        })
        .toBe(8);
      // Leave both pointer and keyboard focus in parent chrome before observing
      // unpaused late layout; hovering alone does not release iframe focus.
      await page.getByRole('button', { name: 'Fit all', exact: true }).click();
      const iframe = document.querySelector<HTMLIFrameElement>(
        'iframe[title="Home · Mobile composition"]',
      )!;
      const originalFrames = [
        ...document.querySelectorAll('iframe[title$="composition"],iframe[title$="preview"]'),
      ];
      const home = compositions.get('home-mobile')!;
      // Ready remains true during later observation passes. Capture the baseline
      // after settling, rather than mistaking a temporary viewport-floor reset
      // for this fixture's full-page height.
      const baseline: { current: PreviewLayout | null } = { current: null };
      await expect
        .poll(async () => {
          const layout = await home.measureLayout(signal);
          if (
            iframe.dataset.compositionStatus !== 'settled' ||
            layout.viewport.height !== layout.document.height
          ) {
            return false;
          }
          baseline.current = layout;
          return true;
        })
        .toBe(true);
      const initial = baseline.current!;
      const renderCount = renderer.mock.calls.length;
      const identities = await Promise.all(
        [...compositions.values(), ...devices.values()].map(
          async (surface) => (await surface.measureLayout(signal)).documentInstanceId,
        ),
      );
      const device = await devices.get('home-mobile')!.measureLayout(signal);
      const mutate = (height: number) =>
        iframe.contentWindow!.postMessage({ kind: 'test-late-layout', height }, '*');
      mutate(2400);
      await expect
        .poll(() => iframe.clientHeight, { timeout: 5000 })
        .toBeGreaterThan(initial.viewport.height + 2000);
      await expect.poll(() => iframe.dataset.compositionStatus).toBe('settled');
      expect((await home.measureLayout(signal)).documentInstanceId).toBe(
        initial.documentInstanceId,
      );
      mutate(0);
      await expect.poll(() => iframe.clientHeight, { timeout: 5000 }).toBe(initial.viewport.height);
      await expect.poll(() => iframe.dataset.compositionStatus).toBe('settled');

      const mobile = page.frameLocator(
        page.getByTitle('Home · Mobile composition', { exact: true }),
      );
      await page.getByRole('button', { name: 'Fit all', exact: true }).click();
      const footer = mobile.getByRole('link', {
        name: fixtureId === 'casper' ? 'Powered by Ghost' : 'Ghost',
        exact: true,
      });
      await footer.click();
      mutate(600);
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 400);
      });
      expect(iframe.clientHeight).toBe(initial.viewport.height);
      const postFooter = page
        .frameLocator(page.getByTitle('Post · Mobile composition', { exact: true }))
        .getByRole('link', {
          name: fixtureId === 'casper' ? 'Powered by Ghost' : 'Ghost',
          exact: true,
        });
      await postFooter.hover();
      await postFooter.click();
      await expect
        .poll(() => iframe.clientHeight, { timeout: 5000 })
        .toBeGreaterThan(initial.viewport.height + 500);
      await expect.poll(() => iframe.dataset.compositionStatus).toBe('settled');
      await page.getByRole('button', { name: 'Fit all', exact: true }).click();
      mutate(0);
      await expect.poll(() => iframe.clientHeight, { timeout: 5000 }).toBe(initial.viewport.height);
      await expect.poll(() => iframe.dataset.compositionStatus).toBe('settled');
      await footer.hover();
      mutate(1200);
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 400);
      });
      expect(iframe.clientHeight).toBe(initial.viewport.height);
      expect(iframe.dataset.compositionStatus).toBe('settled');
      await footer.dblClick();
      await expect
        .poll(
          async () => ({
            active: (await home.measureLayout(signal)).localEdits.active,
            status: iframe.dataset.previewStatus,
            selection: document.querySelector('[data-source-selection]')?.textContent,
          }),
          { timeout: 1500 },
        )
        .toMatchObject({ active: true });
      const editor = mobile.getByRole('textbox', {
        name: fixtureId === 'casper' ? /^Edit Powered by Ghost/ : /^Edit Ghost/,
      });
      await editor.fill('Retained draft');
      mutate(3000);
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 400);
      });
      expect(iframe.clientHeight).toBe(initial.viewport.height);
      expect((await home.inspectElement({ selector: '[role="textbox"]' }, signal)).text).toBe(
        'Retained draft',
      );
      const board = page.getByRole('region', { name: 'Theme canvas' }).element() as HTMLElement;
      board.focus();
      await commands.canvasPointer([{ kind: 'space-down' }]);
      await expect.poll(() => document.querySelector('[data-canvas-pan-shield]')).not.toBeNull();
      const bounds = board.getBoundingClientRect();
      const world = page.getByTestId('canvas-world').element() as HTMLElement;
      const beforePan = new DOMMatrix(world.style.transform);
      await commands.canvasPointer([
        { kind: 'move', x: bounds.left + 200, y: bounds.top + 200 },
        { kind: 'down' },
        { kind: 'move', x: bounds.left + 320, y: bounds.top + 250 },
        { kind: 'up' },
        { kind: 'space-up' },
      ]);
      const afterPan = new DOMMatrix(world.style.transform);
      expect(afterPan.m41 - beforePan.m41).toBeCloseTo(120, 3);
      expect(afterPan.m42 - beforePan.m42).toBeCloseTo(50, 3);
      expect(iframe.clientHeight).toBe(initial.viewport.height);
      expect((await home.inspectElement({ selector: '[role="textbox"]' }, signal)).text).toBe(
        'Retained draft',
      );
      await expect
        .element(
          page.getByRole('button', { name: 'Use fixed viewport for Home · Mobile', exact: true }),
        )
        .toBeDisabled();
      await page.getByRole('button', { name: 'Cancel text draft', exact: true }).click();
      await expect
        .poll(() => iframe.clientHeight, { timeout: 5000 })
        .toBeGreaterThan(initial.viewport.height + 2500);

      mutate(50_000);
      await expect
        .poll(() => iframe.dataset.compositionStatus, { timeout: 5000 })
        .toBe('height-limit');
      await page.getByRole('button', { name: 'Fit all', exact: true }).click();
      await page.getByRole('button', { name: 'Home · Mobile', exact: true }).dblClick();
      await page
        .getByRole('button', { name: 'Use fixed viewport for Home · Mobile', exact: true })
        .click();
      expect(
        document.querySelector<HTMLIFrameElement>('iframe[title="Home · Mobile preview"]')!
          .className,
      ).not.toContain('invisible');
      expect(
        document.querySelector<HTMLIFrameElement>('iframe[title="Post · Mobile composition"]')!
          .className,
      ).not.toContain('invisible');
      expect((await devices.get('home-mobile')!.measureLayout(signal)).viewport).toEqual(
        device.viewport,
      );
      expect([
        ...document.querySelectorAll('iframe[title$="composition"],iframe[title$="preview"]'),
      ]).toEqual(originalFrames);
      await page.getByRole('button', { name: 'Fit all', exact: true }).click();
      await page
        .frameLocator(page.getByTitle('Home · Mobile preview', { exact: true }))
        .getByRole('link', {
          name: fixtureId === 'casper' ? 'Powered by Ghost' : 'Ghost',
          exact: true,
        })
        .click();
      await expect.poll(() => document.querySelector('[data-source-selection]')).not.toBeNull();
      expect(
        await Promise.all(
          [...compositions.values(), ...devices.values()].map(
            async (surface) => (await surface.measureLayout(signal)).documentInstanceId,
          ),
        ),
      ).toEqual(identities);
      expect(renderer).toHaveBeenCalledTimes(renderCount);
    } finally {
      releaseInitialMode();
      await commands.canvasPointer([{ kind: 'up' }, { kind: 'space-up' }]);
      await screen.unmount();
      await commands.canvasPointerViewport(false);
      vi.restoreAllMocks();
    }
  },
);
