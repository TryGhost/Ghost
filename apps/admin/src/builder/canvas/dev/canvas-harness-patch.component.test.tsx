import { expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { Box } from '@tryghost/shade/primitives';
import { renderInApp } from '@test-utils/acceptance/render-in-app';
import { CanvasHarness } from './canvas-harness';
import { instance } from './fixture';
import type { FixturePatch, FixtureRender } from './fixture-client';
import type { CanvasProbe } from './webmcp-probe';
import type { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';

it.each(['source', 'casper'] as const)(
  '%s delivers atomic patches to all eight live documents and retains them after rejection or no-op',
  { timeout: 60_000 },
  async (fixtureId) => {
    await commands.canvasPointerViewport(true);
    const surfaces = new Map<string, IframePreviewDocumentSurface>();
    const observed: {
      probe: CanvasProbe | null;
      apply: ((patch: FixturePatch) => Promise<FixtureRender>) | null;
    } = { probe: null, apply: null };
    const signal = new AbortController().signal;
    const screen = await renderInApp(
      <Box style={{ width: 1500, height: 1100 }}>
        <CanvasHarness
          fixtureId={fixtureId}
          onApplyThemePatch={(apply) => {
            observed.apply = apply;
          }}
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
          { timeout: 30_000 },
        )
        .toEqual(expect.any(Number));
    };
    const identities = () =>
      Promise.all(
        [...surfaces.values()].map(
          async (surface) => (await surface.measureLayout(signal)).documentInstanceId,
        ),
      );
    try {
      await ready();
      await expect.poll(() => observed.apply).toEqual(expect.any(Function));
      const initial = observed.probe!.state();
      const device = initial.frames[0].device!;
      const initialIdentities = await identities();
      const initialFrames = [
        ...document.querySelectorAll('iframe[title$="composition"],iframe[title$="preview"]'),
      ];
      const initialSurfaces = [...surfaces.values()];
      const result = await observed.apply!({
        expectedRevision: device.revision,
        expectedDataGeneration: device.dataGeneration,
        files: [
          {
            operation: 'write',
            path: 'home.hbs',
            content:
              '<html><head>{{ghost_head}}<link rel="stylesheet" href="{{asset "canvas.css"}}"></head><body>{{> canvas-title}}</body></html>',
          },
          {
            operation: 'write',
            path: 'post.hbs',
            content:
              '<html><head>{{ghost_head}}<link rel="stylesheet" href="{{asset "canvas.css"}}"></head><body>{{> canvas-title}}</body></html>',
          },
          {
            operation: 'write',
            path: 'partials/canvas-title.hbs',
            content: '<h1>Shared canvas patch</h1>',
          },
          {
            operation: 'write',
            path: 'assets/canvas.css',
            content: 'h1 { color: rgb(12, 34, 56); }',
          },
        ],
        settings: { 'global.accent_color': '#123456' },
      });
      await expect
        .poll(
          () =>
            observed
              .probe!.state()
              .frames.every((frame) => frame.device?.revision === result.revision),
          { timeout: 30_000 },
        )
        .toBe(true);
      await ready();
      expect(
        observed.probe!.state().frames.every((frame) => frame.device?.revision === result.revision),
      ).toBe(true);
      for (const surface of surfaces.values()) {
        expect((await surface.inspectPage(instance.siteUrl, signal)).text).toContain(
          'Shared canvas patch',
        );
        expect((await surface.inspectElement({ selector: 'h1' }, signal)).styles.color).toBe(
          'rgb(12, 34, 56)',
        );
      }
      const acceptedIdentities = await identities();
      expect(acceptedIdentities.every((id, index) => id !== initialIdentities[index])).toBe(true);
      expect([...surfaces.values()]).toEqual(initialSurfaces);
      expect([
        ...document.querySelectorAll('iframe[title$="composition"],iframe[title$="preview"]'),
      ]).toEqual(initialFrames);
      expect(observed.probe!.state().view).toEqual(initial.view);
      await expect(
        observed.apply!({
          expectedRevision: result.revision,
          expectedDataGeneration: result.dataGeneration,
          files: [
            { operation: 'write', path: 'home.hbs', content: '<main>Rejected Home</main>' },
            { operation: 'write', path: 'post.hbs', content: '{{> missing_canvas_partial}}' },
          ],
        }),
      ).rejects.toThrow(/post/i);
      expect(await identities()).toEqual(acceptedIdentities);
      expect(observed.probe!.state().view).toEqual(initial.view);
      const unchanged = await observed.apply!({
        expectedRevision: result.revision,
        expectedDataGeneration: result.dataGeneration,
        files: [],
      });
      expect(unchanged.unchanged).toBe(true);
      expect(await identities()).toEqual(acceptedIdentities);
      for (const surface of surfaces.values()) {
        expect((await surface.inspectPage(instance.siteUrl, signal)).text).toContain(
          'Shared canvas patch',
        );
      }
    } finally {
      await screen.unmount();
      expect(observed.apply).toBeNull();
      await commands.canvasPointerViewport(false);
    }
  },
);
