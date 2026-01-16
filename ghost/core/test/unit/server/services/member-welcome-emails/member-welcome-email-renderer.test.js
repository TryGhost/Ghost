const sinon = require('sinon');
const should = require('should');
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

            result.html.should.containEql('Hello John Doe');
            result.html.should.containEql('or John!');
            result.html.should.containEql('Contact: john@example.com');
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

            result.html.should.containEql('Welcome to Test Site');
            result.html.should.containEql('at https://example.com');
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

            result.html.should.containEql('color: #ff0000');
        });

        it('substitutes template variables in subject', async function () {
            const renderer = new MemberWelcomeEmailRenderer();

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome to {site_title}, {first_name}!',
                member: {name: 'John Doe', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            result.subject.should.equal('Welcome to Test Site, John!');
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

            result.text.should.containEql('Hello !');
            result.html.should.not.containEql('{name}');
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

            result.html.should.containEql('Hello there');
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

            result.html.should.containEql('Hey friend');
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

            result.html.should.containEql('Hello Jane Smith');
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

            result.text.should.containEql('Email: !');
            result.html.should.not.containEql('{email}');
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

            result.html.should.containEql('Hi John');
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
            paddedResult.html.should.containEql('Hi Jane');

            const emptyResult = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: '   ', email: 'empty@example.com'},
                siteSettings: defaultSiteSettings
            });
            emptyResult.html.should.containEql('Hi friend');
        });

        it('wraps content in wrapper.hbs template', async function () {
            lexicalRenderStub.resolves('<p>Content</p>');
            const renderer = new MemberWelcomeEmailRenderer();

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Test Subject',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            result.html.should.containEql('<!doctype html>');
            result.html.should.containEql('<title>Test Subject</title>');
            result.html.should.containEql('<p>Content</p>');
            result.html.should.containEql('Test Site');
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

            result.text.should.be.a.String();
            result.text.should.containEql('Hello World');
        });

        it('throws IncorrectUsageError for invalid Lexical', async function () {
            lexicalRenderStub.rejects(new Error('Invalid JSON'));
            const renderer = new MemberWelcomeEmailRenderer();

            await renderer.render({
                lexical: 'invalid',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            }).should.be.rejectedWith(errors.IncorrectUsageError);
        });

        it('includes error context in IncorrectUsageError', async function () {
            lexicalRenderStub.rejects(new Error('Parse error'));
            const renderer = new MemberWelcomeEmailRenderer();

            try {
                await renderer.render({
                    lexical: 'invalid',
                    subject: 'Welcome!',
                    member: {name: 'John', email: 'john@example.com'},
                    siteSettings: defaultSiteSettings
                });
                should.fail('Should have thrown');
            } catch (err) {
                err.should.be.instanceof(errors.IncorrectUsageError);
                err.context.should.equal('Parse error');
            }
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

            result.html.should.containEql('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
            result.html.should.not.containEql('<script>alert("xss")</script>');
            result.subject.should.equal('Welcome <script>alert("xss")</script>!');
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

            result.html.should.not.containEql('%%{');
            result.html.should.not.containEql('}%%');
            result.subject.should.equal('Welcome !');
        });
    });
});
