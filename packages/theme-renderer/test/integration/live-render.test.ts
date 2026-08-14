/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Slice-1 capstone: render Casper's home route and one post route against the
 * local dev instance and compare with the live HTML.
 *
 * - Site URL/key come from GHOST_URL / GHOST_CONTENT_API_KEY, falling back to
 *   http://localhost:2368 with the key auto-extracted from the homepage's
 *   portal script tag (data-key="...").
 * - Skips (with a clear message) when the instance is unreachable so CI
 *   without a running Ghost stays green.
 * - Writes rendered + live HTML to test/integration/__output__/ (gitignored)
 *   for human diffing, and logs a structural comparison summary.
 *
 * Byte parity is slice 2 — these assertions target structure, not whitespace.
 * Observed deltas are documented in docs/deltas.md.
 */
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, mkdirSync, writeFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {describe, it} from 'vitest';
import {createRenderer, type ThemeRenderer} from '../../src/index.ts';

const GHOST_URL = (process.env.GHOST_URL ?? 'http://localhost:2368').replace(/\/$/, '');
const CASPER_PATH = join(import.meta.dirname, '../../../../ghost/core/content/themes/casper');
const OUTPUT_DIR = join(import.meta.dirname, '__output__');

// ---- availability probe (top-level await; drives describe.skipIf) ----
let liveHomeHtml = '';
let contentApiKey = process.env.GHOST_CONTENT_API_KEY ?? '';
let unavailableReason = '';

try {
    const response = await fetch(`${GHOST_URL}/`, {signal: AbortSignal.timeout(3000)});
    if (response.ok) {
        liveHomeHtml = await response.text();
        if (!contentApiKey) {
            contentApiKey = liveHomeHtml.match(/data-key="([a-f0-9]+)"/)?.[1] ?? '';
        }
        if (!contentApiKey) {
            unavailableReason = `no Content API key: set GHOST_CONTENT_API_KEY (could not extract data-key from ${GHOST_URL})`;
        }
    } else {
        unavailableReason = `GET ${GHOST_URL}/ responded ${response.status}`;
    }
} catch (err: any) {
    unavailableReason = `Ghost dev instance unreachable at ${GHOST_URL} (${err?.cause?.code ?? err?.message}) — start it (ghost/core: pnpm dev) or set GHOST_URL`;
}

function loadCasperTheme(): Record<string, string> {
    const files: Record<string, string> = {};
    const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
            if (name === 'node_modules' || name === 'assets' || name.startsWith('.')) {
                continue;
            }
            const full = join(dir, name);
            if (statSync(full).isDirectory()) {
                walk(full);
            } else if (/\.(hbs|json)$/.test(name)) {
                files[relative(CASPER_PATH, full)] = readFileSync(full, 'utf8');
            }
        }
    };
    walk(CASPER_PATH);
    return files;
}

