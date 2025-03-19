const sinon = require('sinon');
const {agentProvider, fixtureManager, mockManager} = require('../../../utils/e2e-framework');
const models = require('../../../../core/server/models');
const labs = require('../../../../core/shared/labs');
const assert = require('assert/strict');
const configUtils = require('../../../utils/configUtils');
const {sendEmail, matchEmailSnapshot} = require('../../../utils/batch-email-utils');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const {DEFAULT_NODES} = require('@tryghost/kg-default-nodes');

const goldenPost = fs.readJsonSync('./test/utils/fixtures/email-service/golden-post.json');

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
        sinon.restore();
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

    // Run the tests for a free and non-free member
    // NOTE: this is to workaround the email snapshot utils not handling slight discrepancies in email body, but it
    // means we can have snapshots for both free and non-free members
    ['status:free', 'status:-free'].forEach(function (status) {
        it(`renders the golden post correctly (no labs flags) (${status})`, async function () {
            sinon.stub(labs, 'isSet').returns(false);

            const data = await sendEmail(agent, {
                lexical: JSON.stringify(goldenPost)
            }, status);

            splitPreheader(data);

            await matchEmailSnapshot();
        });

        it(`renders the golden post correctly (labs flag: contentVisibility) (${status})`, async function () {
            sinon.stub(labs, 'isSet').callsFake((key) => {
                if (key === 'contentVisibility') {
                    return true;
                }
                return false;
            });

            const data = await sendEmail(agent, {
                lexical: JSON.stringify(goldenPost)
            }, status);

            splitPreheader(data);

            await matchEmailSnapshot();
        });
    });

    it('renders all of the default nodes in the golden post', async function () {
        // This test checks that all of the default nodes from @tryghost/kg-default-nodes are present in the golden post
        // This is to ensure that if we add new cards to Koenig, they will be included in the golden post
        // This is important because the golden post is used to test the email rendering of the cards after
        // they have gone through the Email Renderer, which can change the HTML/CSS of the cards
        // See the README.md in this same directory for more information.

        const cardsInGoldenPost = goldenPost.root.children.map((child) => {
            return child.type;
        });

        const excludedCards = [
            'collection', // only used in pages, will never be emailed
            'extended-text', // not a card
            'extended-quote', // not a card
            'extended-heading', // not a card
            'call-to-action', // behind the contentVisibility labs flag
            // not a card and shouldn't be present in published posts / emails
            'tk',
            'at-link',
            'at-link-search',
            'zwnj'
        ];

        const cardsInDefaultNodes = DEFAULT_NODES.map((node) => {
            try {
                return node.getType();
            } catch (error) {
                return null;
            }
        }).filter((card) => {
            return card !== null && !excludedCards.includes(card); // don't include extended versions of regular text type nodes, we only want the cards (decorator nodes)
        });

        // Check that every card in DEFAULT_NODES are present in the golden post (with the exception of the excludedCards above)
        for (const card of cardsInDefaultNodes) {
            assert.ok(cardsInGoldenPost.includes(card), `The golden post does not contain the ${card} card`);
        }
    });
});
