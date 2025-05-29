const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyContentLength, anyContentVersion, anyEtag, anyErrorId, stringMatching} = matchers;
const fs = require('fs-extra');
const sinon = require('sinon');
const assert = require('assert/strict');

describe('Backup Integration', function () {
    let agent, fsStub;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users', 'members');
    });

    beforeEach(function () {
        fsStub = sinon.stub(fs, 'writeFile').resolves();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('Backup API', function () {
        describe('Backup Integration', function () {
            before(async function () {
                await agent.useBackupAdminAPIKey();
            });

            it('Can create a DB backup', async function () {
                await agent
                    .post('db/backup?filename=test')
                    .expectStatus(200)
                    .matchHeaderSnapshot({
                        'content-length': anyContentLength,
                        'content-version': anyContentVersion,
                        etag: anyEtag
                    })
                    .matchBodySnapshot({
                        db: [{
                            filename: stringMatching(/ghost-test\/data\/test\.json$/)
                        }]
                    });

                sinon.assert.calledOnce(fsStub);
                const args = fsStub.firstCall.args;
                const fileJSON = JSON.parse(args[1]);

                assert.match(args[0].toString(), /ghost-test\/data\/test.json$/);
                // @TODO: make a way do this with snapshots!
                assert.ok(fileJSON.meta, 'Written file has a property called meta');
                assert.ok(fileJSON.data, 'Written file has a property called data');
            });

            it('Can export members CSV', async function () {
                await agent
                    .get('members/upload/?limit=all')
                    .expectStatus(200)
                    .expectEmptyBody()
                    .matchHeaderSnapshot({
                        'content-version': anyContentVersion,
                        'content-disposition': stringMatching(/attachment; filename="members\./)
                    })
                    .expect(({text}) => {
                        assert.match(text, /id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers/);
                    });
            });
        });

        describe('Zapier Integration', function () {
            before(async function () {
                await agent.useZapierAdminAPIKey();
            });

            it('Cannot create a DB backup', async function () {
                await agent
                    .post('db/backup?filename=test')
                    .expectStatus(403)
                    .matchHeaderSnapshot({
                        'content-length': anyContentLength,
                        'content-version': anyContentVersion,
                        etag: anyEtag
                    })
                    .matchBodySnapshot({
                        errors: [{
                            id: anyErrorId
                        }]
                    });
            });

            it('Can export members CSV', async function () {
                await agent
                    .get('members/upload/?limit=all')
                    .expectStatus(200)
                    .expectEmptyBody()
                    .matchHeaderSnapshot({
                        'content-version': anyContentVersion,
                        'content-disposition': stringMatching(/attachment; filename="members\./)
                    })
                    .expect(({text}) => {
                        assert.match(text, /id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers/);
                    });
            });
        });

        describe('Owner: User authentication', function () {
            before(async function () {
                await agent.loginAsOwner();
            });

            it('Can create a DB backup', async function () {
                await agent
                    .post('db/backup?filename=test')
                    .expectStatus(200)
                    .matchHeaderSnapshot({
                        'content-length': anyContentLength,
                        'content-version': anyContentVersion,
                        etag: anyEtag
                    })
                    .matchBodySnapshot({
                        db: [{
                            filename: stringMatching(/ghost-test\/data\/test\.json$/)
                        }]
                    });

                sinon.assert.calledOnce(fsStub);
                const args = fsStub.firstCall.args;
                const fileJSON = JSON.parse(args[1]);

                assert.match(args[0].toString(), /ghost-test\/data\/test.json$/);
                // @TODO: make a way do this with snapshots!
                assert.ok(fileJSON.meta, 'Written file has a property called meta');
                assert.ok(fileJSON.data, 'Written file has a property called data');
            });

            it('Can export members CSV', async function () {
                await agent
                    .get('members/upload/?limit=all')
                    .expectStatus(200)
                    .expectEmptyBody()
                    .matchHeaderSnapshot({
                        'content-version': anyContentVersion,
                        'content-disposition': stringMatching(/attachment; filename="members\./)
                    })
                    .expect(({text}) => {
                        assert.match(text, /id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers/);
                    });
            });
        });

        describe('Editor: User authentication', function () {
            before(async function () {
                await agent.loginAsEditor();
            });

            it('Cannot create a DB backup', async function () {
                await agent.post('db/backup?filename=test')
                    .expectStatus(403)
                    .matchHeaderSnapshot({
                        'content-version': anyContentVersion,
                        etag: anyEtag
                    })
                    .matchBodySnapshot({
                        errors: [{
                            id: anyErrorId
                        }]
                    });
            });

            it('Cannot export members CSV', async function () {
                await agent
                    .get('members/upload/?limit=all')
                    .expectStatus(403)
                    .matchHeaderSnapshot({
                        'content-version': anyContentVersion,
                        etag: anyEtag
                    })
                    .matchBodySnapshot({
                        errors: [{
                            id: anyErrorId
                        }]
                    });
            });
        });
    });
});
