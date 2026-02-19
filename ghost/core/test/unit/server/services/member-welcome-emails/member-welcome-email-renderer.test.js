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
            const renderer = new MemberWelcomeEmailRenderer();
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
            const renderer = new MemberWelcomeEmailRenderer();

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
            const renderer = new MemberWelcomeEmailRenderer();

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
            const renderer = new MemberWelcomeEmailRenderer();

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert(result.html.includes('color: #ff0000'));
        });

        it('substitutes template variables in subject', async function () {
            const renderer = new MemberWelcomeEmailRenderer();

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
            const renderer = new MemberWelcomeEmailRenderer();

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
            const renderer = new MemberWelcomeEmailRenderer();

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
            const renderer = new MemberWelcomeEmailRenderer();

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
            const renderer = new MemberWelcomeEmailRenderer();

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
            const renderer = new MemberWelcomeEmailRenderer();

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
            const renderer = new MemberWelcomeEmailRenderer();

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
            const renderer = new MemberWelcomeEmailRenderer();

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
            const renderer = new MemberWelcomeEmailRenderer();
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

        it('generates plain text from HTML', async function () {
            lexicalRenderStub.resolves('<p>Hello World</p>');
            const renderer = new MemberWelcomeEmailRenderer();

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
            const renderer = new MemberWelcomeEmailRenderer();

            await assert.rejects(renderer.render({
                lexical: 'invalid',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            }), errors.IncorrectUsageError);
        });

        it('includes error context in IncorrectUsageError', async function () {
            lexicalRenderStub.rejects(new Error('Parse error'));
            const renderer = new MemberWelcomeEmailRenderer();

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
            const renderer = new MemberWelcomeEmailRenderer();

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
            const renderer = new MemberWelcomeEmailRenderer();

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
            const renderer = new MemberWelcomeEmailRenderer();

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
            const renderer = new MemberWelcomeEmailRenderer();

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
            const renderer = new MemberWelcomeEmailRenderer();

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
            const renderer = new MemberWelcomeEmailRenderer();

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            assert(!result.html.includes('<code>{first_name "friend"}</code>'));
            assert(result.html.includes('Hey friend'));
        });
    });
});