// ---- comparison helpers ----
const extract = {
    title: (html: string) => html.match(/<title>([^<]*)<\/title>/)?.[1],
    canonical: (html: string) => html.match(/<link rel="canonical" href="([^"]+)"/)?.[1],
    generator: (html: string) => html.match(/<meta name="generator" content="([^"]+)"/)?.[1],
    ogTitle: (html: string) => html.match(/<meta property="og:title" content="([^"]+)"/)?.[1],
    postCardCount: (html: string) => (html.match(/<article class="post-card/g) ?? []).length,
    count: (html: string, tag: string) => (html.match(new RegExp(`<${tag}[\\s>]`, 'g')) ?? []).length
};

function structuralSummary(route: string, rendered: string, live: string): string {
    const lines = [`--- structural comparison: ${route} ---`];
    for (const tag of ['script', 'link', 'meta', 'style', 'article', 'nav', 'header', 'footer', 'img']) {
        const a = extract.count(rendered, tag);
        const b = extract.count(live, tag);
        lines.push(`  <${tag}>: rendered=${a} live=${b}${a === b ? '' : '   << DELTA'}`);
    }
    const markers = [
        ['og:image dimensions', /<meta property="og:image:width"/],
        ['x-card assets hash (live content hash)', /cards\.min\.js\?v=(?!themerender)/],
        ['analytics script', /ghost-stats\.min\.js|\/\.ghost\/analytics/],
        ['comment counts', /comment-counts\.min\.js/],
        ['member attribution', /member-attribution\.min\.js/],
        ['custom fonts css', /fonts\.bunny\.net|@font-face/],
        ['announcement bar', /announcement-bar/]
    ] as const;
    for (const [name, pattern] of markers) {
        const a = pattern.test(rendered);
        const b = pattern.test(live);
        lines.push(`  ${name}: rendered=${a} live=${b}${a === b ? '' : '   << DELTA'}`);
    }
    return lines.join('\n');
}

function writeOutput(name: string, rendered: string, live: string): void {
    mkdirSync(OUTPUT_DIR, {recursive: true});
    writeFileSync(join(OUTPUT_DIR, `${name}.rendered.html`), rendered);
    writeFileSync(join(OUTPUT_DIR, `${name}.live.html`), live);
}

let rendererPromise: Promise<ThemeRenderer> | null = null;
function getRenderer(): Promise<ThemeRenderer> {
    rendererPromise ??= createRenderer({
        siteUrl: `${GHOST_URL}/`,
        contentApiKey,
        theme: loadCasperTheme()
    });
    return rendererPromise;
}

describe.skipIf(Boolean(unavailableReason))(`live render (${unavailableReason || GHOST_URL})`, function () {
    it('renders the home route matching the live instance structurally', async function () {
        const renderer = await getRenderer();
        const response = await renderer.render(new Request(`${GHOST_URL}/`));

        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type')!, /text\/html/);
        const html = await response.text();

        writeOutput('home', html, liveHomeHtml);
        // eslint-disable-next-line no-console
        console.log(structuralSummary('/', html, liveHomeHtml));

        // async helpers fully resolved
        assert.doesNotMatch(html, /__aSyNcId__/);

        // <title> matches live
        assert.equal(extract.title(html), extract.title(liveHomeHtml));

        // Casper structural markers
        assert.match(html, /<header id="gh-head"|class="gh-head|site-header/);
        assert.equal(extract.postCardCount(html), extract.postCardCount(liveHomeHtml), 'post-card count should match live');

        // ghost_head essentials
        assert.equal(extract.canonical(html), extract.canonical(liveHomeHtml), 'canonical should match live');
        assert.equal(extract.generator(html), extract.generator(liveHomeHtml), 'generator meta should match live');
        assert.equal(extract.ogTitle(html), extract.ogTitle(liveHomeHtml), 'og:title should match live');
    });

    it('renders a post route matching the live instance structurally', async function () {
        // discover a post slug via the Content API first
        const postsResponse = await fetch(`${GHOST_URL}/ghost/api/content/posts/?key=${contentApiKey}&limit=1&fields=slug,title,url`);
        const {posts} = await postsResponse.json() as any;
        assert.ok(posts?.length, 'dev instance has at least one post');
        const {slug, title, url} = posts[0];

        const liveResponse = await fetch(url);
        const livePostHtml = await liveResponse.text();

        const renderer = await getRenderer();
        const response = await renderer.render(new Request(url));

        assert.equal(response.status, 200);
        const html = await response.text();

        writeOutput(`post-${slug}`, html, livePostHtml);
        // eslint-disable-next-line no-console
        console.log(structuralSummary(`/${slug}/`, html, livePostHtml));

        assert.doesNotMatch(html, /__aSyNcId__/);

        // title/canonical/content presence vs live
        assert.equal(extract.title(html), extract.title(livePostHtml));
        assert.equal(extract.canonical(html), url);
        assert.equal(extract.canonical(livePostHtml), url);
        assert.match(html, /<article class="article/); // Casper post article wrapper
        assert.ok(html.includes(`gh-content`), 'post content section present');
        // the post title is rendered in the body
        const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        assert.match(html, new RegExp(`<h1[^>]*>\\s*${escapedTitle}`));
        // og article metadata
        assert.match(html, /<meta property="og:type" content="article">/);
    });

    it('404s an unknown route like the live instance', async function () {
        const renderer = await getRenderer();
        const response = await renderer.render(new Request(`${GHOST_URL}/definitely-not-a-real-slug-xyz/`));
        assert.equal(response.status, 404);

        const liveResponse = await fetch(`${GHOST_URL}/definitely-not-a-real-slug-xyz/`);
        assert.equal(liveResponse.status, 404);
    });
});
