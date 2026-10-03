import JSZip from 'jszip';
import { createRenderer } from '@tryghost/theme-renderer';
import {
  applyThemeLiteralTextEdit,
  getThemeLiteralTextTargets,
} from '@tryghost/theme-renderer/editor';
import { parseEditMarker } from '@tryghost/theme-renderer/markers';
import { CanvasThemePreview } from '@/builder/canvas/canvas-theme-preview';
import { ThemeWorkspace } from '@/builder/workspaces/theme/theme-workspace';
import { loadThemeDraft } from '@/builder/workspaces/theme/theme-loader';
import { withThemeRevision } from '@/builder/workspaces/theme/theme-state';
import { getThemeFixture, instance, loadAssets } from './fixture';
import { recordedContentResponse } from './recorded-content';
import { inspectCanvasRouting } from '@/builder/canvas/route-compatibility';
import type { ThemeFixtureId } from './fixture';
import type { FixtureRender, FixtureRefresh, FixturePatch } from './fixture-client';
import type { FixtureDataSnapshot } from './recorded-content';
import type { ThemeLoadCustomSetting } from '@/builder/workspaces/theme/theme-loader';
import type { ThemeDraft } from '@/builder/workspaces/theme/theme-state';
import type { ValidationResult } from '@/builder/core/workspace';
import type { CanvasThemeRender } from '@/builder/canvas/canvas-theme-preview';

