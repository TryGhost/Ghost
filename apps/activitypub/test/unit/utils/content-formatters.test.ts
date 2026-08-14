/**
 * @vitest-environment jsdom
 */

import {enforceVideoCardInlinePlayback, sanitizeArticleContent, sanitizeHtml, stripHtml} from '../../../src/utils/content-formatters';

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

    describe('sanitizeArticleContent', function () {
        it('keeps YouTube iframe embeds intact', function () {
            const result = sanitizeArticleContent(`
                <figure class="kg-card kg-embed-card">
                    <iframe src="https://www.youtube.com/embed/abc123" width="560" height="315" frameborder="0" allowfullscreen></iframe>
                </figure>
            `);

            const iframe = renderHtml(result).querySelector('iframe') as HTMLIFrameElement;

            expect(iframe).not.toBeNull();
            expect(iframe.getAttribute('src')).toBe('https://www.youtube.com/embed/abc123');
            expect(iframe.getAttribute('width')).toBe('560');
            expect(iframe.getAttribute('height')).toBe('315');
            expect(iframe.getAttribute('frameborder')).toBe('0');
            expect(iframe.hasAttribute('allowfullscreen')).toBe(true);
        });

        it('forces a restrictive sandbox on iframes, overriding any supplied value', function () {
            const sandbox = 'allow-scripts allow-same-origin allow-popups allow-presentation allow-forms';

            const result = sanitizeArticleContent(`
                <iframe src="https://codepen.io/x/embed/abc"></iframe>
                <iframe src="https://evil.example/phish" sandbox="allow-top-navigation allow-modals allow-same-origin"></iframe>
            `);

            const iframes = renderHtml(result).querySelectorAll('iframe');

            expect(iframes).toHaveLength(2);
            iframes.forEach((iframe) => {
                // Overridden to our fixed set (attacker's allow-top-navigation is gone)
                expect(iframe.getAttribute('sandbox')).toBe(sandbox);
            });
            // Arbitrary embed hosts are kept (not host-filtered), just sandboxed
            expect(iframes[0].getAttribute('src')).toBe('https://codepen.io/x/embed/abc');
            expect(iframes[1].getAttribute('src')).toBe('https://evil.example/phish');
        });

        it('does not preserve author-supplied referrerpolicy on non-iframe elements', function () {
            const result = sanitizeArticleContent(
                '<img src="https://example.com/image.png" referrerpolicy="unsafe-url">'
            );

            const img = renderHtml(result).querySelector('img') as HTMLImageElement;

            expect(img).not.toBeNull();
            expect(img.hasAttribute('referrerpolicy')).toBe(false);
        });

        it('removes iframes with unsafe or non-http(s) sources', function () {
            const result = sanitizeArticleContent(`
                <iframe src="javascript:alert(1)"></iframe>
                <iframe src="data:text/html,<script>window.__xss=true</script>"></iframe>
                <iframe srcdoc="<script>window.__xss=true</script>" onload="window.__xss=true"></iframe>
            `);

            // None are absolute cross-origin http(s) embeds, so all are dropped
            expect(renderHtml(result).querySelectorAll('iframe')).toHaveLength(0);
        });

        it('strips event handlers and srcdoc from surviving cross-origin iframes', function () {
            const result = sanitizeArticleContent(
                '<iframe src="https://player.vimeo.com/video/1" srcdoc="<script>window.__xss=true</script>" onload="window.__xss=true"></iframe>'
            );

            const iframe = renderHtml(result).querySelector('iframe') as HTMLIFrameElement;

            expect(iframe).not.toBeNull();
            expect(iframe.hasAttribute('srcdoc')).toBe(false);
            expect(iframe.hasAttribute('onload')).toBe(false);
        });

        it('removes relative and same-origin iframes, keeping cross-origin embeds', function () {
            // A same-origin frame would run same-origin with Ghost Admin, where
            // allow-scripts + allow-same-origin can defeat the sandbox
            const result = sanitizeArticleContent(`
                <iframe src="/ghost/#/dashboard"></iframe>
                <iframe src="${window.location.origin}/ghost/"></iframe>
                <iframe src="foo.html"></iframe>
                <iframe src="https://player.vimeo.com/video/123"></iframe>
            `);

            const iframes = renderHtml(result).querySelectorAll('iframe');

            expect(iframes).toHaveLength(1);
            expect(iframes[0].getAttribute('src')).toBe('https://player.vimeo.com/video/123');
        });

        it('keeps Twitter embed scripts from allowed hostnames', function () {
            const result = sanitizeArticleContent(`
                <blockquote class="twitter-tweet"><p>A tweet</p></blockquote>
                <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
                <script async src="https://platform.x.com/widgets.js" charset="utf-8"></script>
            `);

            const div = renderHtml(result);
            const scripts = div.querySelectorAll('script');

            expect(div.querySelector('blockquote.twitter-tweet')).not.toBeNull();
            expect(scripts).toHaveLength(2);
            expect(scripts[0].getAttribute('src')).toBe('https://platform.twitter.com/widgets.js');
            expect(scripts[0].hasAttribute('async')).toBe(true);
            expect(scripts[0].getAttribute('charset')).toBe('utf-8');
            expect(scripts[1].getAttribute('src')).toBe('https://platform.x.com/widgets.js');
        });

        it('removes scripts that are not from allowed hostnames', function () {
            const result = sanitizeArticleContent(`
                <p>Content</p>
                <script src="https://evil.com/widgets.js"></script>
                <script src="https://platform.twitter.com.evil.com/widgets.js"></script>
                <script src="https://evil.com/platform.twitter.com"></script>
                <script src="http://platform.twitter.com/widgets.js"></script>
                <script src="//platform.twitter.com/widgets.js"></script>
                <script src="/widgets.js"></script>
                <script>window.__xss=true</script>
            `);

            const div = renderHtml(result);

            expect(div.querySelectorAll('script')).toHaveLength(0);
            expect(div.querySelector('p')?.textContent).toBe('Content');
        });

        it('strips inline code from scripts with an allowed src', function () {
            const result = sanitizeArticleContent(`
                <script src="https://platform.twitter.com/widgets.js">window.__xss=true</script>
            `);

            const script = renderHtml(result).querySelector('script') as HTMLScriptElement;

            expect(script).not.toBeNull();
            expect(script.textContent).toBe('');
        });

        it('removes event handler attributes and unsafe href protocols', function () {
            const result = sanitizeArticleContent(`
                <img src="https://example.com/image.png" onerror="window.__xss=true">
                <p onclick="window.__xss=true">Text</p>
                <a href="javascript:alert(1)">Link</a>
            `);

            const div = renderHtml(result);

            expect(div.querySelector('img')?.hasAttribute('onerror')).toBe(false);
            expect(div.querySelector('p')?.hasAttribute('onclick')).toBe(false);
            expect(div.querySelector('a')?.getAttribute('href')).not.toBe('javascript:alert(1)');
        });

        it('preserves target and rel attributes added by openLinksInNewTab', function () {
            const result = sanitizeArticleContent(`
                <a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a>
            `);

            const link = renderHtml(result).querySelector('a') as HTMLAnchorElement;

            expect(link.getAttribute('target')).toBe('_blank');
            expect(link.getAttribute('rel')).toBe('noopener noreferrer');
        });

        it('does not loosen the default sanitizeHtml rules', function () {
            sanitizeArticleContent('<script src="https://platform.twitter.com/widgets.js"></script>');

            const result = sanitizeHtml(`
                <script src="https://platform.twitter.com/widgets.js"></script>
                <iframe src="https://www.youtube.com/embed/abc123"></iframe>
            `);

            const div = renderHtml(result);

            expect(div.querySelector('script')).toBeNull();
            expect(div.querySelector('iframe')).toBeNull();
        });
    });
});
