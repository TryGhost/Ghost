const sinon = require('sinon');
const {agentProvider, fixtureManager, mockManager} = require('../../../utils/e2e-framework');
const models = require('../../../../core/server/models');
const assert = require('node:assert/strict');
const configUtils = require('../../../utils/config-utils');
const {sendEmail, matchEmailSnapshot} = require('../../../utils/batch-email-utils');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const {DEFAULT_NODES} = require('@tryghost/kg-default-nodes');

const goldenPost = fs.readJsonSync('./test/utils/fixtures/email-service/golden-post.json');

// some nodes are not cards or will never be emailed so we exclude them from tests
// that check if all default nodes are rendered or have associated renderers called
const excludedNodes = [
    // only used in pages, will never be emailed
    'collection',
    // non-card nodes
    'paragraph',
    'aside',
    'extended-text',
    'extended-quote',
    'extended-heading',
    'tk',
    'at-link',
    'at-link-search',
    'zwnj'
];

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
        sinon.stub(Date.prototype, 'getFullYear').returns(2025); // for consistent snapshots
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
        it(`renders the golden post correctly (${status})`, async function () {
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

        const cardsInDefaultNodes = DEFAULT_NODES.map((node) => {
            try {
                return node.getType();
            } catch (error) {
                return null;
            }
        }).filter((card) => {
            return card !== null && !excludedNodes.includes(card); // don't include extended versions of regular text type nodes, we only want the cards (decorator nodes)
        });

        // Check that every card in DEFAULT_NODES are present in the golden post (with the exception of the excludedNodes above)
        for (const card of cardsInDefaultNodes) {
            assert.ok(cardsInGoldenPost.includes(card), `The golden post does not contain the ${card} card`);
        }
    });

    it('calls custom node renderers for all cards in golden post', async function () {
        // get list of card nodes in the golden post
        const nodesInGoldenPost = goldenPost.root.children.map((child) => {
            return child.type;
        }).filter(node => !excludedNodes.includes(node));

        // we have a map of spies because some nodes have multiple versions
        const spies = {};

        // spy on the custom node renderers
        const customNodeRenderers = require('../../../../core/server/services/koenig/node-renderers');
        nodesInGoldenPost.forEach((node) => {
            if (!customNodeRenderers[node]) {
                throw new Error(`Custom node renderer for ${node} not found`);
            }
            if (typeof customNodeRenderers[node] === 'object') {
                // select highest version of the node - we only want to test the latest version
                // TODO: golden post should really contain a node with each version
                const versions = Object.keys(customNodeRenderers[node]);
                const highestVersion = versions.reduce((a, b) => {
                    return parseInt(a) > parseInt(b) ? a : b;
                });
                spies[node] = sinon.spy(customNodeRenderers[node], highestVersion);
            } else {
                spies[node] = sinon.spy(customNodeRenderers, node);
            }
        });

        await sendEmail(agent, {lexical: JSON.stringify(goldenPost)});

        // check that all the custom node renderers were called
        Object.keys(spies).forEach((node) => {
            sinon.assert.called(spies[node]);
        });
    });
});
