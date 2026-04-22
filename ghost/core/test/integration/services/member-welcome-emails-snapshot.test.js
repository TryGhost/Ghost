const sinon = require('sinon');
const i18nLib = require('@tryghost/i18n');
const testUtils = require('../../utils');
const {assertMatchSnapshot} = require('../../utils/assertions');
const MemberWelcomeEmailRenderer = require('../../../core/server/services/member-welcome-emails/member-welcome-email-renderer');

describe('Member Welcome Email Renderer Snapshots', function () {
    let renderer;

    before(async function () {
        await testUtils.setup('default')();
    });

    beforeEach(function () {
        const i18n = i18nLib('en', 'ghost');
        renderer = new MemberWelcomeEmailRenderer({t: i18n.t});

        sinon.stub(Date.prototype, 'getFullYear').returns(2020);
    });

    afterEach(function () {
        sinon.restore();
    });

    function makeLexical(children) {
        return JSON.stringify({
            root: {
                children,
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        });
    }

    function makeParagraph(text) {
        return {
            type: 'paragraph',
            children: [{type: 'text', text}]
        };
    }

    const defaultMember = {
        name: 'Jamie Larson',
        email: 'jamie@example.com',
        uuid: '00000000-0000-4000-8000-000000000000'
    };

    const defaultSiteSettings = {
        title: 'Test Site',
        url: 'http://example.com',
        accentColor: '#15212A'
    };

    it('renders a simple paragraph welcome email', async function () {
        const result = await renderer.render({
            lexical: makeLexical([makeParagraph('Welcome to our site!')]),
            subject: 'Welcome to Test Site',
            member: defaultMember,
            siteSettings: defaultSiteSettings
        });

        assertMatchSnapshot({
            html: result.html,
            plaintext: result.text
        });
    });

    it('renders template variable replacements', async function () {
        const result = await renderer.render({
            lexical: makeLexical([
                makeParagraph('Hello {first_name}, welcome to {site_title}! Your email is {email}.')
            ]),
            subject: 'Welcome to {site_title}, {name}',
            member: defaultMember,
            siteSettings: defaultSiteSettings
        });

        assertMatchSnapshot({
            html: result.html,
            plaintext: result.text,
            subject: result.subject
        });
    });

    it('renders fallback values when member has no name', async function () {
        const result = await renderer.render({
            lexical: makeLexical([
                makeParagraph('Hello {first_name, "friend"}, welcome!')
            ]),
            subject: 'Welcome!',
            member: {
                name: '',
                email: 'anonymous@example.com',
                uuid: '00000000-0000-4000-8000-000000000001'
            },
            siteSettings: defaultSiteSettings
        });

        assertMatchSnapshot({
            html: result.html,
            plaintext: result.text
        });
    });

    it('renders with a custom accent color', async function () {
        const result = await renderer.render({
            lexical: makeLexical([makeParagraph('Welcome!')]),
            subject: 'Welcome',
            member: defaultMember,
            siteSettings: {
                ...defaultSiteSettings,
                accentColor: '#FF0000'
            }
        });

        assertMatchSnapshot({
            html: result.html,
            plaintext: result.text
        });
    });
});
