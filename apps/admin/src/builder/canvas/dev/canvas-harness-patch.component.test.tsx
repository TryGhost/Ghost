import { expect, it, vi } from 'vitest';
import { commands } from 'vitest/browser';
import { Box } from '@tryghost/shade/primitives';
import { renderInApp } from '@test-utils/acceptance/render-in-app';
import { CanvasHarness } from './canvas-harness';
import { instance } from './fixture';
import { FixtureClient } from './fixture-client';
import type { FixturePatch, FixtureRender } from './fixture-client';
import type { CanvasProbe } from './webmcp-probe';
import { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';

it(
  'retains measured frame bounds throughout replacement and commits a shorter height only after measurement',
  { timeout: 60_000 },
  async () => {
    const observed: {
      probe: CanvasProbe | null;
      apply: ((patch: FixturePatch) => Promise<FixtureRender>) | null;
    } = { probe: null, apply: null };
    let initialRender = true;
    let holdMeasurement = false;
    let measurementHeld = false;
    let failMeasurement = false;
    let releaseMeasurement = () => {};
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const render = FixtureClient.prototype.render;
    vi.spyOn(FixtureClient.prototype, 'render').mockImplementation(
      async function (this: FixtureClient, edit) {
        const result = await render.call(this, edit);
        return initialRender
          ? {
              ...result,
              html: {
                ...result.html,
                home: result.html.home + '<div style="height:3500px"></div>',
              },
            }
          : result;
      },
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const measure = IframePreviewDocumentSurface.prototype.measureLayout;
    vi.spyOn(IframePreviewDocumentSurface.prototype, 'measureLayout').mockImplementation(
      async function (this: IframePreviewDocumentSurface, signal) {
        const element = (this as unknown as { iframe: HTMLIFrameElement }).iframe;
        if (failMeasurement && element.title === 'Home · Mobile composition') {
          failMeasurement = false;
          throw new Error('Replacement sizing failed');
        }
        if (holdMeasurement && element.title === 'Home · Mobile composition') {
          holdMeasurement = false;
          measurementHeld = true;
          await new Promise<void>((resolve) => {
            releaseMeasurement = resolve;
          });
        }
        return measure.call(this, signal);
      },
    );
    const screen = await renderInApp(
      <Box style={{ width: 1500, height: 1100 }}>
        <CanvasHarness
          fixtureId="source"
          onApplyThemePatch={(apply) => {
            observed.apply = apply;
          }}
          onProbe={(probe) => {
            observed.probe = probe;
          }}
        />
      </Box>,
    );
    let observer: MutationObserver | null = null;
    try {
      await expect
        .poll(() => document.querySelectorAll('iframe[data-preview-status="Ready"]').length, {
          timeout: 30_000,
        })
        .toBe(8);
      const frame = document.querySelector<HTMLElement>('[data-canvas-frame="home-mobile"]')!;
      const iframe = frame.querySelector<HTMLIFrameElement>('iframe[title$="composition"]')!;
      const initialHeight = frame.clientHeight;
      expect(initialHeight).toBeGreaterThan(3500);
      const heights = new Set([initialHeight]);
      observer = new MutationObserver(() => {
        heights.add(frame.clientHeight);
      });
      observer.observe(frame, { attributes: true, attributeFilter: ['style'] });
      const current = observed.probe!.state().frames[0].device!;
      initialRender = false;
      holdMeasurement = true;
      const patch = observed.apply!({
        expectedRevision: current.revision,
        expectedDataGeneration: current.dataGeneration,
        files: [
          {
            operation: 'write',
            path: 'home.hbs',
            content:
              '<html><head>{{ghost_head}}</head><body><main style="height:1200px">Shorter replacement</main></body></html>',
          },
        ],
      });
      await expect.poll(() => measurementHeld, { timeout: 30_000 }).toBe(true);
      expect(['pending', 'measuring']).toContain(iframe.dataset.compositionStatus);
      expect(iframe.dataset.compositionRevision).toBeUndefined();
      expect(frame.clientHeight).toBe(initialHeight);
      expect(iframe.clientHeight).toBe(initialHeight);
      releaseMeasurement();
      await patch;
      await expect.poll(() => iframe.dataset.previewStatus, { timeout: 30_000 }).toBe('Ready');
      expect(frame.clientHeight).toBeLessThan(initialHeight);
      expect(frame.clientHeight).toBe(iframe.clientHeight);
      expect(heights).toEqual(new Set([initialHeight, frame.clientHeight]));
      const measuredHeight = frame.clientHeight;
      const accepted = observed.probe!.state().frames[0].device!;
      failMeasurement = true;
      await observed.apply!({
        expectedRevision: accepted.revision,
        expectedDataGeneration: accepted.dataGeneration,
        files: [
          {
            operation: 'write',
            path: 'home.hbs',
            content:
              '<html><head>{{ghost_head}}</head><body><main style="height:700px">Failed measurement</main></body></html>',
          },
        ],
      });
      await expect.poll(() => iframe.dataset.compositionStatus, { timeout: 30_000 }).toBe('failed');
      expect(frame.clientHeight).toBe(measuredHeight);
      expect(iframe.clientHeight).toBe(measuredHeight);
      expect(heights).toEqual(new Set([initialHeight, measuredHeight]));
    } finally {
      releaseMeasurement();
      observer?.disconnect();
      await screen.unmount();
      vi.restoreAllMocks();
    }
  },
);

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
