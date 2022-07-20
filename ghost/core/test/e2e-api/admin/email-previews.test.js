const should = require('should');
const supertest = require('supertest');
const ObjectId = require('bson-objectid');
const testUtils = require('../../utils');
const localUtils = require('./utils');
const config = require('../../../core/shared/config');
const models = require('../../../core/server/models/index');

describe('Email Preview API', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request, 'users:extra', 'newsletters', 'posts');
    });

    describe('Read', function () {
        it('can\'t retrieve for non existent post', async function () {
            const res = await request.get(localUtils.API.getApiQuery(`email_previews/posts/${ObjectId().toHexString()}/`))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404);

            should.not.exist(res.headers['x-cache-invalidate']);
            const jsonResponse = res.body;
            should.exist(jsonResponse);
            should.exist(jsonResponse.errors);
            testUtils.API.checkResponseValue(jsonResponse.errors[0], [
                'message',
                'context',
                'type',
                'details',
                'property',
                'help',
                'code',
                'id',
                'ghostErrorCode'
            ]);
        });

        it('can read post email preview with fields', async function () {
            const res = await request
                .get(localUtils.API.getApiQuery(`email_previews/posts/${testUtils.DataGenerator.Content.posts[0].id}/`))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            should.not.exist(res.headers['x-cache-invalidate']);
            const jsonResponse = res.body;
            should.exist(jsonResponse);
            should.exist(jsonResponse.email_previews);

            localUtils.API.checkResponse(jsonResponse.email_previews[0], 'email_previews', null, null);
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
                uuid: 'd52c42ae-2755-455c-80ec-70b2ec55c904'
            });

            await models.Post.add(post, {context: {internal: true}});
            const res = await request
                .get(localUtils.API.getApiQuery(`email_previews/posts/${post.id}/`))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            should.not.exist(res.headers['x-cache-invalidate']);
            const jsonResponse = res.body;
            should.exist(jsonResponse);
            should.exist(jsonResponse.email_previews);

            jsonResponse.email_previews[0].html.should.match(/Hey there {unknown}/);
            jsonResponse.email_previews[0].html.should.match(/Welcome to your first Ghost email!/);
            jsonResponse.email_previews[0].html.should.match(/This is the actual post content\.\.\./);
            jsonResponse.email_previews[0].html.should.match(/Another email card with a similar replacement, see\?/);

            jsonResponse.email_previews[0].plaintext.should.match(/Hey there {unknown}/);
            jsonResponse.email_previews[0].plaintext.should.match(/Welcome to your first Ghost email!/);
            jsonResponse.email_previews[0].plaintext.should.match(/This is the actual post content\.\.\./);
            jsonResponse.email_previews[0].plaintext.should.match(/Another email card with a similar replacement, see\?/);
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
                uuid: 'd52c42ae-2755-455c-80ec-70b2ec55c904'
            });

            await models.Post.add(post, {context: {internal: true}});

            const res = await request
                .get(localUtils.API.getApiQuery(`email_previews/posts/${post.id}/`))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            should.not.exist(res.headers['x-cache-invalidate']);
            const jsonResponse = res.body;
            should.exist(jsonResponse);
            should.exist(jsonResponse.email_previews);

            const [preview] = jsonResponse.email_previews;

            preview.html.should.containEql('Testing links in email excerpt');

            preview.html.should.match(/&#39;/);
            preview.html.should.not.match(/&apos;/);
        });

        it('uses the posts newsletter', async function () {
            const defaultNewsletter = await models.Newsletter.getDefaultNewsletter();
            defaultNewsletter.id.should.not.eql(testUtils.DataGenerator.Content.newsletters[0].id, 'Should use a non-default newsletter for this test');

            const post = testUtils.DataGenerator.forKnex.createPost({
                id: ObjectId().toHexString(),
                title: 'Post with email-only card',
                slug: 'email-only-card',
                mobiledoc: '{"version":"0.3.1","atoms":[],"cards":[],"markups":[["a",["href","https://ghost.org"]]],"sections":[[1,"p",[[0,[],0,"Testing "],[0,[0],1,"links"],[0,[],0," in email excerpt and apostrophes \'"]]]]}',
                html: '<p>This is the actual post content...</p>',
                plaintext: 'This is the actual post content...',
                status: 'scheduled',
                uuid: 'd52c42ae-2755-455c-80ec-70b2ec55c904',
                newsletter_id: testUtils.DataGenerator.Content.newsletters[0].id
            });

            await models.Post.add(post, {context: {internal: true}});

            const res = await request
                .get(localUtils.API.getApiQuery(`email_previews/posts/${post.id}/`))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            should.not.exist(res.headers['x-cache-invalidate']);
            const jsonResponse = res.body;
            should.exist(jsonResponse);
            should.exist(jsonResponse.email_previews);

            const [preview] = jsonResponse.email_previews;
            preview.html.should.containEql(testUtils.DataGenerator.Content.newsletters[0].name);
        });

        it('uses the newsletter provided through ?newsletter=slug', async function () {
            const defaultNewsletter = await models.Newsletter.getDefaultNewsletter();
            const selectedNewsletter = testUtils.DataGenerator.Content.newsletters[0];

            selectedNewsletter.id.should.not.eql(defaultNewsletter.id, 'Should use a non-default newsletter for this test');

            const post = testUtils.DataGenerator.forKnex.createPost({
                id: ObjectId().toHexString(),
                title: 'Post with email-only card',
                slug: 'email-only-card',
                mobiledoc: '{"version":"0.3.1","atoms":[],"cards":[],"markups":[["a",["href","https://ghost.org"]]],"sections":[[1,"p",[[0,[],0,"Testing "],[0,[0],1,"links"],[0,[],0," in email excerpt and apostrophes \'"]]]]}',
                html: '<p>This is the actual post content...</p>',
                plaintext: 'This is the actual post content...',
                status: 'draft',
                uuid: 'd52c42ae-2755-455c-80ec-70b2ec55c904'
            });

            await models.Post.add(post, {context: {internal: true}});

            const res = await request
                .get(localUtils.API.getApiQuery(`email_previews/posts/${post.id}/?newsletter=${selectedNewsletter.slug}`))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            should.not.exist(res.headers['x-cache-invalidate']);
            const jsonResponse = res.body;
            should.exist(jsonResponse);
            should.exist(jsonResponse.email_previews);

            const [preview] = jsonResponse.email_previews;
            preview.html.should.containEql(testUtils.DataGenerator.Content.newsletters[0].name);
        });
    });

    describe('As Owner', function () {
        it('can send test email', async function () {
            const url = localUtils.API.getApiQuery(`email_previews/posts/${testUtils.DataGenerator.Content.posts[0].id}/`);
            await request
                .post(url)
                .set('Origin', config.get('url'))
                .send({
                    emails: ['test@ghost.org']
                })
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(204)
                .expect((res) => {
                    res.body.should.be.empty();
                });
        });
    });

    describe('As Admin', function () {
        before(async function () {
            const user = await testUtils.createUser({
                user: testUtils.DataGenerator.forKnex.createUser({email: 'admin+1@ghost.org'}),
                role: testUtils.DataGenerator.Content.roles[0].name
            });

            request.user = user;
            await localUtils.doAuth(request);
        });

        it('can send test email', async function () {
            const url = localUtils.API.getApiQuery(`email_previews/posts/${testUtils.DataGenerator.Content.posts[0].id}/`);
            await request
                .post(url)
                .set('Origin', config.get('url'))
                .send({
                    emails: ['test@ghost.org']
                })
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(204)
                .expect((res) => {
                    res.body.should.be.empty();
                });
        });
    });

    describe('As Editor', function () {
        before(async function () {
            const user = await testUtils.createUser({
                user: testUtils.DataGenerator.forKnex.createUser({
                    email: 'test+editor@ghost.org'
                }),
                role: testUtils.DataGenerator.Content.roles[1].name
            });

            request.user = user;
            await localUtils.doAuth(request);
        });

        it('can send test email', async function () {
            const url = localUtils.API.getApiQuery(`email_previews/posts/${testUtils.DataGenerator.Content.posts[0].id}/`);
            await request
                .post(url)
                .set('Origin', config.get('url'))
                .send({
                    emails: ['test@ghost.org']
                })
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(204)
                .expect((res) => {
                    res.body.should.be.empty();
                });
        });
    });

    describe('As Author', function () {
        before(async function () {
            const user = await testUtils.createUser({
                user: testUtils.DataGenerator.forKnex.createUser({
                    email: 'test+author@ghost.org'
                }),
                role: testUtils.DataGenerator.Content.roles[2].name
            });

            request.user = user;
            await localUtils.doAuth(request);
        });

        it('cannot send test email', async function () {
            const url = localUtils.API.getApiQuery(`email_previews/posts/${testUtils.DataGenerator.Content.posts[0].id}/`);
            await request
                .post(url)
                .set('Origin', config.get('url'))
                .send({
                    emails: ['test@ghost.org']
                })
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(403)
                .expect((res) => {
                    res.body.should.be.an.Object().with.property('errors');
                });
        });
    });
});
