/**
 * Slice 3 (editor spike): renderer-level source markers over the recorded
 * Casper fixtures — fully hermetic, like fixture-parity.test.ts.
 *
 * The contract under test:
 * - `renderer.render(request)` stays BYTE-IDENTICAL to the committed expected
 *   HTML (markers are strictly opt-in, and a markers render must not pollute
 *   the default path's caches);
 * - `renderer.render(request, {markers: true})` stamps rendered elements with
 *   `data-edit="<theme-file>:<line>:<column>"` and changes NOTHING else —
 *   stripping the attributes recovers the markers-off bytes exactly;
 * - every emitted marker seeks to the `<` of a real open tag in the actual
 *   theme source (the editor's click→source mapping).
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, it} from 'vitest';
import {createRenderer, parseEditMarker, type ThemeRenderer} from '../../src/index.ts';
import {createReplayFetch, type ApiFixtures} from '../browser/replay-fetch.ts';

const FIXTURES_DIR = join(import.meta.dirname, '../browser/fixtures');

const read = (name: string): string => readFileSync(join(FIXTURES_DIR, name), 'utf8');

const instance = JSON.parse(read('instance.json')) as {
    siteUrl: string;
    contentApiKey: string;
    config: Record<string, unknown>;
    routes: {home: string; post: string};
};
const theme = JSON.parse(read('casper-theme.json')) as Record<string, string>;
const expectedHome = read('expected-home.html');

const MARKER_ATTRS = / data-edit="([^"]+)"/g;

let rendererPromise: Promise<ThemeRenderer> | null = null;
function getRenderer(): Promise<ThemeRenderer> {
    rendererPromise ??= createRenderer({
        siteUrl: instance.siteUrl,
        contentApiKey: instance.contentApiKey,
        theme,
        config: instance.config,
        fetch: createReplayFetch(JSON.parse(read('content-api.json')) as ApiFixtures)
    });
    return rendererPromise;
}

async function renderHome(markers: boolean): Promise<string> {
    const renderer = await getRenderer();
    const request = new Request(new URL(instance.routes.home, instance.siteUrl).toString());
    const response = await renderer.render(request, {markers});
    assert.equal(response.status, 200);
    return response.text();
}

/** The data-edit value the transform must emit for `needle`'s first `<` in a theme file. */
function markerFor(file: string, needle: string): string {
    const source = theme[file]!;
    const offset = source.indexOf(needle);
    assert.notEqual(offset, -1, `fixture drift: ${needle} not found in ${file}`);
    const before = source.slice(0, offset);
    const line = (before.match(/\n/g)?.length ?? 0) + 1;
    const column = offset - (before.lastIndexOf('\n') + 1) + 1;
    return `${file}:${line}:${column}`;
}

describe('source markers over the recorded Casper fixtures (hermetic)', function () {
    it('markers off stays byte-identical — before AND after a markers-on render', async function () {
        assert.equal(await renderHome(false), expectedHome);
        const marked = await renderHome(true);
        assert.match(marked, MARKER_ATTRS);
        // the markers render must not have polluted the default engine's caches
        assert.equal(await renderHome(false), expectedHome);
    });

    it('markers on: stripping data-edit recovers the markers-off bytes exactly', async function () {
        const marked = await renderHome(true);
        assert.equal(marked.replace(MARKER_ATTRS, ''), expectedHome);
    });

    it('every marker seeks to the "<" of an open tag in the actual theme source', async function () {
        const marked = await renderHome(true);
        const markers = [...marked.matchAll(MARKER_ATTRS)].map(match => match[1]!);
        // Casper home is marker-dense; a low floor keeps this robust to theme
        // updates while still failing if marking largely stops working
        assert.ok(markers.length >= 100, `expected at least 100 markers, got ${markers.length}`);

        for (const value of markers) {
            const marker = parseEditMarker(value);
            assert.ok(marker, `unparseable marker: ${value}`);
            const source = theme[marker.file];
            assert.ok(source, `marker points at unknown theme file: ${value}`);
            const lines = source.split('\n');
            const lineText = lines[marker.line - 1];
            assert.ok(lineText !== undefined, `marker line out of range: ${value}`);
            const tagStart = lineText.slice(marker.column - 1);
            assert.match(tagStart, /^<[a-zA-Z]/, `marker does not point at an open tag: ${value} → ${JSON.stringify(tagStart.slice(0, 20))}`);
        }
    });

    it('site-header, post cards and the layout carry markers for the right Casper files and positions', async function () {
        const marked = await renderHome(true);

        // layout: default.hbs owns <html> (line 2 — line 1 is the doctype)
        assert.ok(marked.includes(`<html data-edit="${markerFor('default.hbs', '<html')}"`));
        // template: index.hbs owns the site header
        assert.ok(marked.includes(`<div data-edit="${markerFor('index.hbs', '<div class="site-header-content')}"`));
        // partial: every post card points at the SAME source location in
        // partials/post-card.hbs — one card in source, N in the rendered page
        const cardMarker = `<article data-edit="${markerFor('partials/post-card.hbs', '<article')}"`;
        const cardCount = marked.split(cardMarker).length - 1;
        const expectedCards = expectedHome.match(/<article class="post-card/g)?.length ?? 0;
        assert.ok(expectedCards > 0, 'fixture drift: no post cards in expected-home.html');
        assert.equal(cardCount, expectedCards);
    });

    it('helper-emitted HTML (ghost_head) carries no markers — documented punt', async function () {
        const marked = await renderHome(true);
        // JSON-LD script emitted by {{ghost_head}} exists but is unmarked
        const jsonLd = /<script type="application\/ld\+json">/;
        assert.match(marked, jsonLd);
        assert.doesNotMatch(marked, /<script data-edit="[^"]*" type="application\/ld\+json">/);
    });
});
