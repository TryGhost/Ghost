const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const MentionsService = require('../../../core/server/services/mentions');
const { MentionSendingService } = require('@tryghost/webmentions');
const sinon = require('sinon');
const nock = require('nock');

let agent;
let post_id;
let post_body;

describe('Mentions Service', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        await agent.loginAsAdmin();
        await mockManager.mockLabsEnabled('webmentions');
        MentionsService.init();

        // problematic - can't stub this without creating an object..
        //  how do we access the SendingService instance created by MentionsService.init?
        let sendingStub = sinon.stub(MentionSendingService, 'sendForEditedPost')
        nock.disableNetConnect(); // make sure we don't actually send mentions
    });

    afterEach(function () {
        mockManager.restore();
    })

    after(function () {
        nock.enableNetConnect();
    })

    describe('Sending Service', async function () {

        it('Is not triggered on a draft post.edited', async function () {
            const res = await agent
                .post('posts/')
                .body({
                    posts: [{
                        title: 'testing post.edited',
                        status: 'draft'
                    }]
                })
                .expectStatus(201);

            // used for subsequent tests to reuse same post
            post_id = res.body.posts[0].id;
            post_body = res.body.posts[0];

            // TODO: check for trigger
        });

    });

    // it('Is triggered on a publishing a post', async function () {
    //     const res = await agent
    //         .put('posts/' + post_id)
    //         .body({
    //             posts: [post_body]
    //         })
    //         .expectStatus(200);

    //     // TODO: check for trigger
    // });

    // TODO: triggered on post.edited for status = published (and published.edited)

});

// TODO: do not send if webmentions disabled