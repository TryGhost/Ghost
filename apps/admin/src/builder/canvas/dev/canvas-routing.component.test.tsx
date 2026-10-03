import { expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { Box } from '@tryghost/shade/primitives';
import { renderInApp } from '@test-utils/acceptance/render-in-app';
import { DEFAULT_CANVAS_ROUTING_SOURCE } from '@/builder/canvas/route-compatibility';
import { CanvasHarness } from './canvas-harness';
import { FixtureClient } from './fixture-client';
import type { CanvasProbe } from './webmcp-probe';

it.each([
  [
    'custom',
    DEFAULT_CANVAS_ROUTING_SOURCE.replace('/{slug}/', '/news/{slug}/'),
    'custom routing',
    'routing_unsupported',
  ],
  ['unavailable', null, 'could not verify', 'routing_unavailable'],
] as const)(
  'keeps the %s routing canvas explained without issuing render or edit work',
  async (_label, routingYaml, message, code) => {
    const render = vi.spyOn(FixtureClient.prototype, 'render');
    const observed: { probe: CanvasProbe | null } = { probe: null };
    const screen = await renderInApp(
      <Box style={{ width: 1200, height: 900 }}>
        <CanvasHarness
          fixtureId="source"
          routingYaml={routingYaml}
          onProbe={(probe) => {
            observed.probe = probe;
          }}
        />
      </Box>,
    );
    try {
      await expect.element(page.getByRole('alert')).toHaveTextContent(message);
      await expect
        .element(page.getByRole('link', { name: 'Open site preview', exact: true }))
        .toHaveAttribute('href', 'http://localhost:2368/');
      await expect
        .element(page.getByRole('button', { name: 'Refresh recorded content', exact: true }))
        .toBeDisabled();
      expect(document.querySelectorAll('iframe')).toHaveLength(0);
      expect(render).not.toHaveBeenCalled();
      await expect
        .poll(() => observed.probe?.state().diagnostics.routing)
        .toMatchObject({ supported: false, code });
      expect(document.querySelector('[data-canvas-diagnostics]')).toBeNull();
    } finally {
      await screen.unmount();
      vi.restoreAllMocks();
    }
  },
);
