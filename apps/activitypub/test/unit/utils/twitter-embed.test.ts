/**
 * @vitest-environment jsdom
 */

import {TWITTER_EMBED_MAX_HEIGHT, TWITTER_EMBED_MIN_HEIGHT, TWITTER_EMBED_STYLE_MESSAGE, getTwitterEmbedBridgeScript, getTwitterEmbedOptions, getTwitterEmbedStyleMessage, hasTwitterEmbed, isTwitterWidgetScript, renderTwitterEmbedInSandbox, renderTwitterEmbedsInArticle, resizeTwitterEmbedFromMessage} from '../../../src/utils/twitter-embed';

function renderHtml(html: string) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div;
}

function renderArticleIframeWithTwitterEmbed(tweetId = '1234567890') {
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
            src="https://platform.twitter.com/embed/Tweet.html?dnt=true&id=${tweetId}&theme=light">
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
                <script async src="https://platform.x.com/widgets.js" charset="utf-8"></script>
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
            const iframe = div.querySelector('iframe[data-gh-twitter-direct-embed]');

            expect(result.hasTwitterEmbeds).toBe(true);
            expect(optionsCalls).toBe(1);
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

        it('leaves unparseable Twitter blockquotes as sanitized fallback HTML', function () {
            let optionsCalls = 0;

            const result = renderTwitterEmbedsInArticle(`
                <p>Before the Twitter embed.</p>
                <blockquote class="twitter-tweet">
                    <p lang="en" dir="ltr">No status link here.</p>
                </blockquote>
                <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
                <p>After the Twitter embed.</p>
            `, () => {
                optionsCalls += 1;
                return {};
            });
            const div = renderHtml(result.html);

            expect(result.hasTwitterEmbeds).toBe(false);
            expect(optionsCalls).toBe(0);
            expect(div.querySelector('iframe')).toBeNull();
            expect(div.querySelector('blockquote.twitter-tweet')).not.toBeNull();
            expect(div.querySelector('script[src="https://platform.twitter.com/widgets.js"]')).toBeNull();
            expect(div.textContent).toContain('No status link here.');
        });
    });

    describe('renderTwitterEmbedInSandbox', function () {
        it('uses the direct Twitter embed iframe when the tweet id is available', function () {
            const iframe = renderTwitterEmbedInSandbox(`
                <blockquote class="twitter-tweet">
                    <p lang="en" dir="ltr">Ghost ActivityPub renders this embedded post without trusting remote ActivityPub scripts.</p>
                    <a href="https://twitter.com/ghost_security/status/1234567890123456789">March 20, 2025</a>
                </blockquote>
            `, {
                fontSize: '2rem',
                fontStyle: 'serif',
                darkMode: true,
                sepia: true
            });

            expect(iframe).not.toBeNull();
            expect(iframe?.getAttribute('src')).toBe('https://platform.twitter.com/embed/Tweet.html?dnt=true&id=1234567890123456789&theme=dark');
            expect(iframe?.getAttribute('srcdoc')).toBeNull();
            expect(iframe?.getAttribute('data-gh-twitter-direct-embed')).toBe('');
            expect(iframe?.getAttribute('data-tweet-id')).toBe('1234567890123456789');
            expect(iframe?.getAttribute('sandbox')).toContain('allow-scripts');
            expect(iframe?.getAttribute('sandbox')).toContain('allow-same-origin');
            expect(iframe?.getAttribute('sandbox')).toContain('allow-popups');
            expect(iframe?.getAttribute('scrolling')).toBe('auto');
            expect(iframe?.style.maxWidth).toBe('550px');
            expect(iframe?.style.height).toBe('720px');
            expect(iframe?.style.margin).toBe('0px auto');
            expect(iframe?.style.overflow).toBe('auto');
        });

        it('does not synthesize a fallback iframe when the tweet id is missing', function () {
            const iframe = renderTwitterEmbedInSandbox(`
                <blockquote class="twitter-tweet" data-tweet-media-url="https://pbs.twimg.com/media/GjDWPB1b0AAMaCe.jpg" data-tweet-media-alt="Ghost spam filter settings screenshot">
                    <p lang="en" dir="ltr">Ghost ActivityPub renders this embedded post without trusting remote ActivityPub scripts.</p>
                    <p><a href="https://t.co/XL8WObMWF4">pic.twitter.com/XL8WObMWF4</a></p>
                </blockquote>
            `, {
                fontSize: '2rem',
                fontStyle: 'serif',
                sepia: true
            });

            expect(iframe).toBeNull();
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

    it('builds the style message used to update direct embed theme', function () {
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
                darkMode: true,
                fontSize: '2rem',
                fontStyle: 'serif',
                sepia: true
            }
        });
    });

    it('builds the parent iframe bridge script for direct embed resize and theme messages', function () {
        const script = getTwitterEmbedBridgeScript();

        expect(script).toContain(TWITTER_EMBED_STYLE_MESSAGE);
        expect(script).toContain(`Math.max(height, ${TWITTER_EMBED_MIN_HEIGHT})`);
        expect(script).toContain(TWITTER_EMBED_MAX_HEIGHT.toString());
        expect(script).toContain('iframe[data-gh-twitter-direct-embed]');
        expect(script).toContain('twttr.private.resize');
        expect(script).toContain('frame.contentWindow === event.source');
        expect(script).toContain("String(tweetId)");
        expect(script).toContain("url.searchParams.set('theme', theme)");
    });

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
