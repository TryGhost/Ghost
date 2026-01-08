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
            lexicalRenderStub.resolves('<p>Hello {{member.name}}, or {{member.firstname}}! Contact: {{member.email}}</p>');
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
            lexicalRenderStub.resolves('<p>Welcome to {{site.title}} at {{site.url}}. Also {{siteTitle}} and {{siteUrl}}</p>');
            const renderer = new MemberWelcomeEmailRenderer();

            const result = await renderer.render({
                lexical: '{}',
                subject: 'Welcome!',
                member: {name: 'John', email: 'john@example.com'},
                siteSettings: defaultSiteSettings
            });

            result.html.should.containEql('Welcome to Test Site');
            result.html.should.containEql('at https://example.com');
            result.html.should.containEql('Also Test Site');
            result.html.should.containEql('and https://example.com');
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

            result.html.should.containEql('Email: <');
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
