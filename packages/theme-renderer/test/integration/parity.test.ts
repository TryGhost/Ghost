/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Slice-2 capstone: normalized BYTE comparison of the rendered home + post
 * routes against the live dev instance.
 *
 * Instance config the Content API cannot supply (docs/deltas.md rows 1 + 3) is
 * scraped from the live page (harness.ts scrapeInstanceConfig — shared with
 * the fixture recorder) and injected through `createRenderer({config})` —
 * the real per-boot asset hash and the portal/sodo-search frontend-app URLs —
 * so those script tags must come out byte-identical, not normalized away.
 *
 * What remains is the documented-stub list: `NORMALIZATIONS` below carries one
 * entry per remaining deltas.md row, each transforming the LIVE html into what
 * the renderer is expected to produce. Any divergence NOT covered by an entry
 * fails the byte comparison — undocumented deltas cannot slip through.
 */
import assert from 'node:assert/strict';
import {describe, it} from 'vitest';
import {createRenderer, type ThemeRenderer} from '../../src/index.ts';
import {expectBytesEqual} from '../browser/expect-bytes-equal.ts';
import {GHOST_URL, fetchFirstPost, loadCasperTheme, probeLive, scrapeInstanceConfig, writeOutput} from './harness.ts';

const probe = await probeLive();

// ---- instance config scraped from the live page (kills deltas 1 + 3) ----
const scrape = scrapeInstanceConfig(probe.liveHomeHtml);

// The comments-ui script URL only appears on post pages with comments
// enabled, so the home scrape can't see it — fetch the first post up front
// and merge its scrape (the post parity test reuses this HTML).
const firstPost = probe.unavailableReason ? null : await fetchFirstPost(probe.contentApiKey);
const livePostHtml = firstPost ? await (await fetch(firstPost.url)).text() : '';
const postScrape = livePostHtml ? scrapeInstanceConfig(livePostHtml) : null;
const rendererConfig = {
    ...scrape.config,
    ...(postScrape?.commentsUrl ? {comments: {url: postScrape.commentsUrl}} : {})
};

/**
 * The documented-stub normalization list — ONE entry per surviving deltas.md
 * row. Each `apply` rewrites the live HTML into the renderer's expected
 * output; deleting a deltas.md row means deleting its entry here (and the
 * byte comparison then enforces the fix). An entry with `bothSides` applies
 * to the RENDERED html too — for stubs whose live value is unknowable through
 * the seam, where the divergence can point in either direction.
 */
const NORMALIZATIONS: Array<{delta: string; bothSides?: boolean; apply: (html: string) => string}> = [
    {
        // createImageSizeCache stub resolves null → ghost_head omits the
        // og:image dimension meta tags
        delta: 'deltas.md #2 — og:image:width/height meta (image probing stub)',
        apply: html => html.replace(/\n\s*<meta property="og:image:(?:width|height)" content="\d+">/g, '')
    },
    {
        // same stub — JSON-LD image/logo objects lose width/height
        delta: 'deltas.md #2 — JSON-LD image/logo width/height (image probing stub)',
        apply: html => html.replace(/,\n(\s*)"width": \d+,\n\s*"height": \d+/g, '')
    },
    {
        // members_track_sources is a non-public setting → undefined via the
        // Content API → the member-attribution script is never emitted
        delta: 'deltas.md #4 — member-attribution script (non-public setting)',
        apply: html => html.replace(/\n\s*<script defer src="\/public\/member-attribution\.min\.js[^"]*"><\/script>/g, '')
    },
    {
        // llms_enabled is a non-public setting → undefined via the Content
        // API → the renderer assumes Ghost's shipped default (true) and
        // emits the markdown alternate link; a site that toggled AI access
        // OFF drops it. Unknowable through the seam, so the link is excluded
        // from the comparison on BOTH sides.
        delta: 'deltas.md #11 — markdown alternate link (llms_enabled non-public)',
        bothSides: true,
        apply: html => html.replace(/\n\s*<link rel="alternate" type="text\/markdown" href="[^"]*">/g, '')
    }
];

function normalizeLive(html: string): string {
    return NORMALIZATIONS.reduce((acc, {apply}) => apply(acc), html);
}

function normalizeRendered(html: string): string {
    return NORMALIZATIONS.reduce((acc, {apply, bothSides}) => (bothSides ? apply(acc) : acc), html);
}

/** Byte-equality with first-divergence context in the failure message. */
function assertBytesEqual(rendered: string, expected: string, route: string): void {
    expectBytesEqual(rendered, expected, route, {actual: 'rendered', expected: 'live-normalized'});
}

let rendererPromise: Promise<ThemeRenderer> | null = null;
function getRenderer(): Promise<ThemeRenderer> {
    rendererPromise ??= createRenderer({
        siteUrl: `${GHOST_URL}/`,
        contentApiKey: probe.contentApiKey,
        theme: loadCasperTheme(),
        config: rendererConfig
    });
    return rendererPromise;
}

describe.skipIf(Boolean(probe.unavailableReason))(`byte parity (${probe.unavailableReason || GHOST_URL})`, function () {
    it('scrapes the instance config the Content API cannot supply', function () {
        assert.deepEqual(scrape.missing, [], `live page scrapes missed: ${scrape.missing.join(', ')}`);
        assert.ok(scrape.assetHash, 'live page carries a ?v= asset hash');
        assert.ok(scrape.portalUrl, 'live page carries the portal script tag');
        assert.ok(scrape.sodoSearch, 'live page carries the sodo-search script tag');
    });

    it('renders the home route byte-identical to live modulo documented stubs', async function () {
        const renderer = await getRenderer();
        const response = await renderer.render(new Request(`${GHOST_URL}/`));
        assert.equal(response.status, 200);
        const rendered = normalizeRendered(await response.text());
        const expected = normalizeLive(probe.liveHomeHtml);

        writeOutput('parity-home', rendered, expected);
        assertBytesEqual(rendered, expected, '/');
    });

    it('renders the post route byte-identical to live modulo documented stubs', async function () {
        assert.ok(firstPost, 'dev instance has at least one post');
        const {slug, url} = firstPost;

        const renderer = await getRenderer();
        const response = await renderer.render(new Request(url));
        assert.equal(response.status, 200);
        const rendered = normalizeRendered(await response.text());
        const expected = normalizeLive(livePostHtml);

        writeOutput(`parity-post-${slug}`, rendered, expected);
        assertBytesEqual(rendered, expected, `/${slug}/`);
    });

    it('renders the tag route byte-identical to live modulo documented stubs', async function () {
        const tagsResponse = await fetch(`${GHOST_URL}/ghost/api/content/tags/?key=${probe.contentApiKey}&limit=1&fields=slug,url&filter=visibility:public`);
        const {tags} = await tagsResponse.json() as any;
        assert.ok(tags?.length, 'dev instance has at least one public tag');
        const {slug, url} = tags[0];

        const liveResponse = await fetch(url);
        assert.equal(liveResponse.status, 200);
        const liveTagHtml = await liveResponse.text();

        const renderer = await getRenderer();
        const response = await renderer.render(new Request(url));
        assert.equal(response.status, 200);
        const rendered = normalizeRendered(await response.text());
        const expected = normalizeLive(liveTagHtml);

        writeOutput(`parity-tag-${slug}`, rendered, expected);
        assertBytesEqual(rendered, expected, `/tag/${slug}/`);
    });
});
