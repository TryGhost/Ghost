import assert from 'node:assert/strict';

const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

// Custom fields are staff-only. Nothing in the members API is written to expose or
// accept them — the member response is built from a field whitelist that predates the
// feature, and the update path drops unknown keys — but nothing asserted it. These pin
// the two endpoints that hand a member their own payload. Other member-facing surfaces
// (newsletter preferences, theme member data, the comments author shape) narrow through
// their own whitelists and are not covered here.
describe('Member Custom Fields Members API', function () {
    let adminAgent: {
        get: (_url: string) => any;
        put: (_url: string) => any;
        post: (_url: string) => any;
        loginAsOwner: () => Promise<void>;
    };
    let membersAgent: {
        get: (_url: string) => any;
        put: (_url: string) => any;
        loginAs: (_email: string) => Promise<void>;
    };
    let memberId: string;
    let fieldKey: string;
    let fieldCounter = 0;

    async function readValuesAsStaff() {
        const {body} = await adminAgent
            .get(`members/${memberId}/`)
            .expectStatus(200);
        return body.members[0].custom_fields;
    }

    beforeAll(async function () {
        ({adminAgent, membersAgent} = await agentProvider.getAgentsForMembers());
        await fixtureManager.init('newsletters', 'members:newsletters');
        await adminAgent.loginAsOwner();
        await membersAgent.loginAs('member@example.com');

        const member = await models.Member.findOne({email: 'member@example.com'}, {require: true});
        memberId = member.id;
    });

    beforeEach(async function () {
        mockManager.mockLabsEnabled('membersCustomFields');

        fieldCounter += 1;
        const {body} = await adminAgent
            .post('members/custom_fields/')
            .body({members_custom_fields: [{name: `Shoe size ${fieldCounter}`, type: 'short_text'}]})
            .expectStatus(201);
        fieldKey = body.members_custom_fields[0].key;

        await adminAgent
            .put(`members/${memberId}/`)
            .body({members: [{custom_fields: {[fieldKey]: '9'}}]})
            .expectStatus(200);
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('does not return custom fields to the member who holds them', async function () {
        const {body} = await membersAgent
            .get('/api/member/')
            .expectStatus(200);

        assert.equal(Object.hasOwn(body, 'custom_fields'), false);
    });

    it('does not write custom fields a member sends', async function () {
        const {body} = await membersAgent
            .put('/api/member/')
            .body({name: 'Renamed', custom_fields: {[fieldKey]: '12'}})
            .expectStatus(200);

        // The rest of the body still applies, so the value is dropped rather than
        // the request being rejected — the same way `email` behaves here.
        assert.equal(body.name, 'Renamed');
        assert.equal(Object.hasOwn(body, 'custom_fields'), false);
        assert.equal((await readValuesAsStaff())[fieldKey], '9');
    });
});
