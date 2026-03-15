const assert = require('node:assert/strict');
const sinon = require('sinon');
const rewire = require('rewire');
const errors = require('@tryghost/errors');

describe('MemberWelcomeEmailRenderer', function () {
    let MemberWelcomeEmailRenderer;
    let lexicalRenderStub;

    const defaultSiteSettings = {
        title: 'Test Site',
        url: 'https://example.com',
        accentColor: '#ff0000'
    };

    beforeEach(function () {
        lexicalRenderStub = sinon.stub().resolves('<p>Hello World</p>');

        MemberWelcomeEmailRenderer = rewire('../../../../../core/server/services/member-welcome-emails/member-welcome-email-renderer');
        MemberWelcomeEmailRenderer.__set__('lexicalLib', {
            render: lexicalRenderStub
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('render', function () {
        it('renders Lexical content to HTML via lexicalLib.render', async function () {
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});
            const lexicalJson = '{"root":{"children":[]}}';

            await renderer.render({
                lexical: lexicalJson,
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            sinon.assert.calledOnce(lexicalRenderStub);
            sinon.assert.calledWith(lexicalRenderStub, lexicalJson, {target: 'email'});
        });

        it('substitutes member template variables', async function () {
            lexicalRenderStub.resolves('<p>Hello {name}, or {first_name}! Contact: {email}</p>');
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John Doe', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert(result.html.includes('Hello John Doe'));
            assert(result.html.includes('or John!'));
            assert(result.html.includes('Contact: john@example.com'));
        });

        it('substitutes site template variables', async function () {
            lexicalRenderStub.resolves('<p>Welcome to {site_title} at {site_url}</p>');
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert(result.html.includes('Welcome to Test Site'));
            assert(result.html.includes('at https://example.com'));
        });

        it('inlines accentColor into link styles', async function () {
            lexicalRenderStub.resolves('<p><a href="https://example.com">Click here</a></p>');
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert(result.html.includes('color: #ff0000'));
        });

        it('substitutes template variables in subject', async function () {
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome to {site_title}, {first_name}!',
                member: {name: 'John Doe', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert.equal(result.subject, 'Welcome to Test Site, John!');
        });

        it('renders empty when member name is missing and no fallback specified', async function () {
            lexicalRenderStub.resolves('<p>Hello {name}!</p>');
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert(result.text.includes('Hello !'));
            assert(!result.html.includes('{name}'));
        });

        it('uses custom fallback when member name is missing', async function () {
            lexicalRenderStub.resolves('<p>Hello {name, "there"}</p>');
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert(result.html.includes('Hello there'));
        });

        it('uses custom fallback for first_name when missing', async function () {
            lexicalRenderStub.resolves('<p>Hey {first_name, "friend"}</p>');
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert(result.html.includes('Hey friend'));
        });

        it('ignores fallback when member name is present', async function () {
            lexicalRenderStub.resolves('<p>Hello {name, "there"}</p>');
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'Jane Smith', email: 'jane@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert(result.html.includes('Hello Jane Smith'));
        });

        it('renders empty when member email is missing', async function () {
            lexicalRenderStub.resolves('<p>Email: {email}!</p>');
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John'},
                siteSettings: defaultSiteSettings
            });

            assert(result.text.includes('Email: !'));
            assert(!result.html.includes('{email}'));
        });

        it('extracts first name correctly from full name', async function () {
            lexicalRenderStub.resolves('<p>Hi {first_name}</p>');
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John Michael Doe', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert(result.html.includes('Hi John'));
        });

        it('handles whitespace in name when extracting first_name', async function () {
            lexicalRenderStub.resolves('<p>Hi {first_name, "friend"}</p>');
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const paddedResult = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: '  Jane  Doe  ', email: 'jane@example.com'},
                siteSettings: defaultSiteSettings
            });
            assert(paddedResult.html.includes('Hi Jane'));

            const emptyResult = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: '   ', email: 'empty@example.com'},
                siteSettings: defaultSiteSettings
            });
            assert(emptyResult.html.includes('Hi friend'));
        });

        it('wraps content in wrapper.hbs template', async function () {
            lexicalRenderStub.resolves('<p>Content</p>');
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});
            const year = new Date().getFullYear();

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Test Subject',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert(result.html.includes('<!doctype html>'));
            assert(result.html.includes('<title>Test Subject</title>'));
            assert(result.html.includes('>Content</p>'));
            assert(result.html.includes('Test Site'));
            assert(result.html.includes(`&copy; ${year}`));
            assert(result.html.includes('Manage your preferences'));
            assert(result.html.includes('https://example.com/#/portal/account'));
        });

        it('resolves relative portal links to absolute URLs', async function () {
            lexicalRenderStub.resolves('<table class="kg-card kg-button-card"><tbody><tr><td><table class="btn"><tbody><tr><td align="center"><a href="#/portal/support">Support us</a></td></tr></tbody></table></td></tr></tbody></table>');
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert(result.html.includes('https://example.com/#/portal/support'));
            assert(!result.html.match(/href="[^"]*"[^>]*>[^<]*Support us/).toString().includes('href="#/portal/support"'));
        });

        it('generates plain text from HTML', async function () {
            lexicalRenderStub.resolves('<p>Hello World</p>');
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert.equal(typeof result.text, 'string');
            assert(result.text.includes('Hello World'));
        });

        it('throws IncorrectUsageError for invalid Lexical', async function () {
            lexicalRenderStub.rejects(new Error('Invalid JSON'));
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            await assert.rejects(renderer.render({
                lexical: 'invalid',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            }), errors.IncorrectUsageError);
        });

        it('includes error context in IncorrectUsageError', async function () {
            lexicalRenderStub.rejects(new Error('Parse error'));
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            await assert.rejects(
                renderer.render({
                    lexical: 'invalid',
                    subject: 'Welcome!',
                    member: {name: 'John', email: 'john@example.com'},
                    siteSettings: defaultSiteSettings
                }),
                (err) => {
                    assert(err instanceof errors.IncorrectUsageError);
                    assert.equal(err.context, 'Parse error');
                    return true;
                }
            );
        });

        it('escapes HTML in member values for body but not subject', async function () {
            lexicalRenderStub.resolves('<p>Hello {name}</p>');
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome {name}!',
                member: {name: '<script>alert("xss")</script>', email: 'test@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert(result.html.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'));
            assert(!result.html.includes('<script>alert("xss")</script>'));
            assert.equal(result.subject, 'Welcome <script>alert("xss")</script>!');
        });

        it('removes unknown tokens from output', async function () {
            lexicalRenderStub.resolves('<p>Hello {unknown_token} and {another}</p>');
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome {invalid}!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert(!result.html.includes('%%{'));
            assert(!result.html.includes('}%%'));
            assert.equal(result.subject, 'Welcome !');
        });

        it('removes code wrappers around replacement strings', async function () {
            lexicalRenderStub.resolves('<p>Hello <code>{first_name}</code></p>');
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John Doe', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert(!result.html.includes('<code>{first_name}</code>'));
            assert(result.html.includes('Hello John'));
        });

        it('preserves code blocks that are not replacement strings', async function () {
            lexicalRenderStub.resolves('<p>Here is some code: <code>if (x) { return y; }</code> and a greeting for <code>{first_name}</code></p>');
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John Doe', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            // Regular code should remain wrapped in <code>
            assert(result.html.match(/<code[^>]*>.*?if.*?return.*?<\/code>/));
            // Replacement string should have code wrapper removed and be substituted
            assert(result.html.includes('a greeting for John'));
            assert(!result.html.includes('{first_name}'));
        });

        it('removes code wrappers around replacement strings with fallback', async function () {
            lexicalRenderStub.resolves('<p>Hey <code>{first_name, "friend"}</code></p>');
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert(!result.html.includes('<code>{first_name, "friend"}</code>'));
            assert(result.html.includes('Hey friend'));
        });

        it('removes code wrappers around replacement strings with fallback (no comma)', async function () {
            lexicalRenderStub.resolves('<p>Hey <code>{first_name "friend"}</code></p>');
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert(!result.html.includes('<code>{first_name "friend"}</code>'));
            assert(result.html.includes('Hey friend'));
        });

        it('translates footer text using the t helper', async function () {
            lexicalRenderStub.resolves('<p>Content</p>');
            const renderer = new MemberWelcomeEmailRenderer({t: (key) => {
                if (key === 'Manage your preferences') {
                    return 'Gérer vos préférences';
                }
                return key;
            }});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert(result.html.includes('Gérer vos préférences'));
            assert(!result.html.includes('Manage your preferences'));
        });

        it('applies shared Koenig card styles used by newsletters', async function () {
            lexicalRenderStub.resolves(`
                <table class="kg-card kg-button-card" border="0" cellpadding="0" cellspacing="0">
                    <tbody>
                        <tr>
                            <td class="kg-card-spacing">
                                <table class="btn" border="0" cellspacing="0" cellpadding="0" align="center">
                                    <tbody>
                                        <tr>
                                            <td align="center">
                                                <a href="https://example.com">Click me</a>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div class="kg-card kg-callout-card kg-callout-card-blue">
                    <div class="kg-callout-emoji">💡</div>
                    <div class="kg-callout-text">Shared styles</div>
                </div>
            `);
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert(result.html.includes('kg-callout-card'));
            assert(result.html.includes('padding: 24px'));
            assert(result.html.includes('table class="btn"'));
            assert(result.html.includes('background-color: #ff0000'));
        });

        it('applies bookmark and YouTube embed card styles', async function () {
            lexicalRenderStub.resolves(`
                <figure class="kg-card kg-bookmark-card">
                    <a class="kg-bookmark-container" href="https://example.com">
                        <div class="kg-bookmark-content">
                            <div class="kg-bookmark-title">Example title</div>
                            <div class="kg-bookmark-description">Example description</div>
                            <div class="kg-bookmark-metadata">
                                <span class="kg-bookmark-author">Example author</span>
                            </div>
                        </div>
                        <div class="kg-bookmark-thumbnail">
                            <img src="https://example.com/thumb.jpg" alt="">
                        </div>
                    </a>
                </figure>
                <figure class="kg-card kg-embed-card kg-card-hascaption">
                    <a class="kg-video-preview" href="https://youtube.com/watch?v=abc123" aria-label="Play video">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%" role="presentation">
                            <tr>
                                <td width="50%" align="center" valign="middle">
                                    <div class="kg-video-play-button"><div></div></div>
                                </td>
                            </tr>
                        </table>
                    </a>
                    <figcaption>Embed note</figcaption>
                </figure>
            `);
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert.match(result.html, /class="kg-bookmark-container"[^>]*style="[^"]*display: flex/);
            assert.match(result.html, /class="kg-video-preview"[^>]*style="[^"]*background-color: #1d1f21/);
            assert(result.html.includes('Embed note'));
        });

        it('applies call-to-action and product card styles', async function () {
            lexicalRenderStub.resolves(`
                <table class="kg-card kg-cta-card kg-cta-bg-none kg-cta-immersive kg-cta-link-accent" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td class="kg-cta-sponsor-label"><p><a href="https://example.com/sponsor">Sponsor</a></p></td>
                    </tr>
                    <tr>
                        <td class="kg-cta-content">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" class="kg-cta-content-wrapper">
                                <tr>
                                    <td class="kg-cta-text"><p>CTA body with <a href="https://example.com/cta">link</a></p></td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
                <table class="kg-product-card" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td class="kg-product-card-container">
                            <table cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td class="kg-product-image" align="center">
                                        <img src="https://example.com/product.jpg" border="0"/>
                                    </td>
                                </tr>
                                <tr>
                                    <td valign="top">
                                        <h4 class="kg-product-title">Product title</h4>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="kg-product-description-wrapper"><p>Product description</p></td>
                                </tr>
                                <tr>
                                    <td class="kg-product-button-wrapper">
                                        <table class="btn" border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td align="center"><a href="https://example.com/buy">Buy now</a></td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            `);
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert.match(result.html, /class="kg-card kg-cta-card kg-cta-bg-none kg-cta-immersive kg-cta-link-accent"[^>]*style="[^"]*border-bottom: 1px solid #e0e7eb/);
            assert.match(result.html, /class="kg-cta-sponsor-label"[^>]*style="[^"]*border-bottom: 1px solid #e0e7eb/);
            assert.match(result.html, /class="kg-product-card"[^>]*style="[^"]*background-color: rgba\(255, 255, 255, 0.25\)/);

            const productButtonTableMatch = result.html.match(/class="kg-product-button-wrapper"[\s\S]*?<table[^>]*class="btn"[^>]*style="([^"]*)"/);
            assert(productButtonTableMatch, 'product button table should have inline styles');
            assert(productButtonTableMatch[1].includes('width: 100%'), 'product button table should have width: 100%');
        });

        it('does not inline margin 0 auto on button tables that would override alignment', async function () {
            lexicalRenderStub.resolves(`
                <table class="kg-card kg-button-card" border="0" cellpadding="0" cellspacing="0">
                    <tbody>
                        <tr>
                            <td class="kg-card-spacing">
                                <table class="btn" border="0" cellspacing="0" cellpadding="0" align="left">
                                    <tbody>
                                        <tr>
                                            <td align="center">
                                                <a href="https://example.com">Left</a>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `);
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert.match(result.html, /<table[^>]*class="btn"[^>]*align="left"/);

            const btnMatch = result.html.match(/<table[^>]*class="btn"[^>]*>/);
            assert(btnMatch, 'should have a btn table');
            assert(!btnMatch[0].includes('margin: 0 auto'), 'button should not have margin: 0 auto');
        });

        it('inlines figcaption styles for image card captions', async function () {
            lexicalRenderStub.resolves(`
                <figure class="kg-card kg-image-card kg-card-hascaption">
                    <img src="https://example.com/photo.jpg" class="kg-image" alt="alt text" loading="lazy" width="600" height="400">
                    <figcaption>A caption</figcaption>
                </figure>
            `);
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            // figcaption should have centered text and muted color inlined
            assert(result.html.includes('A caption'));
            const figcaptionMatch = result.html.match(/<figcaption[^>]*style="([^"]*)"[^>]*>/);
            assert(figcaptionMatch, 'figcaption should have inline styles');
            const figcaptionStyle = figcaptionMatch[1];
            assert(figcaptionStyle.includes('text-align: center'), 'figcaption should be centered');
            assert(figcaptionStyle.includes('font-size: 13px'), 'figcaption should have 13px font');
        });

        it('inlines figure margin and image max-width for image cards', async function () {
            lexicalRenderStub.resolves(`
                <figure class="kg-card kg-image-card">
                    <img src="https://example.com/photo.jpg" class="kg-image" alt="alt text" loading="lazy" width="600" height="400">
                </figure>
            `);
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            // figure should have margin inlined
            const figureMatch = result.html.match(/<figure[^>]*style="([^"]*)"[^>]*>/);
            assert(figureMatch, 'figure should have inline styles');
            assert(figureMatch[1].includes('margin: 0 0 1.5em'), 'figure should have bottom margin');

            // img should have max-width
            const imgMatch = result.html.match(/<img[^>]*style="([^"]*)"[^>]*>/);
            assert(imgMatch, 'img should have inline styles');
            assert(imgMatch[1].includes('max-width: 100%'), 'img should have max-width: 100%');
        });

        it('inlines width 100% on button card outer table', async function () {
            lexicalRenderStub.resolves(`
                <table class="kg-card kg-button-card" border="0" cellpadding="0" cellspacing="0">
                    <tbody>
                        <tr>
                            <td class="kg-card-spacing">
                                <table class="btn" border="0" cellspacing="0" cellpadding="0" align="center">
                                    <tbody>
                                        <tr>
                                            <td align="center">
                                                <a href="https://example.com">Click</a>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `);
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            // The outer kg-button-card table should have width: 100% inlined
            const buttonCardMatch = result.html.match(/<table[^>]*class="kg-card kg-button-card"[^>]*style="([^"]*)"[^>]*>/);
            assert(buttonCardMatch, 'button card table should have inline styles');
            assert(buttonCardMatch[1].includes('width: 100%'), 'button card table should have width: 100%');
        });

        it('preserves explicit right alignment values', async function () {
            lexicalRenderStub.resolves(`
                <table class="kg-card kg-button-card" border="0" cellpadding="0" cellspacing="0">
                    <tbody>
                        <tr>
                            <td class="kg-card-spacing">
                                <table class="btn" border="0" cellspacing="0" cellpadding="0" align="right">
                                    <tbody>
                                        <tr>
                                            <td align="center">
                                                <a href="https://example.com">Right</a>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `);
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert.match(result.html, /<table[^>]*class="btn"[^>]*align="right"/);
        });
    });
});
