/**
 * @vitest-environment jsdom
 */

import {enforceVideoCardInlinePlayback, sanitizeHtml, stripHtml} from '../../../src/utils/content-formatters';

function sanitizeStrippedHtml(html: string, exclude: string[] = ['a']) {
    return sanitizeHtml(stripHtml(html, exclude));
}

function renderHtml(html: string) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div;
}

describe('Content Formatters', function () {
    describe('enforceVideoCardInlinePlayback', function () {
        it('keeps autoplay video cards autoplaying and inline-playable', function () {
            const result = enforceVideoCardInlinePlayback(`
                <figure class="kg-card kg-video-card">
                    <div class="kg-video-container">
                        <video src="/video.mp4" autoplay loop playsinline></video>
                        <div class="kg-video-player-container kg-video-hide"></div>
                    </div>
                </figure>
            `);

            const div = document.createElement('div');
            div.innerHTML = result;

            const video = div.querySelector('video') as HTMLVideoElement;
            const playerContainer = div.querySelector('.kg-video-player-container');

            expect(video.hasAttribute('autoplay')).toBe(true);
            expect(video.hasAttribute('loop')).toBe(true);
            expect(video.autoplay).toBe(true);
            expect(video.loop).toBe(true);
            expect(video.hasAttribute('muted')).toBe(true);
            expect(video.hasAttribute('playsinline')).toBe(true);
            expect(video.hasAttribute('webkit-playsinline')).toBe(true);
            expect(video.hasAttribute('x5-playsinline')).toBe(true);
            expect(playerContainer?.classList.contains('kg-video-hide')).toBe(true);
        });

        it('adds inline playback attributes to non-autoplay video cards', function () {
            const result = enforceVideoCardInlinePlayback(`
                <figure class="kg-card kg-video-card">
                    <div class="kg-video-container">
                        <video src="/video.mp4" loop muted></video>
                        <div class="kg-video-player-container kg-video-hide"></div>
                    </div>
                </figure>
            `);

            const div = document.createElement('div');
            div.innerHTML = result;

            const video = div.querySelector('video') as HTMLVideoElement;
            const playerContainer = div.querySelector('.kg-video-player-container');

            expect(video.hasAttribute('autoplay')).toBe(false);
            expect(video.hasAttribute('loop')).toBe(true);
            expect(video.hasAttribute('playsinline')).toBe(true);
            expect(video.hasAttribute('webkit-playsinline')).toBe(true);
            expect(video.hasAttribute('x5-playsinline')).toBe(true);
            expect(playerContainer?.classList.contains('kg-video-hide')).toBe(true);
        });
    });

    describe('sanitizeHtml(stripHtml(...))', function () {
        it('preserves safe links and profile navigation data attributes', function () {
            const result = sanitizeStrippedHtml(`
                <a href="https://example.com/path">Example</a>
                <a href="https://example.com/path?query=value#section">Query hash</a>
                <a href="http://example.com">HTTP</a>
                <a href="mailto:test@example.com">Email</a>
                <a href="https://example.com/@alice" data-profile="@alice@example.com">Alice</a>
            `);

            const div = renderHtml(result);
            const links = div.querySelectorAll('a');

            expect(links).toHaveLength(5);
            expect(links[0].getAttribute('href')).toBe('https://example.com/path');
            expect(links[1].getAttribute('href')).toBe('https://example.com/path?query=value#section');
            expect(links[2].getAttribute('href')).toBe('http://example.com');
            expect(links[3].getAttribute('href')).toBe('mailto:test@example.com');
            expect(links[4].getAttribute('href')).toBe('https://example.com/@alice');
            expect(links[4].getAttribute('data-profile')).toBe('@alice@example.com');
        });

        it('removes unsafe event handler attributes from links', function () {
            const result = sanitizeStrippedHtml(`
                <a
                    href="https://example.com"
                    onclick="window.__xss=true"
                    onfocus="window.__xss=true"
                    onpointerenter="window.__xss=true"
                    onmouseover="window.__xss=true"
                >Example</a>
            `);

            const link = renderHtml(result).querySelector('a') as HTMLAnchorElement;

            expect(link).not.toBeNull();
            expect(link.hasAttribute('onclick')).toBe(false);
            expect(link.hasAttribute('onfocus')).toBe(false);
            expect(link.hasAttribute('onpointerenter')).toBe(false);
            expect(link.hasAttribute('onmouseover')).toBe(false);
        });

        it('removes unsafe link href protocols', function () {
            const result = sanitizeStrippedHtml(`
                <a href="javascript:alert(1)">JavaScript</a>
                <a href="JaVaScRiPt:alert(1)">Mixed case JavaScript</a>
                <a href="data:text/html,<script>alert(1)</script>">Data</a>
                <a href="vbscript:msgbox(1)">VBScript</a>
                <a href="jav&#x61;script:alert(1)">Encoded JavaScript</a>
            `);

            const links = renderHtml(result).querySelectorAll('a');

            expect(links).toHaveLength(5);
            links.forEach((link) => {
                expect(link.getAttribute('href')).toBeNull();
            });
        });

        it('strips unsupported tags while keeping anchor text readable', function () {
            const result = sanitizeStrippedHtml(`
                <p>Hello <strong>bold</strong> <a href="https://example.com">safe link</a></p>
                <script>window.__xss=true</script>
                <img src="https://example.com/image.png" alt="Image">
                <svg><circle></circle></svg>
                <iframe src="https://example.com"></iframe>
            `);

            const div = renderHtml(result);

            expect(div.querySelector('p')).toBeNull();
            expect(div.querySelector('strong')).toBeNull();
            expect(div.querySelector('script')).toBeNull();
            expect(div.querySelector('img')).toBeNull();
            expect(div.querySelector('svg')).toBeNull();
            expect(div.querySelector('iframe')).toBeNull();
            expect(div.querySelector('a')?.textContent).toBe('safe link');
            expect(div.textContent).toContain('Hello bold safe link');
        });

        it('returns plain text when stripHtml has no exclusions', function () {
            const result = sanitizeHtml(stripHtml(`
                <p>Hello <a href="https://example.com">safe link</a></p>
                <br>
                <strong>Bold</strong>
            `));

            const div = renderHtml(result);

            expect(div.querySelector('a')).toBeNull();
            expect(div.querySelector('br')).toBeNull();
            expect(div.textContent).toBe('Hello safe link Bold');
        });
    });
});
