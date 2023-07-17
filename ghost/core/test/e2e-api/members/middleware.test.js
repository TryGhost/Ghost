const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyObjectId, anyUuid, anyISODateTime} = matchers;
const models = require('../../../core/server/models');
const should = require('should');

let membersAgent;

const memberMatcher = (newslettersCount) => {
    return {
        uuid: anyUuid,
        created_at: anyISODateTime,
        newsletters: new Array(newslettersCount).fill(
            {
                id: anyObjectId
            }
        )
    };
};

// @todo: we currently don't serialise the output of /api/member/newsletters/, we should fix this
const memberMatcherUnserialised = (newslettersCount) => {
    return {
        uuid: anyUuid,
        newsletters: new Array(newslettersCount).fill(
            {
                id: anyObjectId,
                uuid: anyUuid,
                created_at: anyISODateTime,
                updated_at: anyISODateTime
            }
        )
    };
};

describe('Comments API', function () {
    before(async function () {
        membersAgent = await agentProvider.getMembersAPIAgent();

        await fixtureManager.init('newsletters', 'members:newsletters');
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

        it('can update comment notifications', async function () {
            // Only via updateMemberNewsletters
            let member = await models.Member.findOne({id: fixtureManager.get('members', 0).id}, {require: true});
            member.get('enable_comment_notifications').should.eql(true, 'This test requires the initial value to be true');

            await membersAgent
                .put(`/api/member/newsletters/?uuid=${member.get('uuid')}`)
                .body({
                    enable_comment_notifications: false
                })
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot(memberMatcherUnserialised(1))
                .expect(({body}) => {
                    body.email.should.eql(member.get('email'));
                    body.enable_comment_notifications.should.eql(false);
                });
            member = await models.Member.findOne({id: member.id}, {require: true});
            member.get('enable_comment_notifications').should.eql(false);
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
                .matchBodySnapshot(memberMatcher(2))
                .expect(({body}) => {
                    body.email.should.eql(member.get('email'));
                });
        });

        it('can update member expertise', async function () {
            await membersAgent
                .put(`/api/member/`)
                .body({
                    expertise: 'Head of Testing'
                })
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot(memberMatcher(2))
                .expect(({body}) => {
                    body.email.should.eql(member.get('email'));
                    body.expertise.should.eql('Head of Testing');
                });
            member = await models.Member.findOne({id: member.id}, {require: true});
            member.get('expertise').should.eql('Head of Testing');
        });

        it('trims whitespace from expertise', async function () {
            await membersAgent
                .put(`/api/member/`)
                .body({
                    expertise: '  test  '
                })
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot(memberMatcher(2))
                .expect(({body}) => {
                    body.email.should.eql(member.get('email'));
                    body.expertise.should.eql('test');
                });
            member = await models.Member.findOne({id: member.id}, {require: true});
            member.get('expertise').should.eql('test');
        });

        it('can update name', async function () {
            await membersAgent
                .put(`/api/member/`)
                .body({
                    name: 'Test User'
                })
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot(memberMatcher(2))
                .expect(({body}) => {
                    body.email.should.eql(member.get('email'));
                    body.name.should.eql('Test User');
                    body.firstname.should.eql('Test');
                });
            member = await models.Member.findOne({id: member.id}, {require: true});
            member.get('name').should.eql('Test User');
        });

        it('can update comment notifications', async function () {
            member.get('enable_comment_notifications').should.eql(true, 'This test requires the initial value to be true');

            // Via general way
            await membersAgent
                .put(`/api/member/`)
                .body({
                    enable_comment_notifications: false
                })
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot(memberMatcher(2))
                .expect(({body}) => {
                    body.email.should.eql(member.get('email'));
                    body.enable_comment_notifications.should.eql(false);
                });
            member = await models.Member.findOne({id: member.id}, {require: true});
            member.get('enable_comment_notifications').should.eql(false);

            // Via updateMemberNewsletters
            await membersAgent
                .put(`/api/member/newsletters/?uuid=${member.get('uuid')}`)
                .body({
                    enable_comment_notifications: true
                })
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot(memberMatcherUnserialised(2))
                .expect(({body}) => {
                    body.email.should.eql(member.get('email'));
                    body.enable_comment_notifications.should.eql(true);
                });
            member = await models.Member.findOne({id: member.id}, {require: true});
            member.get('enable_comment_notifications').should.eql(true);
        });

        it('can remove a member\'s email from the suppression list', async function () {
            // add member's email to the suppression list
            await models.Suppression.add({
                email: member.get('email'),
                reason: 'bounce'
            });

            // disable member's email
            await member.save({email_disabled: true});

            // remove suppression
            await membersAgent
                .delete(`/api/member/suppression`)
                .expectStatus(204)
                .expectEmptyBody();

            // check that member is removed from suppression list
            const suppression = await models.Suppression.findOne({email: member.get('email')});

            should(suppression).be.null();

            // check that member's email is enabled
            await member.refresh();

            should(member.get('email_disabled')).be.false();
        });
    });
});
