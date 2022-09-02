const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyErrorId} = matchers;
const assert = require('assert');

// @TODO: factor out these requires
const ObjectId = require('bson-objectid');
const testUtils = require('../../utils');
const models = require('../../../core/server/models/index');

describe('Email Preview API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users', 'newsletters', 'posts');
        await agent.loginAsOwner();
    });

    describe('Read', function () {
        it('can\'t retrieve for non existent post', async function () {
            await agent.get('email_previews/posts/abcd1234abcd1234abcd1234/')
                .expectStatus(404)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                });
        });

        it('can read post email preview with fields', async function () {
            await agent
                .get(`email_previews/posts/${fixtureManager.get('posts', 0).id}/`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot();
        });

        it('can read post email preview with email card and replacements', async function () {
            const post = testUtils.DataGenerator.forKnex.createPost({
                id: ObjectId().toHexString(),
                title: 'Post with email-only card',
                slug: 'email-only-card',
                mobiledoc: '{"version":"0.3.1","atoms":[],"cards":[["email",{"html":"<p>Hey {first_name \\"there\\"} {unknown}</p><p><strong>Welcome to your first Ghost email!</strong></p>"}],["email",{"html":"<p>Another email card with a similar replacement, {first_name, \\"see?\\"}</p>"}]],"markups":[],"sections":[[10,0],[1,"p",[[0,[],0,"This is the actual post content..."]]],[10,1],[1,"p",[]]]}',
                html: '<p>This is the actual post content...</p>',
                plaintext: 'This is the actual post content...',
                status: 'draft',
                uuid: 'd52c42ae-2755-455c-80ec-70b2ec55c904',
                published_at: new Date(0)
            });

            await models.Post.add(post, {context: {internal: true}});

            await agent
                .get(`email_previews/posts/${post.id}/`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot();
        });

        it('has custom content transformations for email compatibility', async function () {
            const post = testUtils.DataGenerator.forKnex.createPost({
                id: ObjectId().toHexString(),
                title: 'Post with email-only card',
                slug: 'email-only-card',
                mobiledoc: '{"version":"0.3.1","atoms":[],"cards":[],"markups":[["a",["href","https://ghost.org"]]],"sections":[[1,"p",[[0,[],0,"Testing "],[0,[0],1,"links"],[0,[],0," in email excerpt and apostrophes \'"]]]]}',
                html: '<p>This is the actual post content...</p>',
                plaintext: 'This is the actual post content...',
                status: 'draft',
                uuid: 'd52c42ae-2755-455c-80ec-70b2ec55c904',
                published_at: new Date(0)
            });

            await models.Post.add(post, {context: {internal: true}});

            await agent
                .get(`email_previews/posts/${post.id}/`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot()
                .expect(({body}) => {
                    // Extra assert to ensure apostrophe is transformed
                    assert.doesNotMatch(body.email_previews[0].html, /Testing links in email excerpt and apostrophes &apos;/);
                    assert.match(body.email_previews[0].html, /Testing links in email excerpt and apostrophes &#39;/);
                });
        });

        it('uses the posts newsletter by default', async function () {
            const defaultNewsletter = await models.Newsletter.getDefaultNewsletter();
            const selectedNewsletter = fixtureManager.get('newsletters', 0);
            defaultNewsletter.id.should.not.eql(selectedNewsletter.id, 'Should use a non-default newsletter for this test');

            const post = testUtils.DataGenerator.forKnex.createPost({
                id: ObjectId().toHexString(),
                title: 'Post with email-only card',
                slug: 'email-only-card',
                mobiledoc: '{"version":"0.3.1","atoms":[],"cards":[],"markups":[["a",["href","https://ghost.org"]]],"sections":[[1,"p",[[0,[],0,"Testing "],[0,[0],1,"links"],[0,[],0," in email excerpt and apostrophes \'"]]]]}',
                html: '<p>This is the actual post content...</p>',
                plaintext: 'This is the actual post content...',
                status: 'scheduled',
                uuid: 'd52c42ae-2755-455c-80ec-70b2ec55c904',
                newsletter_id: selectedNewsletter.id,
                published_at: new Date(0)
            });

            await models.Post.add(post, {context: {internal: true}});

            await agent
                .get(`email_previews/posts/${post.id}/`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot()
                .expect(({body}) => {
                    // Extra assert to ensure newsletter is correct
                    assert.doesNotMatch(body.email_previews[0].html, new RegExp(defaultNewsletter.get('name')));
                    assert.match(body.email_previews[0].html, new RegExp(selectedNewsletter.name));
                });
        });

        it('uses the newsletter provided through ?newsletter=slug', async function () {
            const defaultNewsletter = await models.Newsletter.getDefaultNewsletter();
            const selectedNewsletter = fixtureManager.get('newsletters', 0);

            selectedNewsletter.id.should.not.eql(defaultNewsletter.id, 'Should use a non-default newsletter for this test');

            const post = testUtils.DataGenerator.forKnex.createPost({
                id: ObjectId().toHexString(),
                title: 'Post with email-only card',
                slug: 'email-only-card',
                mobiledoc: '{"version":"0.3.1","atoms":[],"cards":[],"markups":[["a",["href","https://ghost.org"]]],"sections":[[1,"p",[[0,[],0,"Testing "],[0,[0],1,"links"],[0,[],0," in email excerpt and apostrophes \'"]]]]}',
                html: '<p>This is the actual post content...</p>',
                plaintext: 'This is the actual post content...',
                status: 'draft',
                uuid: 'd52c42ae-2755-455c-80ec-70b2ec55c904',
                published_at: new Date(0)
            });

            await models.Post.add(post, {context: {internal: true}});

            await agent
                .get(`email_previews/posts/${post.id}/?newsletter=${selectedNewsletter.slug}`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot()
                .expect(({body}) => {
                    // Extra assert to ensure newsletter is correct
                    assert.doesNotMatch(body.email_previews[0].html, new RegExp(defaultNewsletter.get('name')));
                    assert.match(body.email_previews[0].html, new RegExp(selectedNewsletter.name));
                });
        });
    });

    describe('As Owner', function () {
        it('can send test email', async function () {
            await agent
                .post(`email_previews/posts/${fixtureManager.get('posts', 0).id}/`)
                .body({
                    emails: ['test@ghost.org']
                })
                .expectStatus(204)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .expectEmptyBody();
        });
    });

    describe('As Admin', function () {
        before(async function () {
            await agent.loginAsAdmin();
        });

        it('can send test email', async function () {
            await agent
                .post(`email_previews/posts/${fixtureManager.get('posts', 0).id}/`)
                .body({
                    emails: ['test@ghost.org']
                })
                .expectStatus(204)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .expectEmptyBody();
        });
    });

    describe('As Editor', function () {
        before(async function () {
            await agent.loginAsEditor();
        });

        it('can send test email', async function () {
            await agent
                .post(`email_previews/posts/${fixtureManager.get('posts', 0).id}/`)
                .body({
                    emails: ['test@ghost.org']
                })
                .expectStatus(204)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .expectEmptyBody();
        });
    });

    describe('As Author', function () {
        before(async function () {
            await agent.loginAsAuthor();
        });

        it('cannot send test email', async function () {
            await agent
                .post(`email_previews/posts/${fixtureManager.get('posts', 0).id}/`)
                .body({
                    emails: ['test@ghost.org']
                })
                .expectStatus(403)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                });
        });
    });

    describe('As Contributor', function () {
        before(async function () {
            await agent.loginAsContributor();
        });

        it('cannot send test email', async function () {
            await agent
                .post(`email_previews/posts/${fixtureManager.get('posts', 0).id}/`)
                .body({
                    emails: ['test@ghost.org']
                })
                .expectStatus(403)
                .matchHeaderSnapshot({
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
