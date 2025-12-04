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

        MemberWelcomeEmailRenderer = rewire('../../../../../core/server/services/member-welcome-emails/MemberWelcomeEmailRenderer');
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

        it('substitutes member.name template variable', async function () {
            lexicalRenderStub.resolves('<p>Hello {{member.name}}</p>');
            const renderer = new MemberWelcomeEmailRenderer();

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John Doe', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            result.html.should.containEql('Hello John Doe');
        });

        it('substitutes member.firstname template variable', async function () {
            lexicalRenderStub.resolves('<p>Hi {{member.firstname}}</p>');
            const renderer = new MemberWelcomeEmailRenderer();

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John Doe', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            result.html.should.containEql('Hi John');
        });

        it('substitutes member.email template variable', async function () {
            lexicalRenderStub.resolves('<p>Your email: {{member.email}}</p>');
            const renderer = new MemberWelcomeEmailRenderer();

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            result.html.should.containEql('Your email: john@example.com');
        });

        it('substitutes site.title template variable', async function () {
            lexicalRenderStub.resolves('<p>Welcome to {{site.title}}</p>');
            const renderer = new MemberWelcomeEmailRenderer();

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            result.html.should.containEql('Welcome to Test Site');
        });

        it('substitutes site.url template variable', async function () {
            lexicalRenderStub.resolves('<p>Visit {{site.url}}</p>');
            const renderer = new MemberWelcomeEmailRenderer();

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            result.html.should.containEql('Visit https://example.com');
        });

        it('substitutes siteTitle template variable', async function () {
            lexicalRenderStub.resolves('<p>From {{siteTitle}}</p>');
            const renderer = new MemberWelcomeEmailRenderer();

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            result.html.should.containEql('From Test Site');
        });

        it('substitutes siteUrl template variable', async function () {
            lexicalRenderStub.resolves('<p>Go to {{siteUrl}}</p>');
            const renderer = new MemberWelcomeEmailRenderer();

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            result.html.should.containEql('Go to https://example.com');
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
                subject: 'Welcome to {{site.title}}, {{member.firstname}}!',
                member: {name: 'John Doe', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            result.subject.should.equal('Welcome to Test Site, John!');
        });

        it('falls back to "there" when member name is missing', async function () {
            lexicalRenderStub.resolves('<p>Hello {{member.name}}</p>');
            const renderer = new MemberWelcomeEmailRenderer();

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            result.html.should.containEql('Hello there');
        });

        it('falls back to empty string when member email is missing', async function () {
            lexicalRenderStub.resolves('<p>Email: {{member.email}}</p>');
            const renderer = new MemberWelcomeEmailRenderer();

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John'},
                siteSettings: defaultSiteSettings
            });

            result.html.should.containEql('Email: </p>');
        });

        it('extracts first name correctly from full name', async function () {
            lexicalRenderStub.resolves('<p>Hi {{member.firstname}}</p>');
            const renderer = new MemberWelcomeEmailRenderer();

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John Michael Doe', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            result.html.should.containEql('Hi John');
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

        it('returns html, text, and subject', async function () {
            const renderer = new MemberWelcomeEmailRenderer();

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            should.exist(result.html);
            should.exist(result.text);
            should.exist(result.subject);
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
    });
});