// Renderer instances share helper state. Workspace/source ownership outlives
// every iframe; all fixture work shares this one serial worker lane.
let pending = Promise.resolve();
type FixtureDraft = {
  workspace: ThemeWorkspace;
  preview: CanvasThemePreview;
  inputs: { generation: number; snapshot: FixtureDataSnapshot };
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
    patch?: FixturePatch;
    routingYaml?: unknown;
  }>,
) => {
  const fixtureId = event.data.fixtureId ?? 'casper';
  pending = pending
    .then(() => render(fixtureId, event.data))
    .catch((error: unknown) => {
      self.postMessage({
        fixtureId,
        requestId: event.data.requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
};

function textTheme(draft: ThemeDraft): Record<string, string> {
  return Object.fromEntries(
    Object.entries(draft.files).flatMap(([path, file]) =>
      file.kind === 'text' && file.content !== null ? [[path, file.content]] : [],
    ),
  );
}

async function settings(snapshot: FixtureDataSnapshot): Promise<Record<string, unknown>> {
  const response = recordedContentResponse(
    // eslint-disable-next-line local/no-hardcoded-ghost-paths -- Exact recorded fixture URL; no installed-site request.
    new URL('/ghost/api/content/settings/?key=' + instance.contentApiKey, instance.siteUrl).href,
    snapshot,
  );
  const payload = (await response.json()) as { settings: Record<string, unknown> };
  return payload.settings;
}

async function createWorkspace(fixtureId: ThemeFixtureId): Promise<FixtureDraft> {
  const fixture = getThemeFixture(fixtureId);
  const inputs = { generation: 0, snapshot: 'recorded' as FixtureDataSnapshot };
  const preview = new CanvasThemePreview({
    required: {
      home: new URL(instance.routes.home, instance.siteUrl).href,
      post: new URL(instance.routes.post, instance.siteUrl).href,
    },
    getRenderGeneration: () => inputs.generation,
    render: async (draft, signal) => {
      signal.throwIfAborted();
      const theme = textTheme(draft);
      const snapshot = inputs.snapshot;
      const editMarkerAttribute = `data-builder-source-${crypto.randomUUID()}`;
      const renderer = await createRenderer({
        editMarkerAttribute,
        siteUrl: instance.siteUrl,
        contentApiKey: instance.contentApiKey,
        theme,
        config: instance.config,
        settingsPayload: { ...(await settings(snapshot)), ...draft.globalSettings },
        customThemeSettings: Object.fromEntries(
          Object.entries(draft.customSettings).map(([key, setting]) => [key, setting.value]),
        ),
        fetch: (input) => {
          const url =
            typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
          return Promise.resolve(recordedContentResponse(url, snapshot));
        },
      });
      const groups = {} as CanvasThemeRender['groups'];
      for (const group of ['home', 'post'] as const) {
        signal.throwIfAborted();
        const url = new URL(instance.routes[group], instance.siteUrl).href;
        const response = await renderer.render(new Request(url), { markers: true });
        groups[group] = { url, status: response.status, html: await response.text() };
      }
      return {
        groups,
        editMarkerAttribute,
        inlineTextTargets: getThemeLiteralTextTargets(theme, editMarkerAttribute),
      };
    },
  });
  const workspace = new ThemeWorkspace({
    id: `canvas-theme:${crypto.randomUUID()}`,
    title: fixture.label,
    preview,
    load: async (signal) => {
      const zip = new JSZip();
      for (const [path, content] of Object.entries(fixture.theme)) {
        zip.file(`${fixtureId}/${path}`, content);
      }
      const assets = await loadAssets(fixtureId);
      for (const [path, asset] of Object.entries(assets)) {
        zip.file(`${fixtureId}/${path}`, asset.binary ?? asset.content ?? '');
      }
      const values = await settings('recorded');
      const metadata = JSON.parse(fixture.theme['package.json']) as {
        config?: { custom?: Record<string, Record<string, unknown>> };
      };
      const customSettings = Object.entries(metadata.config?.custom ?? {}).map(
        ([key, setting]) => ({ ...setting, id: key, key, value: setting.default ?? null }),
      ) as ThemeLoadCustomSetting[];
      const draft = await loadThemeDraft(
        {
          theme: { name: fixtureId, builtIn: true },
          archive: await zip.generateAsync({ type: 'arraybuffer' }),
          settings: Object.entries(values).flatMap(([key, value]) =>
            typeof value === 'string' || value === null ? [{ key, value }] : [],
          ),
          customSettings,
          site: { url: instance.siteUrl, contentApiKey: instance.contentApiKey, liveHtml: '' },
        },
        signal,
      );
      return withThemeRevision({
        ...draft,
        renderer: { ...draft.renderer, config: instance.config, missing: [] },
      });
    },
  });
  await workspace.load(new AbortController().signal);
  return {
    workspace,
    preview,
    inputs,
    revision: fixture.revision,
    sequence: 0,
    dataGeneration: 0,
    dataSnapshot: 'recorded',
  };
}

function assertValidation(validation: ValidationResult): void {
  if (!validation.valid) {
    throw new Error(
      validation.diagnostics.map((item) => item.message).join(' ') ||
        'Canvas required-route validation failed.',
    );
  }
}

async function render(
  fixtureId: ThemeFixtureId,
  operation: {
    requestId?: number;
    edit?: Edit;
    refresh?: FixtureRefresh;
    patch?: FixturePatch;
    routingYaml?: unknown;
  },
) {
  const { requestId, edit, refresh, patch, routingYaml } = operation;
  const routing = inspectCanvasRouting(routingYaml);
  if (!routing.supported) {
    throw new Error(routing.message);
  }
  if ([edit, refresh, patch].filter(Boolean).length > 1) {
    throw new Error('A fixture request performs only one edit, patch or refresh.');
  }
  const current = drafts.get(fixtureId) ?? (await createWorkspace(fixtureId));
  const signal = new AbortController().signal;
  if (!edit && !refresh && !patch && current.lastRender) {
    self.postMessage({
      ...current.lastRender,
      requestId,
      unchanged: true,
      editedFile: undefined,
      sourceChanges: undefined,
    });
    return;
  }
  let dataGeneration = current.dataGeneration;
  let dataSnapshot = current.dataSnapshot;
  let sequence = current.sequence;
  let revision = current.revision;
  let editedFile: { path: string; content: string } | undefined;
  let sourceChanges: Record<string, string | null> | undefined;
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
        unchanged: true,
        editedFile: undefined,
        sourceChanges: undefined,
      });
      return;
    }
    dataSnapshot = refresh.snapshot;
    dataGeneration += 1;
  }
  current.inputs.generation = dataGeneration;
  current.inputs.snapshot = dataSnapshot;
  try {
    if (edit || patch) {
      const expectedRevision = edit?.expectedRevision ?? patch?.expectedRevision;
      const expectedDataGeneration = edit
        ? (edit.expectedDataGeneration ?? 0)
        : patch?.expectedDataGeneration;
      if (
        expectedRevision !== current.revision ||
        expectedDataGeneration !== current.dataGeneration
      ) {
        throw new Error(
          'The fixture source or data changed. Reselect the current render before editing.',
        );
      }
      let files = patch?.files;
      if (
        patch &&
        Object.keys(patch).some(
          (key) =>
            !['expectedRevision', 'expectedDataGeneration', 'files', 'settings'].includes(key),
        )
      ) {
        throw new Error('Invalid theme patch contract.');
      }
      if (edit) {
        const marker = parseEditMarker(edit.marker);
        if (!marker || typeof edit.newText !== 'string' || edit.newText.length > 4_096) {
          throw new Error('The literal text target or replacement is invalid.');
        }
        const theme = applyThemeLiteralTextEdit(
          textTheme(current.workspace.draft),
          marker,
          edit.newText,
          { tagName: edit.tagName },
        );
        editedFile = { path: marker.file, content: theme[marker.file] };
        files = [{ operation: 'write', path: editedFile.path, content: editedFile.content }];
      }
      const result = await current.workspace.applyThemePatch(
        { revision: current.workspace.draft.revision, files, settings: patch?.settings },
        signal,
        { promote: true, requirePromotedSource: true },
      );
      if (!result.ok) {
        const details = result.error.details as
          | { diagnostics?: Array<{ message: string }> }
          | undefined;
        throw new Error(
          details?.diagnostics?.map((item) => item.message).join(' ') || result.error.message,
        );
      }
      if (result.data.unchanged && current.lastRender) {
        self.postMessage({
          ...current.lastRender,
          requestId,
          unchanged: true,
          editedFile: undefined,
          sourceChanges: undefined,
        });
        return;
      }
      sequence += 1;
      revision = `${getThemeFixture(fixtureId).revision}:edit-${sequence}`;
      sourceChanges = Object.fromEntries(
        result.data.paths.map((path) => [
          path,
          current.workspace.draft.files[path]?.content ?? null,
        ]),
      );
    } else {
      assertValidation(await current.preview.renderCandidate(current.workspace.draft, signal));
    }
    const output = current.preview.stagedFor(current.workspace.draft.revision);
    const result: Omit<FixtureRender, 'requestId'> = {
      fixtureId,
      workspaceId: current.workspace.id,
      html: { home: output.groups.home.html, post: output.groups.post!.html },
      revision,
      dataGeneration,
      dataSnapshot,
      renderKey: `${revision}:data-${dataGeneration}`,
      editedFile,
      sourceChanges,
      inlineTextTargets: output.inlineTextTargets,
      editMarkerAttribute: output.editMarkerAttribute,
    };
    drafts.set(fixtureId, {
      ...current,
      sequence,
      revision,
      dataGeneration,
      dataSnapshot,
      lastRender: result,
    });
    self.postMessage({ ...result, requestId });
  } catch (error) {
    current.inputs.generation = current.dataGeneration;
    current.inputs.snapshot = current.dataSnapshot;
    throw error;
  }
}
