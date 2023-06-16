const assert = require('assert');
const {agentProvider} = require('../../utils/e2e-framework');
const configUtils = require('../../utils/configUtils');
const mailEvents = require('../../../core/server/services/mail-events');
const models = require('../../../core/server/models');

describe('Mail Events API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
    });

    it('Can add a mail event', async function () {
        configUtils.set('hostSettings:siteId', 123);
        configUtils.set('hostSettings:mailEventsSecretKey', 'foobarbaz');

        // Re-initialise the mail events service with the new config values
        mailEvents.init();

        const payload = {
            // The signature is based on the previous two config values as well as the
            // "events" array below. If you change any of these values, you will need to
            // update the signature otherwise the request will fail
            signature: 'c505cb9b343795954199d5d514bf520b6b133bd9f1580805f0fa150d1b89fdab',
            events: [
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
            .matchHeaderSnapshot({});

        const storedMailEvent = await models.MailEvent.findOne({id: 'Ase7i2zsRYeDXztHGENqRA'});

        assert.ok(storedMailEvent, 'Expected mail event was not found in the database');
    });
});
