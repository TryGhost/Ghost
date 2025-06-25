const assert = require('assert/strict');
const {callRenderer, html, assertPrettifiesTo} = require('../test-utils');

describe('services/koenig/node-renderers/bookmark-renderer', function () {
    // NOTE: Bookmark cards serialize everything other than the url in a metadata object.
    // But we're not testing with real node instances so we're matching the node property behaviour.
    function getTestData(overrides = {}) {
        return {
            url: 'https://www.ghost.org/',
            icon: 'https://www.ghost.org/favicon.ico',
            title: 'Ghost: The Creator Economy Platform',
            description: 'doing kewl stuff',
            author: 'ghost',
            publisher: 'Ghost - The Professional Publishing Platform',
            thumbnail: 'https://ghost.org/images/meta/ghost.png',
            caption: 'caption here',
            ...overrides
        };
    }

    function renderForWeb(data, options) {
        return callRenderer('bookmark', data, options);
    }

    function renderForEmail(data, options) {
        return callRenderer('bookmark', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <figure class="kg-card kg-bookmark-card kg-card-hascaption">
                    <a class="kg-bookmark-container" href="https://www.ghost.org/">
                        <div class="kg-bookmark-content">
                            <div class="kg-bookmark-title">Ghost: The Creator Economy Platform</div>
                            <div class="kg-bookmark-description">doing kewl stuff</div>
                            <div class="kg-bookmark-metadata">
                                <img class="kg-bookmark-icon" src="https://www.ghost.org/favicon.ico" alt="">
                                <span class="kg-bookmark-author">Ghost - The Professional Publishing Platform</span>
                                <span class="kg-bookmark-publisher">ghost</span>
                            </div>
                        </div>
                        <div class="kg-bookmark-thumbnail">
                            <img src="https://ghost.org/images/meta/ghost.png" alt="" onerror="this.style.display = 'none'">
                        </div>
                    </a>
                    <figcaption>caption here</figcaption>
                </figure>
            `);
        });

        it('renders nothing with a missing url', function () {
            const result = renderForWeb(getTestData({url: ''}));
            assert.equal(result.html, '');
        });

        it('escapes HTML for text fields', function () {
            const result = renderForWeb(getTestData({
                url: 'https://www.fake.org/',
                icon: 'https://www.fake.org/favicon.ico',
                title: 'Ghost: Independent technology <script>alert("XSS")</script> for modern publishing.',
                description: 'doing "kewl" stuff',
                author: 'fa\'ker',
                publisher: 'Fake <script>alert("XSS")</script>',
                thumbnail: 'https://fake.org/image.png',
                caption: '<p dir="ltr"><span style="white-space: pre-wrap;">This is a </span><b><strong style="white-space: pre-wrap;">caption</strong></b></p>'
            }));

            // Check that text fields are escaped
            assert.ok(result.html.includes('Ghost: Independent technology &lt;script&gt;alert("XSS")&lt;/script&gt; for modern publishing.'));
            assert.ok(result.html.includes('doing "kewl" stuff'));
            assert.ok(result.html.includes('fa\'ker'));
            assert.ok(result.html.includes('Fake &lt;script&gt;alert("XSS")&lt;/script&gt;'));

            // Check that caption is not escaped
            assert.ok(result.html.includes('<p dir="ltr"><span style="white-space: pre-wrap;">This is a </span><b><strong style="white-space: pre-wrap;">caption</strong></b></p>'));
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <div>
                    <!--[if !mso !vml]-->
                    <figure class="kg-card kg-bookmark-card kg-card-hascaption">
                        <a class="kg-bookmark-container" href="https://www.ghost.org/">
                            <div class="kg-bookmark-content">
                                <div class="kg-bookmark-title">Ghost: The Creator Economy Platform</div>
                                <div class="kg-bookmark-description">doing kewl stuff</div>
                                <div class="kg-bookmark-metadata">
                                    <img class="kg-bookmark-icon" src="https://www.ghost.org/favicon.ico" alt="">
                                    <span class="kg-bookmark-author" src="Ghost - The Professional Publishing Platform">Ghost - The Professional Publishing Platform</span>
                                    <span class="kg-bookmark-publisher" src="ghost">ghost</span>
                                </div>
                            </div>
                            <div class="kg-bookmark-thumbnail" style="background-image: url('https://ghost.org/images/meta/ghost.png')">
                                <img src="https://ghost.org/images/meta/ghost.png" alt="" onerror="this.style.display='none'">
                            </div>
                        </a>
                        <figcaption>caption here</figcaption>
                    </figure>
                    <!--[endif]--><!--[if vml]>
                    <table class="kg-card kg-bookmark-card--outlook" style="margin: 0; padding: 0; width: 100%; border: 1px solid #e5eff5; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; border-collapse: collapse; border-spacing: 0;" width="100%">
                        <tr>
                            <td width="100%" style="padding: 20px">
                                <table style="margin: 0; padding: 0; border-collapse: collapse; border-spacing: 0;">
                                    <tr>
                                        <td class="kg-bookmark-title--outlook">
                                            <a href="https://www.ghost.org/" style="text-decoration: none; color: #15212a; font-size: 15px; line-height: 1.5em; font-weight: 600;">
                                                Ghost: The Creator Economy Platform
                                            </a>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <div class="kg-bookmark-description--outlook">
                                                <a href="https://www.ghost.org/" style="text-decoration: none; margin-top: 12px; color: #738a94; font-size: 13px; line-height: 1.5em; font-weight: 400;">
                                                    doing kewl stuff
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="kg-bookmark-metadata--outlook" style="padding-top: 14px; color: #15212a; font-size: 13px; font-weight: 400; line-height: 1.5em;">
                                            <table style="margin: 0; padding: 0; border-collapse: collapse; border-spacing: 0;">
                                                <tr>
                                                    <td valign="middle" class="kg-bookmark-icon--outlook" style="padding-right: 8px; font-size: 0; line-height: 1.5em;">
                                                        <a href="https://www.ghost.org/" style="text-decoration: none; color: #15212a">
                                                            <img src="https://www.ghost.org/favicon.ico" width="22" height="22" alt=" ">
                                                        </a>
                                                    </td>

                                                    <td valign="middle" class="kg-bookmark-byline--outlook">
                                                        <a href="https://www.ghost.org/" style="text-decoration: none; color: #15212a">
                                                            Ghost - The Professional Publishing Platform &nbsp;&#x2022;&nbsp; ghost
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                    <div class="kg-bookmark-spacer--outlook" style="height: 1.5em">&nbsp;</div>
                    <![endif]-->
                </div>
            `);
        });

        it('renders nothing with a missing url', function () {
            const result = renderForEmail(getTestData({url: ''}));
            assert.equal(result.html, '');
        });

        it('escapes HTML for text fields', function () {
            const result = renderForEmail(getTestData({
                url: 'https://www.fake.org/',
                icon: 'https://www.fake.org/favicon.ico',
                title: 'Ghost: Independent technology <script>alert("XSS")</script> for modern publishing.',
                description: 'doing "kewl" stuff',
                author: 'fa\'ker',
                publisher: 'Fake <script>alert("XSS")</script>',
                thumbnail: 'https://fake.org/image.png',
                caption: '<p dir="ltr"><span style="white-space: pre-wrap;">This is a </span><b><strong style="white-space: pre-wrap;">caption</strong></b></p>'
            }));

            // Check that text fields are escaped
            assert.ok(result.html.includes('Ghost: Independent technology &lt;script&gt;alert("XSS")&lt;/script&gt; for modern publishing.'));
            assert.ok(result.html.includes('doing &amp;quot;kewl&amp;quot; stuff'));
            assert.ok(result.html.includes('fa\'ker'));
            assert.ok(result.html.includes('Fake &lt;script&gt;alert("XSS")&lt;/script&gt;'));

            // Check that caption is not escaped
            assert.ok(result.html.includes('<p dir="ltr"><span style="white-space: pre-wrap;">This is a </span><b><strong style="white-space: pre-wrap;">caption</strong></b></p>'));
        });
    });
});
