const assert = require('assert/strict');
const {MailEventService} = require('@tryghost/mail-events');
const {agentProvider, matchers, mockManager} = require('../../utils/e2e-framework');
const configUtils = require('../../utils/configUtils');
const models = require('../../../core/server/models');

const {anyContentVersion, anyEtag} = matchers;

describe('Mail Events API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();

        mockManager.mockLabsEnabled(MailEventService.LABS_KEY);
    });

    it('Can add a mail event', async function () {
        configUtils.set(MailEventService.CONFIG_KEY_PAYLOAD_SIGNING_KEY, 'foobarbaz');

        const payload = {
            // The signature is based on the previous config value as well as the
            // "mail_events" array below. If you change any of these values, you will need to
            // update the signature otherwise the request will fail
            signature: '51ab01400f9a78669733d85fcf344401f5da648f8c95707bc06da0456cb99fbc',
            mail_events: [
                {
                    id: 'Ase7i2zsRYeDXztHGENqRA',
                    timestamp: 1521243339.873676,
                    event: 'opened',
                    message: {
                        headers: {
                            'message-id': '20130503182626.18666.16540@sandboxb052085d6a7b401bb117d3a432d1d659.mailgun.org'
                        }
                    },
                    recipient: 'alice@example.com'
                }
            ]
        };

        await agent
            .post('/mail_events/', {
                headers: {
                    'content-type': 'application/json'
                }
            })
            .body(payload)
            .expectStatus(200)
            .matchBodySnapshot({})
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        const storedMailEvent = await models.MailEvent.findOne({id: 'Ase7i2zsRYeDXztHGENqRA'});

        assert.ok(storedMailEvent, 'Expected mail event was not found in the database');
    });
});
