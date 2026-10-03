import { createRenderer } from '@tryghost/theme-renderer';
import {
  applyThemeLiteralTextEdit,
  getThemeLiteralTextTargets,
} from '@tryghost/theme-renderer/editor';
import { parseEditMarker } from '@tryghost/theme-renderer/markers';

import { getThemeFixture, instance } from './fixture';
import { recordedContentResponse } from './recorded-content';
import type { ThemeFixtureId } from './fixture';

// One worker and a serial render loop: renderer instances share module-level helper state.
let pending = Promise.resolve();
const drafts = new Map<
  ThemeFixtureId,
  { theme: Record<string, string>; revision: string; sequence: number }
>();
type Edit = { marker: string; tagName: string; newText: string; expectedRevision: string };
self.onmessage = (
  event: MessageEvent<{ fixtureId?: ThemeFixtureId; requestId?: number; edit?: Edit }>,
) => {
  const fixtureId = event.data.fixtureId ?? 'casper';
  pending = pending
    .then(() => render(fixtureId, event.data.requestId, event.data.edit))
    .catch((error: unknown) => {
      self.postMessage({
        fixtureId,
        requestId: event.data.requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
};

async function render(fixtureId: ThemeFixtureId, requestId?: number, edit?: Edit) {
  // Generated per render and separate from author/content data-edit attributes.
  const editMarkerAttribute = `data-builder-source-${crypto.randomUUID()}`;
  const fixture = getThemeFixture(fixtureId);
  const current = drafts.get(fixtureId) ?? {
    theme: fixture.theme,
    revision: fixture.revision,
    sequence: 0,
  };
  let theme = current.theme;
  let editedFile: { path: string; content: string } | undefined;
  if (edit) {
    if (edit.expectedRevision !== current.revision) {
      throw new Error(
        'The fixture source changed. Reselect the current rendered text before editing.',
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
      return Promise.resolve(recordedContentResponse(url));
    },
  });
  const html: Record<string, string> = {};
  for (const [group, path] of Object.entries(instance.routes)) {
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
  drafts.set(fixtureId, { theme, revision, sequence });
  self.postMessage({
    fixtureId,
    requestId,
    html,
    revision,
    editedFile,
    inlineTextTargets: getThemeLiteralTextTargets(theme, editMarkerAttribute),
    editMarkerAttribute,
  });
}
