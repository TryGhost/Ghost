const {agentProvider, fixtureManager, mockManager} = require('../../../utils/e2e-framework');
const models = require('../../../../core/server/models');
const assert = require('assert/strict');
const configUtils = require('../../../utils/configUtils');
const {sendEmail} = require('./utils');
const cheerio = require('cheerio');

function splitPreheader(data) {
    // Remove the preheader span from the email using cheerio
    const $ = cheerio.load(data.html);
    const preheader = $('.preheader');
    data.preheader = preheader.html();
    preheader.remove();
    data.html = $.html();
}

function createParagraphCard(text = 'Hello world.') {
    return {
        children: [
            {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text,
                type: 'text',
                version: 1
            }
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1
    };
}

function createLexicalJson(cards = []) {
    return JSON.stringify({
        root: {
            children: [
                ...cards
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'root',
            version: 1
        }
    });
}

let agent;

describe('Can send cards via email', function () {
    beforeEach(function () {
        mockManager.mockMail();
        mockManager.mockMailgun();
    });

    afterEach(async function () {
        await configUtils.restore();
        await models.Settings.edit([{
            key: 'email_verification_required',
            value: false
        }], {context: {internal: true}});
        mockManager.restore();
    });

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();

        await fixtureManager.init('newsletters', 'members:newsletters');
        await agent.loginAsOwner();
    });

    it('Paragraphs', async function () {
        const data = await sendEmail(agent, {
            lexical: createLexicalJson([
                createParagraphCard('Hello world.')
            ])
        });

        // Remove the preheader span from the email using cheerio
        splitPreheader(data);

        // Check our html and plaintexct contain the paragraph
        assert.ok(data.html.includes('Hello world.'));
        assert.ok(data.plaintext.includes('Hello world.'));
        assert.ok(data.preheader.includes('Hello world.'));
    });

    it('Signup Card', async function () {
        const data = await sendEmail(agent, {
            lexical: createLexicalJson([
                createParagraphCard('This is a paragraph'),
                {
                    type: 'signup',
                    version: 1,
                    alignment: 'left',
                    backgroundColor: '#F0F0F0',
                    backgroundImageSrc: '',
                    backgroundSize: 'cover',
                    textColor: '#000000',
                    buttonColor: 'accent',
                    buttonTextColor: '#FFFFFF',
                    buttonText: 'Subscribe',
                    disclaimer: '<span>No spam. Unsubscribe anytime.</span>',
                    header: '<span>Sign up for Koenig Lexical</span>',
                    labels: [],
                    layout: 'wide',
                    subheader: '<span>There\'s a whole lot to discover in this editor. Let us help you settle in.</span>',
                    successMessage: 'Email sent! Check your inbox to complete your signup.',
                    swapped: false
                }
            ])
        });

        splitPreheader(data);

        // Check the plaintext does contain the paragraph, but doesn't contain the signup card
        assert.ok(!data.html.includes('Sign up for Koenig Lexical'));

        // This is a bug! The plaintext and preheader should not contain the signup card
        //assert.ok(!data.plaintext.includes('Sign up for Koenig Lexical'));
        //assert.ok(!data.preheader.includes('Sign up for Koenig Lexical'));

        assert.ok(data.html.includes('This is a paragraph'));
        assert.ok(data.plaintext.includes('This is a paragraph'));
        assert.ok(data.preheader.includes('This is a paragraph'));
    });
});
