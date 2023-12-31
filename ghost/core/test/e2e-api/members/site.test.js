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

    afterEach(async function () {
        await models.Settings.edit({
            key: 'members_signup_access',
            value: 'all'
        }, {context: {internal: true}});
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
        assert.equal(body.site.allow_external_signup, true);
    });

    it('Sets allow_external_signup to false when members are invite only', async function () {
        await models.Settings.edit({
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
        assert.equal(body.site.allow_external_signup, false);
    });

    it('Sets allow_external_signup to false when portal requires checkbox', async function () {
        const {body: initialBody} = await membersAgent
            .get('/api/site');
        assert.equal(initialBody.site.allow_external_signup, true, 'This test requires the initial state to allow external signups');

        await models.Settings.edit({
            key: 'portal_signup_checkbox_required',
            value: true
        }, {context: {internal: true}});

        await models.Settings.edit({
            key: 'portal_signup_terms_html',
            value: 'I agree to the terms and conditions'
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
        assert.equal(body.site.allow_external_signup, false);
    });
});
