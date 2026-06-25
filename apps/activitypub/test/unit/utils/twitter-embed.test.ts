/**
 * @vitest-environment jsdom
 */

import {applyTwitterEmbedTheme, isTwitterWidgetScript, renderTwitterEmbedsInArticle, resizeTwitterEmbedFromMessage} from '../../../src/utils/twitter-embed';

function renderHtml(html: string) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div;
}

function renderArticleIframeWithTwitterEmbed(tweetId = '1234567890', theme = 'light') {
    const articleIframe = document.createElement('iframe');
    document.body.appendChild(articleIframe);

    const articleDocument = articleIframe.contentDocument;
    if (!articleDocument) {
        throw new Error('Expected article iframe document to exist');
    }

    articleDocument.body.innerHTML = `
        <iframe
            data-gh-twitter-direct-embed
            data-tweet-id="${tweetId}"
            src="https://platform.twitter.com/embed/Tweet.html?dnt=true&id=${tweetId}&theme=${theme}">
        </iframe>
    `;

    const twitterIframe = articleDocument.querySelector<HTMLIFrameElement>('iframe[data-gh-twitter-direct-embed]');
    if (!twitterIframe) {
        throw new Error('Expected Twitter iframe to exist');
    }

    return {
        articleIframe,
        twitterIframe
    };
}

