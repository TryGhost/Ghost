const FormData = require('form-data');
const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag} = matchers;

describe('Settings File API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
        await agent.loginAsOwner();
    });

    it('Can download routes.yaml', async function () {
        await agent.get('settings/routes/yaml/')
            .header('Accept', 'application/yaml')
            .expectStatus(200)
            .expectEmptyBody()
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can upload routes.yaml', async function () {
        const routesYaml = 'routes:\ncollections:\ntaxonomies:\n';

        const formData = new FormData();
        formData.append('routes', routesYaml, {
            filename: 'routes.yaml',
            contentType: 'application/yaml'
        });

        await agent.post('settings/routes/yaml/')
            .body(formData)
            .expectStatus(200)
            .expectEmptyBody()
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });
});
