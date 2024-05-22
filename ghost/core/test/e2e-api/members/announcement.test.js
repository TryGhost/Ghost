const {agentProvider, mockManager, fixtureManager, matchers, configUtils} = require('../../utils/e2e-framework');
const {anyEtag} = matchers;
const settingsCache = require('../../../core/shared/settings-cache');

describe('Announcement', function () {
    let membersAgent;

    before(async function () {
        membersAgent = await agentProvider.getMembersAPIAgent();

        await fixtureManager.init('members');
    });

    afterEach(async function () {
        await configUtils.restore();
        mockManager.restore();
    });

    it('Can read announcement endpoint', async function () {
        await membersAgent
            .get(`/api/announcement/`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot();
    });

    it('Can read announcement when it is present in announcement data', async function () {
        settingsCache.set('announcement_content', {value: '<p>Test announcement</p>'});
        settingsCache.set('announcement_visibility', {value: ['visitors']});

        await membersAgent
            .get(`/api/announcement/`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot();
    });
});
