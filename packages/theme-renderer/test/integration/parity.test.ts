/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Slice-2 capstone: normalized BYTE comparison of the rendered home + post
 * routes against the live dev instance.
 *
 * Instance config the Content API cannot supply (docs/deltas.md rows 1 + 3) is
 * scraped from the live page and injected through `createRenderer({config})` —
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
import {GHOST_URL, loadCasperTheme, probeLive, writeOutput} from './harness.ts';

const probe = await probeLive();

// ---- instance config scraped from the live page (kills deltas 1 + 3) ----
// Per-boot asset hash: any `?v=<hash>` on a built asset URL
const assetHash = probe.liveHomeHtml.match(/\?v=([a-f0-9]+)"/)?.[1];
// Portal script tag (data-i18n is portal-specific — see getMembersHelper)
const portalUrl = probe.liveHomeHtml.match(/<script defer src="([^"]+)" data-i18n=/)?.[1];
// Sodo-search script tag (data-sodo-search is search-specific)
const sodoSearch = probe.liveHomeHtml.match(/<script defer src="([^"]+)" data-key="[^"]*" data-styles="([^"]*)" data-sodo-search=/);

/**
 * The documented-stub normalization list — ONE entry per surviving deltas.md
 * row. Each `apply` rewrites the live HTML into the renderer's expected
 * output; deleting a deltas.md row means deleting its entry here (and the
 * byte comparison then enforces the fix).
 */
const NORMALIZATIONS: Array<{delta: string; apply: (html: string) => string}> = [
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
    }
];

function normalizeLive(html: string): string {
    return NORMALIZATIONS.reduce((acc, {apply}) => apply(acc), html);
}

/** Byte-equality with first-divergence context in the failure message. */
function assertBytesEqual(rendered: string, expected: string, route: string): void {
    if (rendered === expected) {
        return;
    }
    let i = 0;
    while (i < rendered.length && i < expected.length && rendered[i] === expected[i]) {
        i += 1;
    }
    const start = Math.max(0, i - 150);
    assert.fail([
        `byte divergence on ${route} at offset ${i} (rendered ${rendered.length}B vs live-normalized ${expected.length}B)`,
        `rendered:          ${JSON.stringify(rendered.slice(start, i + 200))}`,
        `live (normalized): ${JSON.stringify(expected.slice(start, i + 200))}`
    ].join('\n'));
}

let rendererPromise: Promise<ThemeRenderer> | null = null;
function getRenderer(): Promise<ThemeRenderer> {
    rendererPromise ??= createRenderer({
        siteUrl: `${GHOST_URL}/`,
        contentApiKey: probe.contentApiKey,
        theme: loadCasperTheme(),
        config: {
            // deltas.md #1 — the live per-boot hash (upstream: config assetHash
            // wins over the boot-time md5 in getGlobalAssetHash)
            ...(assetHash && {assetHash}),
            // deltas.md #3 — frontend-app instance config (Ghost server
            // config keys, extraction-map §6)
            ...(portalUrl && {portal: {url: portalUrl}}),
            ...(sodoSearch && {sodoSearch: {url: sodoSearch[1], styles: sodoSearch[2]}})
        }
    });
    return rendererPromise;
}

describe.skipIf(Boolean(probe.unavailableReason))(`byte parity (${probe.unavailableReason || GHOST_URL})`, function () {
    it('scrapes the instance config the Content API cannot supply', function () {
        assert.ok(assetHash, 'live page carries a ?v= asset hash');
        assert.ok(portalUrl, 'live page carries the portal script tag');
        assert.ok(sodoSearch, 'live page carries the sodo-search script tag');
    });

    it('renders the home route byte-identical to live modulo documented stubs', async function () {
        const renderer = await getRenderer();
        const response = await renderer.render(new Request(`${GHOST_URL}/`));
        assert.equal(response.status, 200);
        const rendered = await response.text();
        const expected = normalizeLive(probe.liveHomeHtml);

        writeOutput('parity-home', rendered, expected);
        assertBytesEqual(rendered, expected, '/');
    });

    it('renders the post route byte-identical to live modulo documented stubs', async function () {
        const postsResponse = await fetch(`${GHOST_URL}/ghost/api/content/posts/?key=${probe.contentApiKey}&limit=1&fields=slug,url`);
        const {posts} = await postsResponse.json() as any;
        assert.ok(posts?.length, 'dev instance has at least one post');
        const {slug, url} = posts[0];

        const liveResponse = await fetch(url);
        const livePostHtml = await liveResponse.text();

        const renderer = await getRenderer();
        const response = await renderer.render(new Request(url));
        assert.equal(response.status, 200);
        const rendered = await response.text();
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
        const rendered = await response.text();
        const expected = normalizeLive(liveTagHtml);

        writeOutput(`parity-tag-${slug}`, rendered, expected);
        assertBytesEqual(rendered, expected, `/tag/${slug}/`);
    });
});
