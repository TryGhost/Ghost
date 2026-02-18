const {agentProvider, fixtureManager, matchers, mockManager} = require('../../utils/e2e-framework');
const {anyEtag, anyErrorId, anyContentVersion, anyString} = matchers;
const assert = require('node:assert/strict');
const {assertMatchSnapshot} = require('../../utils/assertions');
const config = require('../../../core/shared/config');
const sinon = require('sinon');
const escapeRegExp = require('lodash/escapeRegExp');
const settingsHelpers = require('../../../core/server/services/settings-helpers');
const urlUtilsHelper = require('../../utils/url-utils');

// @TODO: factor out these requires
const ObjectId = require('bson-objectid').default;
const testUtils = require('../../utils');
const models = require('../../../core/server/models/index');
const logging = require('@tryghost/logging');

function testCleanedSnapshot(html, cleaned) {
    for (const [key, value] of Object.entries(cleaned)) {
        html = html.replace(new RegExp(escapeRegExp(key), 'g'), value);
    }
    assertMatchSnapshot({html});
}

const matchEmailPreviewBody = {
    email_previews: [
        {
            html: anyString,
            plaintext: anyString
        }
    ]
};

describe('Email Preview API', function () {
    let agent;

    afterEach(function () {
        mockManager.restore();
        sinon.restore();
    });

    beforeEach(function () {
        mockManager.mockMailgun();
        sinon.stub(settingsHelpers, 'getMembersValidationKey').returns('test-validation-key');
        // Stub Date.getFullYear to return a fixed year for consistent snapshots
        sinon.stub(Date.prototype, 'getFullYear').returns(2025);
    });

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
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                });
        });

        it('can read post email preview with fields', async function () {
            const defaultNewsletter = await models.Newsletter.getDefaultNewsletter();
            await agent
                .get(`email_previews/posts/${fixtureManager.get('posts', 0).id}/`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot(matchEmailPreviewBody)
                .expect(({body}) => {
                    testCleanedSnapshot(body.email_previews[0].html, {
                        [defaultNewsletter.get('uuid')]: 'requested-newsletter-uuid'
                    });
                    testCleanedSnapshot(body.email_previews[0].plaintext, {
                        [defaultNewsletter.get('uuid')]: 'requested-newsletter-uuid'
                    });
                });
        });

        it('can read post email preview with email card and replacements', async function () {
            const defaultNewsletter = await models.Newsletter.getDefaultNewsletter();
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
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot(matchEmailPreviewBody)
                .expect(({body}) => {
                    testCleanedSnapshot(body.email_previews[0].html, {
                        [defaultNewsletter.get('uuid')]: 'requested-newsletter-uuid'
                    });
                    testCleanedSnapshot(body.email_previews[0].plaintext, {
                        [defaultNewsletter.get('uuid')]: 'requested-newsletter-uuid'
                    });
                });
        });

        it('has custom content transformations for email compatibility', async function () {
            const defaultNewsletter = await models.Newsletter.getDefaultNewsletter();
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
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot(matchEmailPreviewBody)
                .expect(({body}) => {
                    // Extra assert to ensure apostrophe is transformed
                    assert.doesNotMatch(body.email_previews[0].html, /Testing links in email excerpt and apostrophes &apos;/);
                    assert.match(body.email_previews[0].html, /Testing links in email excerpt and apostrophes &#39;/);

                    testCleanedSnapshot(body.email_previews[0].html, {
                        [defaultNewsletter.get('uuid')]: 'requested-newsletter-uuid'
                    });
                    testCleanedSnapshot(body.email_previews[0].plaintext, {
                        [defaultNewsletter.get('uuid')]: 'requested-newsletter-uuid'
                    });
                });
        });

        it('uses the posts newsletter by default', async function () {
            const defaultNewsletter = await models.Newsletter.getDefaultNewsletter();
            const selectedNewsletter = fixtureManager.get('newsletters', 0);
            assert.notEqual(
                defaultNewsletter.id,
                selectedNewsletter.id,
                'Should use a non-default newsletter for this test'
            );

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
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot(matchEmailPreviewBody)
                .expect(({body}) => {
                    // Extra assert to ensure newsletter is correct
                    assert.doesNotMatch(body.email_previews[0].html, new RegExp(defaultNewsletter.get('name')));
                    assert.match(body.email_previews[0].html, new RegExp(selectedNewsletter.name));
                    testCleanedSnapshot(body.email_previews[0].html, {
                        [selectedNewsletter.uuid]: 'requested-newsletter-uuid'
                    });
                    testCleanedSnapshot(body.email_previews[0].plaintext, {
                        [selectedNewsletter.uuid]: 'requested-newsletter-uuid'
                    });
                });
        });

        it('uses the newsletter provided through ?newsletter=slug', async function () {
            const defaultNewsletter = await models.Newsletter.getDefaultNewsletter();
            const selectedNewsletter = fixtureManager.get('newsletters', 0);

            assert.notEqual(
                selectedNewsletter.id,
                defaultNewsletter.id,
                'Should use a non-default newsletter for this test'
            );

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
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot(matchEmailPreviewBody)
                .expect(({body}) => {
                    // Extra assert to ensure newsletter is correct
                    assert.doesNotMatch(body.email_previews[0].html, new RegExp(defaultNewsletter.get('name')));
                    assert.match(body.email_previews[0].html, new RegExp(selectedNewsletter.name));
                    testCleanedSnapshot(body.email_previews[0].html, {
                        [selectedNewsletter.uuid]: 'requested-newsletter-uuid'
                    });
                    testCleanedSnapshot(body.email_previews[0].plaintext, {
                        [selectedNewsletter.uuid]: 'requested-newsletter-uuid'
                    });
                });
        });

        it('Mobiledoc post email preview renders with all URLs as absolute site URLs', async function () {
            const siteUrl = config.get('url');
            const post = await models.Post.findOne({slug: 'post-with-all-media-types-mobiledoc'});

            await agent
                .get(`email_previews/posts/${post.id}/`)
                .expectStatus(200)
                .expect(({body}) => {
                    const html = body.email_previews[0].html;
                    assert(html.includes(`${siteUrl}/content/images/feature.jpg`));
                    assert(html.includes(`${siteUrl}/content/images/inline.jpg`));
                    assert(html.includes(`${siteUrl}/content/images/gallery-1.jpg`));
                    assert(html.includes(`${siteUrl}/content/images/video-thumb.jpg`));
                    assert(html.includes(`${siteUrl}/content/images/audio-thumb.jpg`));
                    assert(html.includes(`${siteUrl}/content/images/snippet-inline.jpg`));
                    assert(html.includes(`${siteUrl}/content/images/snippet-video-thumb.jpg`));
                    assert(html.includes(`${siteUrl}/content/images/snippet-audio-thumb.jpg`));
                    assert(!html.includes('__GHOST_URL__'));
                });
        });

        it('Lexical post email preview renders with all URLs as absolute site URLs', async function () {
            const siteUrl = config.get('url');
            const post = await models.Post.findOne({slug: 'post-with-all-media-types-lexical'});

            await agent
                .get(`email_previews/posts/${post.id}/`)
                .expectStatus(200)
                .expect(({body}) => {
                    const html = body.email_previews[0].html;
                    assert(html.includes(`${siteUrl}/content/images/feature.jpg`));
                    assert(html.includes(`${siteUrl}/content/images/inline.jpg`));
                    assert(html.includes(`${siteUrl}/content/images/gallery-1.jpg`));
                    assert(html.includes(`${siteUrl}/content/images/video-thumb.jpg`));
                    assert(html.includes(`${siteUrl}/content/images/audio-thumb.jpg`));
                    assert(html.includes(`${siteUrl}/content/images/snippet-inline.jpg`));
                    assert(html.includes(`${siteUrl}/content/images/snippet-video-thumb.jpg`));
                    assert(html.includes(`${siteUrl}/content/images/snippet-audio-thumb.jpg`));
                    assert(!html.includes('__GHOST_URL__'));
                });
        });

        it('Mobiledoc post email preview renders with CDN URLs when configured', async function () {
            const cdnUrl = 'https://cdn.example.com/c/site-uuid';
            urlUtilsHelper.stubUrlUtilsWithCdn({
                assetBaseUrls: {media: cdnUrl, files: cdnUrl, image: cdnUrl}
            }, sinon);

            const post = await models.Post.findOne({slug: 'post-with-all-media-types-mobiledoc'});

            await agent
                .get(`email_previews/posts/${post.id}/`)
                .expectStatus(200)
                .expect(({body}) => {
                    const html = body.email_previews[0].html;
                    assert(html.includes(`${cdnUrl}/content/images/feature.jpg`));
                    assert(html.includes(`${cdnUrl}/content/images/inline.jpg`));
                    assert(html.includes(`${cdnUrl}/content/images/gallery-1.jpg`));
                    assert(html.includes(`${cdnUrl}/content/images/video-thumb.jpg`));
                    assert(html.includes(`${cdnUrl}/content/images/audio-thumb.jpg`));
                    assert(html.includes(`${cdnUrl}/content/images/snippet-inline.jpg`));
                    assert(html.includes(`${cdnUrl}/content/images/snippet-video-thumb.jpg`));
                    assert(html.includes(`${cdnUrl}/content/images/snippet-audio-thumb.jpg`));
                    assert(!html.includes('__GHOST_URL__'));
                });
        });

        it('Lexical post email preview renders with CDN URLs when configured', async function () {
            const cdnUrl = 'https://cdn.example.com/c/site-uuid';
            urlUtilsHelper.stubUrlUtilsWithCdn({
                assetBaseUrls: {media: cdnUrl, files: cdnUrl, image: cdnUrl}
            }, sinon);

            const post = await models.Post.findOne({slug: 'post-with-all-media-types-lexical'});

            await agent
                .get(`email_previews/posts/${post.id}/`)
                .expectStatus(200)
                .expect(({body}) => {
                    const html = body.email_previews[0].html;
                    assert(html.includes(`${cdnUrl}/content/images/feature.jpg`));
                    assert(html.includes(`${cdnUrl}/content/images/inline.jpg`));
                    assert(html.includes(`${cdnUrl}/content/images/gallery-1.jpg`));
                    assert(html.includes(`${cdnUrl}/content/images/video-thumb.jpg`));
                    assert(html.includes(`${cdnUrl}/content/images/audio-thumb.jpg`));
                    assert(html.includes(`${cdnUrl}/content/images/snippet-inline.jpg`));
                    assert(html.includes(`${cdnUrl}/content/images/snippet-video-thumb.jpg`));
                    assert(html.includes(`${cdnUrl}/content/images/snippet-audio-thumb.jpg`));
                    assert(!html.includes('__GHOST_URL__'));
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
                    'content-version': anyContentVersion,
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
                    'content-version': anyContentVersion,
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
                    'content-version': anyContentVersion,
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
            const loggingStub = sinon.stub(logging, 'error');
            await agent
                .post(`email_previews/posts/${fixtureManager.get('posts', 0).id}/`)
                .body({
                    emails: ['test@ghost.org']
                })
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
            sinon.assert.calledOnce(loggingStub);
        });
    });

    describe('As Contributor', function () {
        before(async function () {
            await agent.loginAsContributor();
        });

        it('cannot send test email', async function () {
            const loggingStub = sinon.stub(logging, 'error');
            await agent
                .post(`email_previews/posts/${fixtureManager.get('posts', 0).id}/`)
                .body({
                    emails: ['test@ghost.org']
                })
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
            sinon.assert.calledOnce(loggingStub);
        });
    });
});
