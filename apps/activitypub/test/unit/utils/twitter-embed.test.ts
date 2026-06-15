/**
 * @vitest-environment jsdom
 */

import {TWITTER_EMBED_MAX_HEIGHT, TWITTER_EMBED_MIN_HEIGHT, TWITTER_EMBED_RESIZE_MESSAGE, TWITTER_EMBED_STYLE_MESSAGE, getTwitterEmbedBridgeScript, getTwitterEmbedOptions, getTwitterEmbedStyleMessage, hasTwitterEmbed, isTwitterWidgetScript, renderTwitterEmbedInSandbox, renderTwitterEmbedsInArticle} from '../../../src/utils/twitter-embed';

function renderHtml(html: string) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div;
}

describe('Twitter embed utilities', function () {
    describe('hasTwitterEmbed', function () {
        it('detects real Twitter blockquote embeds only', function () {
            expect(hasTwitterEmbed('<p>No embed here.</p>')).toBe(false);
            expect(hasTwitterEmbed('<p>This text mentions twitter-tweet but is not an embed.</p>')).toBe(false);
            expect(hasTwitterEmbed('<blockquote class="twitter-tweet"><a href="https://twitter.com/ghost/status/1">March 20, 2025</a></blockquote>')).toBe(true);
        });
    });

    describe('renderTwitterEmbedsInArticle', function () {
        it('returns content unchanged and does not build options without a Twitter embed', function () {
            const html = '<p>No embed here.</p><script src="https://example.com/rich-card.js"></script>';
            let optionsCalls = 0;

            expect(renderTwitterEmbedsInArticle(html, () => {
                optionsCalls += 1;
                return {};
            })).toEqual({
                hasTwitterEmbeds: false,
                html
            });
            expect(optionsCalls).toBe(0);
        });

        it('replaces Twitter blockquotes and only removes Twitter widget scripts', function () {
            let optionsCalls = 0;

            const result = renderTwitterEmbedsInArticle(`
                <p>Before the Twitter embed.</p>
                <blockquote class="twitter-tweet">
                    <a href="https://twitter.com/ghost/status/1">March 20, 2025</a>
                </blockquote>
                <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
                <script src="https://example.com/rich-card.js"></script>
                <p>After the Twitter embed.</p>
            `, () => {
                optionsCalls += 1;
                return {
                    fontSize: '2rem',
                    fontStyle: 'serif',
                    sepia: true
                };
            });
            const div = renderHtml(result.html);
            const iframe = div.querySelector('iframe[data-gh-twitter-embed]');

            expect(result.hasTwitterEmbeds).toBe(true);
            expect(optionsCalls).toBe(1);
            expect(iframe).not.toBeNull();
            expect(div.querySelector('blockquote.twitter-tweet')).toBeNull();
            expect(div.querySelector('script[src="https://platform.twitter.com/widgets.js"]')).toBeNull();
            expect(div.querySelector('script[src="https://example.com/rich-card.js"]')).not.toBeNull();
            expect(div.textContent).toContain('Before the Twitter embed.');
            expect(div.textContent).toContain('After the Twitter embed.');
        });
    });

    describe('renderTwitterEmbedInSandbox', function () {
        it('moves Twitter widget loading into a sandboxed iframe', function () {
            const iframe = renderTwitterEmbedInSandbox(`
                <blockquote class="twitter-tweet">
                    <p lang="en" dir="ltr">Ghost ActivityPub renders this embedded post without trusting remote ActivityPub scripts.</p>
                    <a href="https://twitter.com/ghost_security/status/1234567890123456789">March 20, 2025</a>
                </blockquote>
            `, {
                fontSize: '2rem',
                fontStyle: 'serif',
                sepia: true
            });

            expect(iframe).not.toBeNull();
            expect(iframe.getAttribute('sandbox')).toContain('allow-scripts');
            expect(iframe.getAttribute('sandbox')).toContain('allow-popups');
            expect(iframe.getAttribute('sandbox')).not.toContain('allow-same-origin');
            expect(iframe.style.maxWidth).toBe('');
            expect(iframe.style.margin).toBe('0px');
            expect(iframe.getAttribute('srcdoc')).toContain('https://platform.twitter.com/widgets.js');
            expect(iframe.getAttribute('srcdoc')).toContain('class="twitter-tweet"');
            expect(iframe.getAttribute('srcdoc')).toContain('class="has-serif-body"');
            expect(iframe.getAttribute('srcdoc')).toContain('--font-size: 2rem');
            expect(iframe.getAttribute('srcdoc')).toContain('--font-size-multiplier: 1.1');
            expect(iframe.getAttribute('srcdoc')).toContain('--twitter-link-color: #DD6B02');
            expect(iframe.getAttribute('srcdoc')).toContain('color: var(--twitter-link-color) !important');
            expect(iframe.getAttribute('srcdoc')).toContain(TWITTER_EMBED_RESIZE_MESSAGE);
            expect(iframe.getAttribute('srcdoc')).toContain(TWITTER_EMBED_STYLE_MESSAGE);
            expect(iframe.getAttribute('srcdoc')).toContain(`const minHeight = ${TWITTER_EMBED_MIN_HEIGHT}`);
            expect(iframe.getAttribute('srcdoc')).toContain(`const maxHeight = ${TWITTER_EMBED_MAX_HEIGHT}`);
            expect(iframe.getAttribute('srcdoc')).toContain('Ghost ActivityPub renders this embedded post');
        });
    });

    describe('isTwitterWidgetScript', function () {
        it('matches only the Twitter widget loader script', function () {
            const div = renderHtml(`
                <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
                <script src="https://platform.twitter.com/widgets.js?cache=1"></script>
                <script src="https://example.com/widgets.js"></script>
                <script>window.__xss=true</script>
            `);

            const scripts = div.querySelectorAll('script');

            expect(isTwitterWidgetScript(scripts[0])).toBe(true);
            expect(isTwitterWidgetScript(scripts[1])).toBe(true);
            expect(isTwitterWidgetScript(scripts[2])).toBe(false);
            expect(isTwitterWidgetScript(scripts[3])).toBe(false);
        });
    });

    it('builds the style message used to update sandboxed fallback rendering', function () {
        const options = getTwitterEmbedOptions({
            backgroundColor: 'SEPIA',
            darkMode: true,
            fontSize: '2rem',
            fontStyle: 'serif'
        });

        expect(options).toEqual({
            darkMode: true,
            fontSize: '2rem',
            fontStyle: 'serif',
            sepia: true
        });
        expect(getTwitterEmbedStyleMessage({
            darkMode: true,
            fontSize: '2rem',
            fontStyle: 'serif',
            sepia: true
        })).toEqual({
            type: TWITTER_EMBED_STYLE_MESSAGE,
            style: {
                bodyClass: 'has-serif-body',
                fontSize: '2rem',
                fontSizeMultiplier: '1.1',
                linkColor: '#DD6B02',
                secondaryTextColor: 'rgb(255 255 255 / 0.64)',
                textColor: '#fff'
            }
        });
    });

    it('builds the parent iframe bridge script for resize and style messages', function () {
        const script = getTwitterEmbedBridgeScript();

        expect(script).toContain(TWITTER_EMBED_RESIZE_MESSAGE);
        expect(script).toContain(TWITTER_EMBED_STYLE_MESSAGE);
        expect(script).toContain(`Math.max(height, ${TWITTER_EMBED_MIN_HEIGHT})`);
        expect(script).toContain(TWITTER_EMBED_MAX_HEIGHT.toString());
        expect(script).toContain('iframe[data-gh-twitter-embed]');
    });
});