describe('Twitter embed utilities', function () {
    describe('renderTwitterEmbedsInArticle', function () {
        it('returns content unchanged when there is no Twitter embed', function () {
            const noEmbed = '<p>No embed here.</p><script src="https://example.com/rich-card.js"></script>';
            expect(renderTwitterEmbedsInArticle(noEmbed, false)).toEqual({
                hasTwitterEmbeds: false,
                html: noEmbed
            });

            // The cheap string guard should not misfire on incidental "twitter-tweet" text.
            const mention = '<p>This text mentions twitter-tweet but is not an embed.</p>';
            expect(renderTwitterEmbedsInArticle(mention, false)).toEqual({
                hasTwitterEmbeds: false,
                html: mention
            });
        });

        it('replaces Twitter blockquotes and only removes Twitter widget scripts', function () {
            const result = renderTwitterEmbedsInArticle(`
                <p>Before the Twitter embed.</p>
                <blockquote class="twitter-tweet">
                    <a href="https://twitter.com/ghost/status/1">March 20, 2025</a>
                </blockquote>
                <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
                <script async src="https://platform.x.com/widgets.js" charset="utf-8"></script>
                <script src="https://example.com/rich-card.js"></script>
                <p>After the Twitter embed.</p>
            `, false);
            const div = renderHtml(result.html);
            const iframe = div.querySelector('iframe[data-gh-twitter-direct-embed]');

            expect(result.hasTwitterEmbeds).toBe(true);
            expect(iframe).not.toBeNull();
            expect(iframe?.getAttribute('src')).toContain('https://platform.twitter.com/embed/Tweet.html');
            expect(iframe?.getAttribute('src')).toContain('id=1');
            expect(div.querySelector('blockquote.twitter-tweet')).toBeNull();
            expect(div.querySelector('script[src="https://platform.twitter.com/widgets.js"]')).toBeNull();
            expect(div.querySelector('script[src="https://platform.x.com/widgets.js"]')).toBeNull();
            expect(div.querySelector('script[src="https://example.com/rich-card.js"]')).not.toBeNull();
            expect(div.textContent).toContain('Before the Twitter embed.');
            expect(div.textContent).toContain('After the Twitter embed.');
        });

        it('builds a sandboxed direct embed iframe with the reader theme', function () {
            const result = renderTwitterEmbedsInArticle(`
                <blockquote class="twitter-tweet">
                    <p lang="en" dir="ltr">Ghost ActivityPub renders this embedded post without trusting remote ActivityPub scripts.</p>
                    <a href="https://twitter.com/ghost_security/status/1234567890123456789">March 20, 2025</a>
                </blockquote>
            `, true);
            const iframe = renderHtml(result.html).querySelector('iframe[data-gh-twitter-direct-embed]');

            expect(iframe).not.toBeNull();
            expect(iframe?.getAttribute('src')).toBe('https://platform.twitter.com/embed/Tweet.html?dnt=true&id=1234567890123456789&theme=dark');
            expect(iframe?.getAttribute('srcdoc')).toBeNull();
            expect(iframe?.getAttribute('data-tweet-id')).toBe('1234567890123456789');
            expect(iframe?.getAttribute('sandbox')).toContain('allow-scripts');
            expect(iframe?.getAttribute('sandbox')).toContain('allow-same-origin');
            expect(iframe?.getAttribute('sandbox')).toContain('allow-popups');
            expect(iframe?.getAttribute('scrolling')).toBe('auto');
            expect((iframe as HTMLIFrameElement | null)?.style.maxWidth).toBe('550px');
            expect((iframe as HTMLIFrameElement | null)?.style.height).toBe('720px');
            expect((iframe as HTMLIFrameElement | null)?.style.overflow).toBe('auto');
        });

        it('leaves unparseable Twitter blockquotes as sanitized fallback HTML', function () {
            const result = renderTwitterEmbedsInArticle(`
                <p>Before the Twitter embed.</p>
                <blockquote class="twitter-tweet">
                    <p lang="en" dir="ltr">No status link here.</p>
                </blockquote>
                <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
                <p>After the Twitter embed.</p>
            `, false);
            const div = renderHtml(result.html);

            expect(result.hasTwitterEmbeds).toBe(false);
            expect(div.querySelector('iframe')).toBeNull();
            expect(div.querySelector('blockquote.twitter-tweet')).not.toBeNull();
            expect(div.querySelector('script[src="https://platform.twitter.com/widgets.js"]')).toBeNull();
            expect(div.textContent).toContain('No status link here.');
        });
    });

    describe('isTwitterWidgetScript', function () {
        it('matches only the Twitter widget loader script', function () {
            const div = renderHtml(`
                <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
                <script src="https://platform.twitter.com/widgets.js?cache=1"></script>
                <script async src="https://platform.x.com/widgets.js" charset="utf-8"></script>
                <script src="https://example.com/widgets.js"></script>
                <script>window.__xss=true</script>
            `);

            const scripts = div.querySelectorAll('script');

            expect(isTwitterWidgetScript(scripts[0])).toBe(true);
            expect(isTwitterWidgetScript(scripts[1])).toBe(true);
            expect(isTwitterWidgetScript(scripts[2])).toBe(true);
            expect(isTwitterWidgetScript(scripts[3])).toBe(false);
            expect(isTwitterWidgetScript(scripts[4])).toBe(false);
        });
    });

    describe('applyTwitterEmbedTheme', function () {
        it('reloads the embed with the matching theme and resets its height', function () {
            const {articleIframe, twitterIframe} = renderArticleIframeWithTwitterEmbed('1234567890', 'light');
            twitterIframe.style.height = '480px';

            applyTwitterEmbedTheme(articleIframe, true);

            expect(twitterIframe.getAttribute('src')).toContain('theme=dark');
            expect(twitterIframe.style.height).toBe('720px');

            articleIframe.remove();
        });

        it('does not reload the embed when the theme already matches', function () {
            const {articleIframe, twitterIframe} = renderArticleIframeWithTwitterEmbed('1234567890', 'light');
            const originalSrc = twitterIframe.getAttribute('src');

            applyTwitterEmbedTheme(articleIframe, false);

            expect(twitterIframe.getAttribute('src')).toBe(originalSrc);

            articleIframe.remove();
        });
    });

    describe('resizeTwitterEmbedFromMessage', function () {
        it('resizes a direct embed from the message source frame', function () {
            const {articleIframe, twitterIframe} = renderArticleIframeWithTwitterEmbed();

            const event = new MessageEvent('message', {
                data: {
                    twttr: {
                        embed: {
                            method: 'twttr.private.resize',
                            params: [{
                                height: 689
                            }]
                        }
                    }
                },
                origin: 'null',
                source: twitterIframe.contentWindow
            });

            expect(resizeTwitterEmbedFromMessage(articleIframe, event)).toBe(true);
            expect(twitterIframe.style.height).toBe('689px');

            articleIframe.remove();
        });

        it('resizes a direct embed when Twitter sends a numeric tweet id', function () {
            const {articleIframe, twitterIframe} = renderArticleIframeWithTwitterEmbed('1234567890');

            const event = new MessageEvent('message', {
                data: {
                    twttr: {
                        embed: {
                            method: 'twttr.private.resize',
                            params: [{
                                data: {
                                    tweet_id: 1234567890
                                },
                                height: 720
                            }]
                        }
                    }
                },
                origin: 'https://platform.twitter.com',
                source: null
            });

            expect(resizeTwitterEmbedFromMessage(articleIframe, event)).toBe(true);
            expect(twitterIframe.style.height).toBe('720px');

            articleIframe.remove();
        });
    });
});
