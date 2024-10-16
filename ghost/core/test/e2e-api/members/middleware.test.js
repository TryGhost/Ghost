const crypto = require('crypto');
const {agentProvider, mockManager, fixtureManager, matchers, configUtils} = require('../../utils/e2e-framework');
const {anyEtag, anyObjectId, anyUuid, anyISODateTime, stringMatching} = matchers;
const models = require('../../../core/server/models');
const should = require('should');
const sinon = require('sinon');
const settingsHelpers = require('../../../core/server/services/settings-helpers');

let membersAgent;

const memberMatcher = (newslettersCount) => {
    return {
        uuid: anyUuid,
        // @NOTE: check if this field is even needed? it differs to the output in the other matcher
        created_at: anyISODateTime,
        newsletters: new Array(newslettersCount).fill(
            {
                id: anyObjectId,
                uuid: anyUuid
            }
        )
    };
};

const buildMemberMatcher = (newslettersCount) => {
    return {
        uuid: anyUuid,
        newsletters: new Array(newslettersCount).fill(
            {
                id: anyObjectId,
                uuid: anyUuid
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
        sinon.stub(settingsHelpers, 'createUnsubscribeUrl').returns('http://domain.com/unsubscribe/?uuid=memberuuid&key=abc123dontstealme');
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

            sinon.stub(settingsHelpers, 'getMembersValidationKey').returns('test');
            const hmac = crypto.createHmac('sha256', 'test').update(member.get('uuid')).digest('hex');

            await membersAgent
                .put(`/api/member/newsletters/?uuid=${member.get('uuid')}&key=${hmac}`)
                .body({
                    enable_comment_notifications: false
                })
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot(buildMemberMatcher(1))
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

            sinon.stub(settingsHelpers, 'getMembersValidationKey').returns('test');
            const hmac = crypto.createHmac('sha256', 'test').update(member.get('uuid')).digest('hex');

            // Via updateMemberNewsletters
            await membersAgent
                .put(`/api/member/newsletters/?uuid=${member.get('uuid')}&key=${hmac}`)
                .body({
                    enable_comment_notifications: true
                })
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot(buildMemberMatcher(2))
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

    describe('when caching members content is enabled', function () {
        it('sets ghost-access and ghost-access-hmac cookies', async function () {
            configUtils.set('cacheMembersContent:enabled', true);
            configUtils.set('cacheMembersContent:hmacSecret', crypto.randomBytes(64).toString('base64'));
            membersAgent = await agentProvider.getMembersAPIAgent();
            await fixtureManager.init('newsletters', 'members:newsletters');
            await membersAgent.loginAs('member@example.com');
            const member = await models.Member.findOne({email: 'member@example.com'}, {require: true});
            await membersAgent
                .get(`/api/member/`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    'set-cookie': [
                        stringMatching(/^ghost-access=[0-9a-fA-F]{24}:\d{10}/),
                        stringMatching(/^ghost-access-hmac=[a-fA-F0-9]{64}/)
                    ]
                })
                .matchBodySnapshot(memberMatcher(2))
                .expect(({body}) => {
                    body.email.should.eql(member.get('email'));
                });
        });

        it('does not set ghost-access and ghost-access-hmac cookies when not authenticated', async function () {
            configUtils.set('cacheMembersContent:enabled', true);
            configUtils.set('cacheMembersContent:hmacSecret', crypto.randomBytes(64).toString('base64'));
            membersAgent = await agentProvider.getMembersAPIAgent();
            await fixtureManager.init('newsletters', 'members:newsletters');
            await membersAgent
                .get(`/api/member/`)
                .expectStatus(204)
                .expectEmptyBody()
                .expect(({headers}) => {
                    should.not.exist(headers['set-cookie']);
                });
        });

        it('sets ghost-access and ghost-access-hmac cookies to null when not authenticated but a cookie is sent', async function () {
            // This is to ensure that the cookies are reset when a user logs out
            configUtils.set('cacheMembersContent:enabled', true);
            configUtils.set('cacheMembersContent:hmacSecret', crypto.randomBytes(64).toString('base64'));
            membersAgent = await agentProvider.getMembersAPIAgent();
            await fixtureManager.init('newsletters', 'members:newsletters');
            // Send a ghost-access cookie but without a valid member session
            await membersAgent.jar.setCookie('ghost-access=fake;');
            await membersAgent
                .get('/api/member/')
                .expect(({headers}) => {
                    should.exist(headers['set-cookie']);
                    headers['set-cookie'].should.matchAny(/ghost-access=null;/);
                })
                .expectStatus(204)
                .expectEmptyBody();
        });
    });
});
