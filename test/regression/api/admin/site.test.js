const {any, stringMatching} = require('@tryghost/jest-snapshot');
const {agentProvider} = require('../../../utils/e2e-framework');

describe('Site API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAgent('/ghost/api/canary/admin/');
    });

    it('can retrieve config and all expected properties', async function () {
        await agent
            .get('site/')
            .matchBodySnapshot({
                site: {
                    version: stringMatching(/\d+\.\d+/)
                }
            })
            .matchHeaderSnapshot({
                etag: any(String)
            });
    });
});
