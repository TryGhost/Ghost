/**
 * Slice-3 editor-loop proof, in the editor's real runtime: the FULL loop
 *
 *   marked render (real Web Worker) → simulated click (DOM walk-up to the
 *   nearest data-edit ancestor, parseEditMarker) → anchor-verified text edit
 *   of the in-memory theme source (applyTextEdit) → NEW renderer in the
 *   worker over the edited theme → re-render → preview HTML shows the edit,
 *   untouched regions byte-identical.
 *
 * "New renderer per edit" is the supported path (docs/markers.md §editor
 * loop): the worker builds a fresh renderer per posted message, so each
 * renderInWorker call IS the fresh-renderer step. Round-trip durations are
 * logged (worker boot + bundle compile + createRenderer + render) — no
 * assertion threshold, cold-start times are not stable enough for one.
 */
import { describe, expect, it } from 'vitest';
import {
  EDIT_MARKER_ATTRIBUTE,
  parseEditMarker,
  type EditMarker,
} from '../../src/engine/markers.ts';
import { applyThemeTextEdit } from '../../src/editor/text-edit.ts';
import { renderInWorker, type TimedWorkerRenderResult } from './worker-client.ts';
import type { WorkerRenderRequest } from './render-worker.ts';
import type { ApiFixtures } from './replay-fetch.ts';
import instanceRaw from './fixtures/instance.json?raw';
import themeRaw from './fixtures/casper-theme.json?raw';
import apiFixturesRaw from './fixtures/content-api.json?raw';
import expectedHome from './fixtures/expected-home.html?raw';

interface InstanceFixture {
  siteUrl: string;
  contentApiKey: string;
  config: Record<string, unknown>;
  routes: { home: string; post: string };
}

const instance = JSON.parse(instanceRaw) as InstanceFixture;
const theme = JSON.parse(themeRaw) as Record<string, string>;
const apiFixtures = JSON.parse(apiFixturesRaw) as ApiFixtures;

function markedHomeRequest(themeFiles: Record<string, string>): WorkerRenderRequest {
  return {
    siteUrl: instance.siteUrl,
    contentApiKey: instance.contentApiKey,
    theme: themeFiles,
    config: instance.config,
    apiFixtures,
    path: instance.routes.home,
    markers: true,
  };
}

function renderedHtml(result: TimedWorkerRenderResult): string {
  if (!result.ok) {
    expect.fail(`worker render failed:\n${result.error}`);
  }
  expect(result.status).toBe(200);
  return result.html;
}

