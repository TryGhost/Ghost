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

        it('preserves multiline code block whitespace in the shared email wrapper', async function () {
            lexicalRenderStub.resolves('<pre><code>const firstLine = 1;\nconst secondLine = 2;</code></pre>');
            const renderer = new MemberWelcomeEmailRenderer({t: key => key});

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            const codeBlockMatch = result.html.match(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/);

            assert(codeBlockMatch, 'Expected rendered welcome email HTML to include a code block');
            assert.equal(codeBlockMatch[1], 'const firstLine = 1;\nconst secondLine = 2;');
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

                assert(result.html.includes('src="https://example.com/header.png"'));
                assert(result.html.includes('Custom footer</p>'));
                assert(result.html.includes('https://ghost.org/?via=pbg-newsletter'));
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

                assert(result.html.includes('class="header"'));
                assert(result.html.includes('class="site-icon"'));
                assert(result.html.includes('src="https://example.com/content/images/icon.png"'));
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

                assert(!result.html.includes('class="header"'));
                assert(!result.html.includes('class="site-icon"'));
                assert(!result.html.includes('src="https://example.com/content/images/icon.png"'));
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

                assert(!result.html.includes('class="header"'));
                assert(!result.html.includes('class="site-icon"'));
                assert(!result.html.includes('content/images/icon.png'));
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

                assert.match(result.html, /<tr class="post-content-row">/);
                assert(result.html.includes('class="post-content-sans-serif"'));
                assert(result.html.includes('font-family: -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;'));
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

                assert(result.html.includes('class="post-content"'));
                assert(result.html.includes('font-family: Georgia, serif;'));
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

                assert(result.html.includes('class="post-content-sans-serif"'));
                assert(result.html.includes('color: #000000'));
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

                assert.match(result.html, /class="header"[^>]*background-color:\s*#123456/i);
                assert.match(result.html, /class="header-main"[^>]*background-color:\s*#123456/i);
                assert.match(result.html, /class="header-image"/i);
                assert.match(result.html, /src="https:\/\/example\.com\/header\.png"/);
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

                assert.match(result.html, /class="kg-card kg-transistor-card"[^>]*style="[^"]*border-radius: 10px/);
                assert.match(result.html, /class="kg-card kg-transistor-card"[^>]*style="[^"]*border: 1px solid rgba\(0, 0, 0, 0.12\)/);
                assert.match(result.html, /class="kg-transistor-title"[^>]*style="[^"]*display: block/);
                assert.match(result.html, /class="kg-transistor-title"[^>]*style="[^"]*text-decoration: none/);
                assert.match(result.html, /class="kg-transistor-description"[^>]*style="[^"]*max-width: 400px/);
                assert.match(result.html, /href="https:\/\/partner\.transistor\.fm\/ghost\/abc-123-def"/);
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

                const figureMatch = result.html.match(/<figure[^>]*style="([^"]*)"[^>]*>/);
                assert(figureMatch, 'figure should have inline styles');
                assert(figureMatch[1].includes('margin: 0 0 1.5em'), 'figure should have bottom margin');

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
});
