const assert = require('node:assert/strict');
const cheerio = require('cheerio');
const sinon = require('sinon');
const rewire = require('rewire');
const errors = require('@tryghost/errors');

describe('MemberWelcomeEmailRenderer', function () {
    let MemberWelcomeEmailRenderer;
    let lexicalRenderStub;

    const defaultSiteSettings = {
        title: 'Test Site',
        url: 'https://example.com',
        accentColor: '#ff0000',
        iconUrl: 'https://example.com/content/images/icon.png'
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
            sinon.assert.calledWith(lexicalRenderStub, lexicalJson, {target: 'email', design: {
                accentColor: '#ff0000',
                accentContrastColor: '#FFFFFF',
                backgroundColor: '#ffffff',
                backgroundIsDark: false,
                buttonBorderRadius: '6px',
                buttonColor: '#ff0000',
                buttonCorners: null,
                buttonStyle: null,
                buttonTextColor: '#FFFFFF',
                dividerColor: '#e0e7eb',
                hasOutlineButtons: false,
                hasRoundedImageCorners: false,
                headerBackgroundColor: null,
                headerBackgroundIsDark: false,
                imageCorners: null,
                linkColor: '#ff0000',
                linkStyle: 'underline',
                postTitleColor: '#000000',
                sectionTitleColor: null,
                textColor: '#000000',
                titleFontWeight: null,
                titleStrongWeight: '800',
                titleWeight: '700'
            }});
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

        it('substitutes uuid replacement token', async function () {
            lexicalRenderStub.resolves('<p><a href="https://partner.transistor.fm/ghost/%%{uuid}%%">Listen</a></p>');
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com', uuid: 'abc-123-def'},
                siteSettings: defaultSiteSettings
            });

            assert(result.html.includes('abc-123-def'), 'should contain member uuid in rendered HTML');
            assert(!result.html.includes('%%{uuid}%%'), 'should not contain raw uuid token');
            assert(!result.html.includes('%%%%'), 'should not contain token wrapping');
            assert(!result.html.includes('%7Buuid%7D'), 'should not contain URL-encoded uuid placeholder');
            assert.match(result.html, /href="https:\/\/partner\.transistor\.fm\/ghost\/abc-123-def"/);
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

            const $ = cheerio.load(result.html);
            const $link = $('a[href="https://example.com"]');
            assert($link.attr('style').includes('color: #ff0000'));
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

            const $ = cheerio.load(result.html);
            assert(result.html.toLowerCase().includes('<!doctype html>'));
            assert.equal($('title').text(), 'Test Subject');
            assert.equal($('p:contains("Content")').length, 1);
            assert($.text().includes('Test Site'));
            assert($.text().includes(`© ${year}`));
            assert($('a[href="https://example.com/#/portal/account/newsletters"]').text().includes('Manage your preferences'));
        });

        it('preserves multiline code block whitespace in the shared email wrapper', async function () {
            lexicalRenderStub.resolves('<pre><code>const firstLine = 1;\nconst secondLine = 2;</code></pre>');
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            const $ = cheerio.load(result.html);
            const $code = $('pre code');
            assert($code.length, 'Expected rendered welcome email HTML to include a code block');
            assert.equal($code.text(), 'const firstLine = 1;\nconst secondLine = 2;');
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

            const $ = cheerio.load(result.html);
            const $link = $('a[href="https://example.com/#/portal/support"]');
            assert($link.length, 'Expected a link to the absolute portal support URL');
            assert.equal($link.text(), 'Support us');
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

            const $ = cheerio.load(result.html);
            assert($.text().includes('<script>alert("xss")</script>'));
            assert.equal($('script').length, 0);
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

            const $ = cheerio.load(result.html);
            assert.equal($('code').length, 0);
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

            const $ = cheerio.load(result.html);
            assert.equal($('code').text(), 'if (x) { return y; }');
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

            const $ = cheerio.load(result.html);
            assert.equal($('code').length, 0);
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

            const $ = cheerio.load(result.html);
            assert.equal($('code').length, 0);
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

            const $ = cheerio.load(result.html);
            assert($.text().includes('Gérer vos préférences'));
            assert(!$.text().includes('Manage your preferences'));
        });

        describe('design customization', function () {
            it('builds the email design from database-backed design settings', async function () {
                const getEmailDesignStub = sinon.stub().returns({accentColor: '#123456'});
                MemberWelcomeEmailRenderer.__set__('getEmailDesign', getEmailDesignStub);

                const renderer = new MemberWelcomeEmailRenderer({t: key => key});
                const designSettings = {
                    background_color: '#111111',
                    button_color: '#222222',
                    button_corners: 'pill',
                    button_style: 'outline',
                    divider_color: '#333333',
                    header_background_color: '#444444',
                    image_corners: 'rounded',
                    link_color: '#555555',
                    link_style: 'bold',
                    section_title_color: '#666666',
                    title_font_weight: 'medium'
                };

                await renderer.render({
                    lexical: '{}',
                    subject: 'Welcome!',
                    designSettings,
                    member: {name: 'John', email: 'john@example.com'},
                    siteSettings: defaultSiteSettings
                });

                sinon.assert.calledOnceWithExactly(getEmailDesignStub, {
                    accentColor: '#ff0000',
                    backgroundColor: '#111111',
                    buttonColor: '#222222',
                    buttonCorners: 'pill',
                    buttonStyle: 'outline',
                    dividerColor: '#333333',
                    headerBackgroundColor: '#444444',
                    imageCorners: 'rounded',
                    linkColor: '#555555',
                    linkStyle: 'bold',
                    postTitleColor: null,
                    sectionTitleColor: '#666666',
                    titleFontWeight: 'medium'
                });

                sinon.assert.calledWith(lexicalRenderStub, '{}', {target: 'email', design: {accentColor: '#123456'}});
            });

            it('passes header and footer settings through to the wrapper template', async function () {
                lexicalRenderStub.resolves('<p>Content</p>');
                const renderer = new MemberWelcomeEmailRenderer({t: key => key});

                const result = await renderer.render({
                    lexical: '{}',
                    subject: 'Test Subject',
                    designSettings: {
                        footer_content: '<p>Custom footer</p>',
                        header_image: 'https://example.com/header.png',
                        show_badge: true,
                        show_header_title: false
                    },
                    member: {name: 'John', email: 'john@example.com'},
                    siteSettings: defaultSiteSettings
                });

                const $ = cheerio.load(result.html);
                assert.equal($('img[src="https://example.com/header.png"]').length, 1);
                assert.equal($('p:contains("Custom footer")').length, 1);
                assert.equal($('a[href="https://ghost.org/?via=pbg-newsletter"]').length, 1);
            });

            it('renders the publication icon when enabled and a site icon exists', async function () {
                lexicalRenderStub.resolves('<p>Content</p>');
                const renderer = new MemberWelcomeEmailRenderer({t: key => key});

                const result = await renderer.render({
                    lexical: '{}',
                    subject: 'Test Subject',
                    designSettings: {
                        show_header_icon: true,
                        show_header_title: false
                    },
                    member: {name: 'John', email: 'john@example.com'},
                    siteSettings: defaultSiteSettings
                });

                const $ = cheerio.load(result.html);
                assert($('.header').length);
                assert($('.site-icon').length);
                assert($('img[src="https://example.com/content/images/icon.png"]').length);
            });

            it('does not render the publication icon when disabled', async function () {
                lexicalRenderStub.resolves('<p>Content</p>');
                const renderer = new MemberWelcomeEmailRenderer({t: key => key});

                const result = await renderer.render({
                    lexical: '{}',
                    subject: 'Test Subject',
                    designSettings: {
                        show_header_icon: false,
                        show_header_title: false
                    },
                    member: {name: 'John', email: 'john@example.com'},
                    siteSettings: defaultSiteSettings
                });

                const $ = cheerio.load(result.html);
                assert.equal($('.header').length, 0);
                assert.equal($('.site-icon').length, 0);
                assert.equal($('img[src="https://example.com/content/images/icon.png"]').length, 0);
            });

            it('does not render the publication icon when the site icon is missing', async function () {
                lexicalRenderStub.resolves('<p>Content</p>');
                const renderer = new MemberWelcomeEmailRenderer({t: key => key});

                const result = await renderer.render({
                    lexical: '{}',
                    subject: 'Test Subject',
                    designSettings: {
                        show_header_icon: true,
                        show_header_title: false
                    },
                    member: {name: 'John', email: 'john@example.com'},
                    siteSettings: {
                        ...defaultSiteSettings,
                        iconUrl: null
                    }
                });

                const $ = cheerio.load(result.html);
                assert.equal($('.header').length, 0);
                assert.equal($('.site-icon').length, 0);
                assert.equal($('img[src="https://example.com/content/images/icon.png"]').length, 0);
            });

            it('uses the sans-serif content-shell class by default when design customization is enabled', async function () {
                lexicalRenderStub.resolves('<p>Content</p>');
                const renderer = new MemberWelcomeEmailRenderer({t: key => key});

                const result = await renderer.render({
                    lexical: '{}',
                    subject: 'Test Subject',
                    member: {name: 'John', email: 'john@example.com'},
                    siteSettings: defaultSiteSettings
                });

                const $ = cheerio.load(result.html);
                assert($('tr.post-content-row').length);
                assert($('.post-content-sans-serif').length);
                assert($('.post-content-sans-serif').attr('style').includes('font-family: -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif'));
            });

            it('uses the serif content-shell class when a serif body font is explicitly configured', async function () {
                lexicalRenderStub.resolves('<p>Content</p>');
                const renderer = new MemberWelcomeEmailRenderer({t: key => key});

                const result = await renderer.render({
                    lexical: '{}',
                    subject: 'Test Subject',
                    designSettings: {
                        body_font_category: 'serif'
                    },
                    member: {name: 'John', email: 'john@example.com'},
                    siteSettings: defaultSiteSettings
                });

                const $ = cheerio.load(result.html);
                assert($('tr.post-content-row').length);
                assert($('.post-content').length);
                assert($('.post-content').attr('style').includes('font-family: Georgia, serif'));
            });

            it('applies custom link colors when design customization is enabled', async function () {
                lexicalRenderStub.resolves('<p><a href="https://example.com">Custom link</a></p>');
                const renderer = new MemberWelcomeEmailRenderer({t: key => key});

                const result = await renderer.render({
                    lexical: '{}',
                    subject: 'Test Subject',
                    designSettings: {
                        link_color: '#000000'
                    },
                    member: {name: 'John', email: 'john@example.com'},
                    siteSettings: defaultSiteSettings
                });

                const $ = cheerio.load(result.html);
                assert($('a:contains("Custom link")').attr('style').includes('color: #000000'));
            });

            it('applies header image styles and preserves header background color', async function () {
                lexicalRenderStub.resolves('<p>Content</p>');
                const renderer = new MemberWelcomeEmailRenderer({t: key => key});

                const result = await renderer.render({
                    lexical: '{}',
                    subject: 'Test Subject',
                    designSettings: {
                        header_background_color: '#123456',
                        header_image: 'https://example.com/header.png',
                        show_badge: false,
                        show_header_title: false
                    },
                    member: {name: 'John', email: 'john@example.com'},
                    siteSettings: defaultSiteSettings
                });

                const $ = cheerio.load(result.html);
                assert($('.header').attr('style').includes('background-color: #123456'));
                assert($('.header-image').length);
                assert($('img[src="https://example.com/header.png"]').length);
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

                const $ = cheerio.load(result.html);
                assert($('.kg-callout-card').attr('style').includes('padding: 24px'));
                assert($('table.btn [style*="background-color: #ff0000"]').length);
            });

            it('applies transistor card styles in welcome emails', async function () {
                lexicalRenderStub.resolves(`
                    <table class="kg-card kg-transistor-card" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td style="padding: 24px; text-align: center;">
                                <a href="https://partner.transistor.fm/ghost/%%{uuid}%%" class="kg-transistor-title">
                                    Listen to your podcasts
                                </a>
                                <a href="https://partner.transistor.fm/ghost/%%{uuid}%%" class="kg-transistor-description">
                                    Subscribe and listen to your personal podcast feed in your favorite app.
                                </a>
                            </td>
                        </tr>
                    </table>
                `);
                const renderer = new MemberWelcomeEmailRenderer({t: key => key});

                const result = await renderer.render({
                    lexical: '{}',
                    subject: 'Welcome!',
                    member: {name: 'John', email: 'john@example.com', uuid: 'abc-123-def'},
                    siteSettings: defaultSiteSettings
                });

                const $ = cheerio.load(result.html);
                assert($('.kg-card.kg-transistor-card').attr('style').includes('border-radius: 10px'));
                assert($('.kg-card.kg-transistor-card').attr('style').includes('border: 1px solid rgba(0, 0, 0, 0.12)'));
                assert($('.kg-transistor-title').attr('style').includes('display: block'));
                assert($('.kg-transistor-title').attr('style').includes('text-decoration: none'));
                assert($('.kg-transistor-description').attr('style').includes('max-width: 400px'));
                assert($('a[href="https://partner.transistor.fm/ghost/abc-123-def"]').length);
                assert(!result.html.includes('%%abc-123-def%%'));
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

                const $ = cheerio.load(result.html);
                assert($('.kg-bookmark-container').attr('style').includes('display: flex'));
                assert($('.kg-video-preview').attr('style').includes('background-color: #1d1f21'));
                assert($.text().includes('Embed note'));
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

                const $ = cheerio.load(result.html);
                assert($('.kg-cta-card').attr('style').includes('border-bottom: 1px solid #e0e7eb'));
                assert($('.kg-cta-sponsor-label').attr('style').includes('border-bottom: 1px solid #e0e7eb'));
                assert($('.kg-product-card').attr('style').includes('background-color: rgba(255, 255, 255, 0.25)'));
                assert($('.kg-product-button-wrapper table.btn').attr('style').includes('width: 100%'), 'product button table should have width: 100%');
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

                const $ = cheerio.load(result.html);
                const $button = $('table.btn');
                assert($button.length, 'should have a btn table');
                assert.equal($button.attr('align'), 'left');
                assert(!$button.attr('style')?.includes('margin: 0 auto'), 'button should not have margin: 0 auto');
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

                const $ = cheerio.load(result.html);
                const $figcaption = $('figcaption');
                assert.equal($figcaption.text(), 'A caption');
                assert($figcaption.attr('style').includes('text-align: center'), 'figcaption should be centered');
                assert($figcaption.attr('style').includes('font-size: 13px'), 'figcaption should have 13px font');
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

                const $ = cheerio.load(result.html);
                assert($('figure').attr('style').includes('margin: 0 0 1.5em'), 'figure should have bottom margin');
                assert($('figure img.kg-image').attr('style').includes('max-width: 100%'), 'img should have max-width: 100%');
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

                const $ = cheerio.load(result.html);
                assert($('table.kg-card.kg-button-card').attr('style').includes('width: 100%'), 'button card table should have width: 100%');
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

                const $ = cheerio.load(result.html);
                assert.equal($('table.btn').attr('align'), 'right');
            });
        });
    });
});