function parseDom(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

/**
 * Exactly what a click handler does (docs/markers.md §editor loop): from the
 * "clicked" element, walk up to the nearest data-edit ancestor and parse its
 * marker into {file, line, column}.
 */
function simulateClick(doc: Document, selector: string): { marker: EditMarker; el: Element } {
  const clicked = doc.querySelector(selector);
  expect(clicked, `no element matches ${selector}`).not.toBeNull();
  const el = clicked!.closest(`[${EDIT_MARKER_ATTRIBUTE}]`);
  expect(el, `no ${EDIT_MARKER_ATTRIBUTE} ancestor for ${selector}`).not.toBeNull();
  const marker = parseEditMarker(el!.getAttribute(EDIT_MARKER_ATTRIBUTE)!);
  expect(marker).not.toBeNull();
  return { marker: marker!, el: el! };
}

const stripMarkers = (html: string): string => html.replace(/ data-edit="[^"]*"/g, '');

describe('editor loop (click → edit → worker re-render → preview update)', function () {
  it('edits the site title and re-renders with untouched regions byte-identical', async function () {
    const NEW_TITLE = 'Edited Via The Loop';
    expect(expectedHome).not.toContain(NEW_TITLE);

    const first = await renderInWorker(markedHomeRequest(theme));
    const firstHtml = renderedHtml(first);
    // baseline sanity: stripping markers recovers the recorded parity bytes
    expect(stripMarkers(firstHtml)).toBe(expectedHome);

    // 1. "click" the site title, resolve its theme source location
    const doc = parseDom(firstHtml);
    const { marker, el } = simulateClick(doc, '.site-title');
    const oldText = el.textContent!;
    expect(marker.file).toBe('index.hbs');
    // the marker seeks straight to the element's open tag in the ORIGINAL source
    const markerLine = theme[marker.file]!.split('\n')[marker.line - 1]!;
    expect(markerLine.slice(marker.column - 1).startsWith('<h1')).toBe(true);

    // 2. apply the text edit to the in-memory theme (anchor = clicked tag)
    const editedTheme = applyThemeTextEdit(theme, marker, NEW_TITLE, { tagName: el.tagName });
    expect(editedTheme[marker.file]).not.toBe(theme[marker.file]);

    // 3. fresh renderer in the worker over the edited theme → re-render
    const second = await renderInWorker(markedHomeRequest(editedTheme));
    const secondHtml = renderedHtml(second);

    // 4. the preview shows the new text where the old text was...
    const doc2 = parseDom(secondHtml);
    const editedEl = doc2.querySelector('.site-title')!;
    expect(editedEl.textContent).toBe(NEW_TITLE);
    // ...still carrying the same marker (the edit never adds/removes lines
    // before the tag), so the element stays clickable at the same source
    expect(editedEl.getAttribute(EDIT_MARKER_ATTRIBUTE)).toBe(
      `${marker.file}:${marker.line}:${marker.column}`,
    );

    // 5. untouched regions are byte-identical: restoring the old text in
    // the stripped re-render reproduces the recorded parity bytes exactly
    expect(stripMarkers(secondHtml).replaceAll(NEW_TITLE, oldText)).toBe(expectedHome);

    // eslint-disable-next-line no-console
    console.log(
      `[editor-loop] site-title: initial marked render ${first.durationMs.toFixed(0)}ms, re-render after edit ${second.durationMs.toFixed(0)}ms`,
    );
  });

  it('editing one post-card marker location changes ALL cards (shared source position)', async function () {
    const NEW_EXCERPT = 'One edit changes every card';
    expect(expectedHome).not.toContain(NEW_EXCERPT);

    const first = await renderInWorker(markedHomeRequest(theme));
    const doc = parseDom(renderedHtml(first));

    // every card's excerpt carries the SAME marker — one source position
    const excerpts = [...doc.querySelectorAll('.post-card-excerpt')];
    expect(excerpts.length).toBeGreaterThan(1); // 23 in the recorded fixture
    const markerValues = new Set(excerpts.map((e) => e.getAttribute(EDIT_MARKER_ATTRIBUTE)));
    expect(markerValues.size).toBe(1);

    const { marker, el } = simulateClick(doc, '.post-card-excerpt');
    expect(marker.file).toBe('partials/post-card.hbs');

    const editedTheme = applyThemeTextEdit(theme, marker, NEW_EXCERPT, { tagName: el.tagName });
    const second = await renderInWorker(markedHomeRequest(editedTheme));
    const doc2 = parseDom(renderedHtml(second));

    // ALL cards changed — correct for this slice: every {{#foreach}}
    // iteration renders the same partials/post-card.hbs source location
    const after = [...doc2.querySelectorAll('.post-card-excerpt')];
    expect(after.length).toBe(excerpts.length);
    expect(after.map((e) => e.textContent)).toEqual(excerpts.map(() => NEW_EXCERPT));

    // untouched elements of the same cards are unaffected
    const cardTitles = (d: Document): (string | null)[] =>
      [...d.querySelectorAll('.post-card-title')].map((e) => e.textContent);
    expect(cardTitles(doc2)).toEqual(cardTitles(doc));

    // eslint-disable-next-line no-console
    console.log(
      `[editor-loop] post-card: initial marked render ${first.durationMs.toFixed(0)}ms, re-render after edit ${second.durationMs.toFixed(0)}ms`,
    );
  });
});
