import { useState } from 'react';
import { ThemeCanvas } from '@/builder/canvas/theme-canvas';
import { getThemeFixture, instance, loadAssets } from './fixture';
import { FixtureClient, FixtureRejectedError } from './fixture-client';
import { CanvasRejectedError } from '@/builder/canvas/canvas-driver';
import {
  DEFAULT_CANVAS_ROUTING_SOURCE,
  inspectCanvasRouting,
} from '@/builder/canvas/route-compatibility';
import type { ComponentProps } from 'react';
import type { ThemeFixtureId } from './fixture';
import type { FixturePatch, FixtureRender } from './fixture-client';
import type { CanvasSource } from '@/builder/canvas/canvas-driver';

export function CanvasHarness({
  fixtureId = 'casper',
  routingYaml = DEFAULT_CANVAS_ROUTING_SOURCE,
  onApplyThemePatch,
  ...props
}: Omit<ComponentProps<typeof ThemeCanvas>, 'source' | 'onApplyThemePatch'> & {
  fixtureId?: ThemeFixtureId;
  routingYaml?: unknown;
  onApplyThemePatch?: (apply: ((patch: FixturePatch) => Promise<FixtureRender>) | null) => void;
}) {
  const [source] = useState<CanvasSource>(() => {
    const fixture = getThemeFixture(fixtureId);
    return {
      fixture: true,
      id: fixture.id,
      label: fixture.label,
      version: fixture.version,
      revision: fixture.revision,
      files: fixture.theme,
      siteUrl: instance.siteUrl,
      routes: instance.routes,
      routing: inspectCanvasRouting(routingYaml),
      refreshLabel: (snapshot) =>
        snapshot === 'long-title' ? 'Restore recorded content' : 'Refresh recorded content',
      createDriver: () => {
        const client = new FixtureClient(fixtureId, routingYaml);
        const translate = async (operation: Promise<FixtureRender>) => {
          try {
            return await operation;
          } catch (error) {
            if (error instanceof FixtureRejectedError) {
              throw new CanvasRejectedError(error.message);
            }
            throw error;
          }
        };
        return {
          render: (edit) => translate(client.render(edit)),
          applyThemePatch: (patch) => translate(client.applyThemePatch(patch)),
          loadAssets: () => loadAssets(fixtureId),
          dispose: () => client.dispose(),
          refresh: (accepted) =>
            translate(
              client.refresh({
                expectedRevision: accepted.revision,
                expectedDataGeneration: accepted.dataGeneration,
                snapshot: accepted.dataSnapshot === 'recorded' ? 'long-title' : 'recorded',
              }),
            ),
        };
      },
    };
  });
  return (
    <ThemeCanvas
      {...props}
      source={source}
      onApplyThemePatch={
        onApplyThemePatch
          ? (apply) => {
              onApplyThemePatch(
                apply ? async (patch) => (await apply(patch)) as FixtureRender : null,
              );
            }
          : undefined
      }
    />
  );
}
