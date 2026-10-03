import { expect, it, vi } from 'vitest';
import { commands, page } from 'vitest/browser';
import { Box } from '@tryghost/shade/primitives';
import { renderInApp } from '@test-utils/acceptance/render-in-app';
import { CanvasHarness } from './canvas-harness';
import { FixtureClient, FixtureRejectedError, FixtureTransportError } from './fixture-client';
import { REFRESHED_POST_TITLE } from './recorded-content';
import { instance } from './fixture';
import type { CanvasProbe } from './webmcp-probe';
import type { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';

it.each(['source', 'casper'] as const)(
  '%s refreshes all eight live documents, fences stale reads and drafts, and preserves the canvas view',
  { timeout: 60_000 },
  async (fixtureId) => {
    await commands.canvasPointerViewport(true);
    const surfaces = new Map<string, IframePreviewDocumentSurface>();
    const observed: { probe: CanvasProbe | null } = { probe: null };
    const signal = new AbortController().signal;
    let release = () => {};
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalRefresh = FixtureClient.prototype.refresh;
    const refresh = vi
      .spyOn(FixtureClient.prototype, 'refresh')
      .mockImplementationOnce(async function (this: FixtureClient, request) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return originalRefresh.call(this, request);
      });
    const screen = await renderInApp(
      <Box style={{ width: 1500, height: 1100 }}>
        <CanvasHarness
          fixtureId={fixtureId}
          onCompositionSurface={(id, surface) => {
            if (surface) {
              surfaces.set(`${id}:expanded`, surface);
            } else {
              surfaces.delete(`${id}:expanded`);
            }
          }}
          onDeviceSurface={(id, surface) => {
            if (surface) {
              surfaces.set(`${id}:device`, surface);
            } else {
              surfaces.delete(`${id}:device`);
            }
          }}
          onProbe={(probe) => {
            observed.probe = probe;
          }}
        />
      </Box>,
    );
    const ready = async () => {
      await expect
        .poll(() => document.querySelectorAll('iframe[data-preview-status="Ready"]').length, {
          timeout: 30_000,
        })
        .toBe(8);
      await expect
        .poll(
          () =>
            (
              observed.probe?.state().diagnostics.delivery as
                | { allReadyMs?: number | null }
                | undefined
            )?.allReadyMs,
        )
        .toEqual(expect.any(Number));
    };
    const identities = () =>
      Promise.all(
        [...surfaces.values()].map(
          async (surface) => (await surface.measureLayout(signal)).documentInstanceId,
        ),
      );
    const target = () => {
      const state = observed.probe!.state();
      const frame = state.frames.find((item) => item.id === 'home-mobile')!;
      return {
        workspaceId: state.workspaceId,
        frameHandle: frame.frameHandle,
        representationHandle: frame.device!.representationHandle,
        expectedRevision: frame.device!.revision,
        expectedRenderKey: frame.device!.renderKey,
      };
    };
    const inspect = (args: unknown) =>
      observed
        .probe!.tools()
        .find((tool) => tool.name.endsWith('inspect_frame'))!
        .execute(args);
    const footer = page
      .frameLocator(page.getByTitle('Home · Mobile composition', { exact: true }))
      .getByRole('link', {
        name: fixtureId === 'source' ? 'Ghost' : 'Powered by Ghost',
        exact: true,
      });
    try {
      await ready();
      const board = page.getByRole('region', { name: 'Theme canvas' }).element();
      const initialBoardHeight = board.getBoundingClientRect().height;
      await footer.hover();
      await footer.click();
      await expect.poll(() => document.querySelector('[data-source-selection]')).not.toBeNull();
      expect(board.getBoundingClientRect().height).toBe(initialBoardHeight);
      await page.getByRole('button', { name: 'Home · Mobile', exact: true }).click();
      const view = observed.probe!.state().view;
      const originalTarget = target();
      const originalIdentities = await identities();
      const postComposition = surfaces.get('post-mobile:expanded')!;
      const postIframe = document.querySelector<HTMLIFrameElement>(
        'iframe[title="Post · Mobile composition"]',
      )!;
      await expect.poll(() => postIframe.dataset.compositionStatus).toBe('settled');
      const originalPostHeight = (await postComposition.measureLayout(signal)).viewport.height;
      const originalFrames = [
        ...document.querySelectorAll('iframe[title$="composition"],iframe[title$="preview"]'),
      ];
      const originalSurfaces = [...surfaces.values()];
      await page.getByRole('button', { name: 'Refresh recorded content', exact: true }).click();
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(await inspect(originalTarget)).toMatchObject({ code: 'stale_render' });
      expect(document.querySelector('[data-source-selection]')).toBeNull();
      await footer.hover();
      await footer.dblClick();
      await expect
        .poll(
          async () =>
            (await surfaces.get('home-mobile:expanded')!.measureLayout(signal)).localEdits.active,
        )
        .toBe(false);
      expect(document.body.textContent).not.toContain('A text draft is retained.');
      release();
      await expect
        .poll(() => target().expectedRenderKey, { timeout: 30_000 })
        .not.toBe(originalTarget.expectedRenderKey);
      await ready();
      expect(target().expectedRevision).toBe(originalTarget.expectedRevision);
      expect(
        observed.probe!.state().frames.every((frame) => frame.device?.dataGeneration === 1),
      ).toBe(true);
      expect(await inspect(originalTarget)).toMatchObject({ code: 'target_unavailable' });
      expect(
        await inspect({ ...target(), expectedRenderKey: originalTarget.expectedRenderKey }),
      ).toMatchObject({ code: 'render_conflict' });
      expect(await inspect(target())).toMatchObject({ status: 'ok' });
      for (const surface of surfaces.values()) {
        expect((await surface.inspectPage(instance.siteUrl, signal)).text).toContain(
          REFRESHED_POST_TITLE,
        );
      }
      expect((await identities()).every((id, index) => id !== originalIdentities[index])).toBe(
        true,
      );
      expect([...surfaces.values()]).toEqual(originalSurfaces);
      expect([
        ...document.querySelectorAll('iframe[title$="composition"],iframe[title$="preview"]'),
      ]).toEqual(originalFrames);
      expect(observed.probe!.state().view).toEqual(view);
      expect(
        (await surfaces.get('home-mobile:device')!.measureLayout(signal)).viewport,
      ).toMatchObject({ width: 390, height: 844 });
      await expect
        .poll(async () => (await postComposition.measureLayout(signal)).viewport.height)
        .toBeGreaterThan(originalPostHeight);
      const refreshedTarget = target();
      await page.getByRole('button', { name: 'Restore recorded content', exact: true }).click();
      await expect
        .poll(() => target().expectedRenderKey, { timeout: 30_000 })
        .not.toBe(refreshedTarget.expectedRenderKey);
      await ready();
      expect(target().expectedRevision).toBe(originalTarget.expectedRevision);
      expect(target().expectedRenderKey).not.toBe(originalTarget.expectedRenderKey);
      expect(
        observed.probe!.state().frames.every((frame) => frame.device?.dataGeneration === 2),
      ).toBe(true);
      expect(
        (await surfaces.get('post-mobile:device')!.inspectPage(instance.siteUrl, signal)).text,
      ).not.toContain(REFRESHED_POST_TITLE);
      expect(observed.probe!.state().view).toEqual(view);
      await footer.hover();
      await footer.dblClick();
      const editor = page
        .frameLocator(page.getByTitle('Home · Mobile composition', { exact: true }))
        .getByRole('textbox', { name: /^Edit / });
      await editor.fill('Retained refresh draft');
      await expect
        .element(page.getByRole('button', { name: 'Refresh recorded content', exact: true }))
        .toBeDisabled();
      expect(refresh).toHaveBeenCalledTimes(2);
      expect(
        (
          await surfaces
            .get('home-mobile:expanded')!
            .inspectElement({ selector: '[role="textbox"]' }, signal)
        ).text,
      ).toBe('Retained refresh draft');
      await page.getByRole('button', { name: 'Cancel text draft', exact: true }).click();
      await expect
        .element(page.getByRole('button', { name: 'Refresh recorded content', exact: true }))
        .toBeEnabled();

      const beforeRejection = target();
      const rejectedIdentities = await identities();
      refresh.mockRejectedValueOnce(new FixtureRejectedError('Controlled refresh rejected'));
      await page.getByRole('button', { name: 'Refresh recorded content', exact: true }).click();
      await expect
        .element(page.getByRole('alert'))
        .toHaveTextContent('Controlled refresh rejected');
      expect(await inspect(beforeRejection)).toMatchObject({ code: 'target_unavailable' });
      expect(await inspect(target())).toMatchObject({ status: 'ok' });
      expect(await identities()).toEqual(rejectedIdentities);
      await expect
        .element(page.getByRole('button', { name: 'Refresh recorded content', exact: true }))
        .toBeEnabled();
      refresh.mockRejectedValueOnce(new FixtureTransportError('Controlled transport loss'));
      const beforeLoss = target();
      await page.getByRole('button', { name: 'Refresh recorded content', exact: true }).click();
      await expect.element(page.getByRole('alert')).toHaveTextContent('Reload Builder to recover.');
      expect(await inspect(beforeLoss)).toMatchObject({ code: 'stale_render' });
      await expect
        .element(page.getByRole('button', { name: 'Refresh recorded content', exact: true }))
        .toBeDisabled();
      expect(document.querySelector('[data-canvas-diagnostics]')).toBeNull();
    } finally {
      release();
      await screen.unmount();
      await commands.canvasPointerViewport(false);
      vi.restoreAllMocks();
    }
  },
);
