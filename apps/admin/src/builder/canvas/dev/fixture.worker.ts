import { createRenderer } from '@tryghost/theme-renderer';
import {
  applyThemeLiteralTextEdit,
  getThemeLiteralTextTargets,
} from '@tryghost/theme-renderer/editor';
import { parseEditMarker } from '@tryghost/theme-renderer/markers';

import { getThemeFixture, instance } from './fixture';
import { recordedContentResponse } from './recorded-content';
import { inspectCanvasRouting } from '@/builder/canvas/route-compatibility';
import type { ThemeFixtureId } from './fixture';
import type { FixtureRender, FixtureRefresh } from './fixture-client';
import type { FixtureDataSnapshot } from './recorded-content';

// One worker and a serial render loop: renderer instances share module-level helper state.
let pending = Promise.resolve();
type FixtureDraft = {
  theme: Record<string, string>;
  revision: string;
  sequence: number;
  dataGeneration: number;
  dataSnapshot: FixtureDataSnapshot;
  lastRender?: Omit<FixtureRender, 'requestId'>;
};
const drafts = new Map<ThemeFixtureId, FixtureDraft>();
type Edit = {
  marker: string;
  tagName: string;
  newText: string;
  expectedRevision: string;
  expectedDataGeneration?: number;
};
self.onmessage = (
  event: MessageEvent<{
    fixtureId?: ThemeFixtureId;
    requestId?: number;
    edit?: Edit;
    refresh?: FixtureRefresh;
    routingYaml?: unknown;
  }>,
) => {
  const fixtureId = event.data.fixtureId ?? 'casper';
  pending = pending
    .then(() =>
      render(
        fixtureId,
        event.data.requestId,
        event.data.edit,
        event.data.refresh,
        event.data.routingYaml,
      ),
    )
    .catch((error: unknown) => {
      self.postMessage({
        fixtureId,
        requestId: event.data.requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
};

async function render(
  fixtureId: ThemeFixtureId,
  requestId?: number,
  edit?: Edit,
  refresh?: FixtureRefresh,
  routingYaml?: unknown,
) {
  const routing = inspectCanvasRouting(routingYaml);
  if (!routing.supported) {
    throw new Error(routing.message);
  }
  // Generated per render and separate from author/content data-edit attributes.
  const editMarkerAttribute = `data-builder-source-${crypto.randomUUID()}`;
  const fixture = getThemeFixture(fixtureId);
  const current: FixtureDraft = drafts.get(fixtureId) ?? {
    theme: fixture.theme,
    revision: fixture.revision,
    sequence: 0,
    dataGeneration: 0,
    dataSnapshot: 'recorded' as const,
  };
  if (edit && refresh) {
    throw new Error('A fixture request cannot edit source and refresh data together.');
  }
  let dataGeneration = current.dataGeneration;
  let dataSnapshot = current.dataSnapshot;
  if (refresh) {
    if (
      refresh.expectedRevision !== current.revision ||
      refresh.expectedDataGeneration !== current.dataGeneration
    ) {
      throw new Error(
        'The fixture source or data changed. Rediscover the current render before refreshing.',
      );
    }
    if (refresh.snapshot !== 'recorded' && refresh.snapshot !== 'long-title') {
      throw new Error('Unknown recorded content snapshot.');
    }
    if (refresh.snapshot === current.dataSnapshot && current.lastRender) {
      self.postMessage({
        ...current.lastRender,
        requestId,
        editedFile: undefined,
        unchanged: true,
      });
      return;
    }
    dataSnapshot = refresh.snapshot;
    dataGeneration += 1;
  }
  let theme = current.theme;
  let editedFile: { path: string; content: string } | undefined;
  if (edit) {
    if (
      edit.expectedRevision !== current.revision ||
      (edit.expectedDataGeneration ?? 0) !== current.dataGeneration
    ) {
      throw new Error(
        'The fixture source or data changed. Reselect the current rendered text before editing.',
      );
    }
    const marker = parseEditMarker(edit.marker);
    if (!marker || typeof edit.newText !== 'string' || edit.newText.length > 4_096) {
      throw new Error('The literal text target or replacement is invalid.');
    }
    theme = applyThemeLiteralTextEdit(current.theme, marker, edit.newText, {
      tagName: edit.tagName,
    });
    editedFile = { path: marker.file, content: theme[marker.file] };
  }
  const renderer = await createRenderer({
    editMarkerAttribute,
    siteUrl: instance.siteUrl,
    contentApiKey: instance.contentApiKey,
    theme,
    config: instance.config,
    fetch: (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      return Promise.resolve(recordedContentResponse(url, dataSnapshot));
    },
  });
  const html: Record<'home' | 'post', string> = { home: '', post: '' };
  for (const group of ['home', 'post'] as const) {
    const path = instance.routes[group];
    const response = await renderer.render(new Request(new URL(path, instance.siteUrl)), {
      markers: true,
    });
    if (response.status !== 200) {
      throw new Error(`${group} fixture render returned ${response.status}`);
    }
    html[group] = await response.text();
  }
  const sequence = current.sequence + (edit ? 1 : 0);
  const revision = edit ? `${fixture.revision}:edit-${sequence}` : current.revision;
  // A rejected edit/render leaves the last accepted source intact. Both required
  // representatives finish before this local fixture revision is accepted.
  const result: Omit<FixtureRender, 'requestId'> = {
    fixtureId,
    html,
    revision,
    dataGeneration,
    dataSnapshot,
    renderKey: `${revision}:data-${dataGeneration}`,
    editedFile,
    inlineTextTargets: getThemeLiteralTextTargets(theme, editMarkerAttribute),
    editMarkerAttribute,
  };
  drafts.set(fixtureId, {
    theme,
    revision,
    sequence,
    dataGeneration,
    dataSnapshot,
    lastRender: result,
  });
  self.postMessage({ ...result, requestId });
}
