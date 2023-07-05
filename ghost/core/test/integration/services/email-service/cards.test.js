const {agentProvider, fixtureManager, mockManager} = require('../../../utils/e2e-framework');
const models = require('../../../../core/server/models');
const assert = require('assert/strict');
const configUtils = require('../../../utils/configUtils');
const {sendEmail, matchEmailSnapshot} = require('../../../utils/batch-email-utils');
const cheerio = require('cheerio');

/**
 * Remove the preheader span from the email html and put it in a separate field called preheader
 * @template {{html: string}} T
 * @param {T} data
 * @returns {asserts data is T & {preheader: string}}
 */
function splitPreheader(data) {
    // Remove the preheader span from the email using cheerio
    const $ = cheerio.load(data.html);
    const preheader = $('.preheader');
    // @ts-ignore
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
                createParagraphCard('This is a paragraph test.')
            ])
        });

        // Remove the preheader span from the email using cheerio
        splitPreheader(data);

        // Check only contains once in every part
        assert.equal(data.html.match(/This is a paragraph test\./g).length, 1);
        assert.equal(data.plaintext.match(/This is a paragraph test\./g).length, 1);
        assert.equal(data.preheader.match(/This is a paragraph test\./g).length, 1);

        await matchEmailSnapshot();
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
        assert.ok(!data.plaintext.includes('Sign up for Koenig Lexical'));
        assert.ok(!data.preheader.includes('Sign up for Koenig Lexical'));

        assert.ok(data.html.includes('This is a paragraph'));
        assert.ok(data.plaintext.includes('This is a paragraph'));
        assert.ok(data.preheader.includes('This is a paragraph'));

        await matchEmailSnapshot();
    });
});
