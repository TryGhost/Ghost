const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, stringMatching, anyContentLength} = matchers;
const assert = require('assert/strict');
const models = require('../../../core/server/models');

describe('Site Public Settings', function () {
    let membersAgent;

    before(async function () {
        membersAgent = await agentProvider.getMembersAPIAgent();
        await fixtureManager.init();
    });

    it('Can retrieve site pubic config', async function () {
        const {body} = await membersAgent
            .get('/api/site')
            .matchBodySnapshot({
                site: {
                    version: stringMatching(/\d+\.\d+/)
                }
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                'content-length': anyContentLength
            });
        assert.equal(body.site.allow_self_signup, true);
    });

    it('Sets allow_self_signup to false when members are invite only', async function () {
        await await models.Settings.edit({
            key: 'members_signup_access',
            value: 'invite'
        }, {context: {internal: true}});

        const {body} = await membersAgent
            .get('/api/site')
            .matchBodySnapshot({
                site: {
                    version: stringMatching(/\d+\.\d+/)
                }
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                'content-length': anyContentLength
            });
        assert.equal(body.site.allow_self_signup, false);
    });
});
