const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyObjectId, anyUuid} = matchers;
const models = require('../../../core/server/models');
require('should');

let membersAgent;

const memberMatcher = {
    uuid: anyUuid,
    newsletters: [
        {
            id: anyObjectId
        }
    ]
};

describe('Comments API', function () {
    before(async function () {
        membersAgent = await agentProvider.getMembersAPIAgent();

        await fixtureManager.init('posts', 'members');
    });

    beforeEach(function () {
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    describe('when not authenticated but enabled', function () {
        it('can not get member data', async function () {
            await membersAgent
                .get(`/api/member/`)
                .expectStatus(204)
                .expectEmptyBody();
        });
    });

    describe('when authenticated', function () {
        let member;

        before(async function () {
            await membersAgent.loginAs('member@example.com');
            member = await models.Member.findOne({email: 'member@example.com'}, {require: true});
        });

        it('can get member data', async function () {
            await membersAgent
                .get(`/api/member/`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot(memberMatcher)
                .expect(({body}) => {
                    body.email.should.eql(member.get('email'));
                });
        });

        it('can update member bio', async function () {
            await membersAgent
                .put(`/api/member/`)
                .body({
                    bio: 'Head of Testing'
                })
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot(memberMatcher)
                .expect(({body}) => {
                    body.email.should.eql(member.get('email'));
                    body.bio.should.eql('Head of Testing');
                });
            member = await models.Member.findOne({id: member.id}, {require: true});
            member.get('bio').should.eql('Head of Testing');
        });
    });
});
