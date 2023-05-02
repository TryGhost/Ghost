const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../../utils');
const localUtils = require('./utils');
const configUtils = require('../../../utils/configUtils');
const config = require('../../../../core/shared/config');

let request;

describe('api/endpoints/content/pages', function () {
    const key = localUtils.getValidKey();

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await testUtils.initFixtures('users', 'user:inactive', 'posts', 'tags:extra', 'api_keys');
    });

    afterEach(async function () {
        await configUtils.restore();
    });

    it('can not filter pages by author.password or authors.password', async function () {
        const hashedPassword = '$2a$10$FxFlCsNBgXw42cBj0l1GFu39jffibqTqyAGBz7uCLwetYAdBYJEe6';
        const userId = '644fd18ca1f0b764b0279b2d';

        await testUtils.knex('users').insert({
            id: userId,
            slug: 'brute-force-password-test-user',
            name: 'Brute Force Password Test User',
            email: 'bruteforcepasswordtestuseremail@example.com',
            password: hashedPassword,
            status: 'active',
            created_at: '2019-01-01 00:00:00',
            created_by: '1'
        });

        const {id: postId} = await testUtils.knex('posts').first('id').where('type', 'page');

        await testUtils.knex('posts_authors').insert({
            id: '644fd18ca1f0b764b0279b2f',
            post_id: postId,
            author_id: userId
        });

        const res = await request.get(localUtils.API.getApiQuery(`pages/?key=${key}&filter=authors.password:'${hashedPassword}'`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200);

        const data = JSON.parse(res.text);

        await testUtils.knex('posts_authors').where('id', '644fd18ca1f0b764b0279b2f').del();
        await testUtils.knex('users').where('id', userId).del();

        if (data.pages.length === 1) {
            throw new Error('fuck');
        }
    });

    it('can not filter pages by author.email or authors.email', async function () {
        const hashedPassword = '$2a$10$FxFlCsNBgXw42cBj0l1GFu39jffibqTqyAGBz7uCLwetYAdBYJEe6';
        const userEmail = 'bruteforcepasswordtestuseremail@example.com';
        const userId = '644fd18ca1f0b764b0279b2d';

        await testUtils.knex('users').insert({
            id: userId,
            slug: 'brute-force-password-test-user',
            name: 'Brute Force Password Test User',
            email: userEmail,
            password: hashedPassword,
            status: 'active',
            created_at: '2019-01-01 00:00:00',
            created_by: '1'
        });

        const {id: postId} = await testUtils.knex('posts').first('id').where('type', 'page');

        await testUtils.knex('posts_authors').insert({
            id: '644fd18ca1f0b764b0279b2f',
            post_id: postId,
            author_id: userId
        });

        const res = await request.get(localUtils.API.getApiQuery(`pages/?key=${key}&filter=authors.email:'${userEmail}'`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200);

        const data = JSON.parse(res.text);

        await testUtils.knex('posts_authors').where('id', '644fd18ca1f0b764b0279b2f').del();
        await testUtils.knex('users').where('id', userId).del();

        if (data.pages.length === 1) {
            throw new Error('fuck');
        }
    });

    it('Returns a validation error when unsupported "page" filter is used', function () {
        return request.get(localUtils.API.getApiQuery(`pages/?key=${key}&filter=page:false`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(400);
    });

    it('browse pages with slug filter, should order in slug order', function () {
        return request.get(localUtils.API.getApiQuery(`pages/?key=${key}&filter=slug:[static-page-test]`))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200)
            .then((res) => {
                const jsonResponse = res.body;

                jsonResponse.pages.should.be.an.Array().with.lengthOf(1);
                jsonResponse.pages[0].slug.should.equal('static-page-test');
            });
    });

    it('can\'t read post', function () {
        return request
            .get(localUtils.API.getApiQuery(`pages/${testUtils.DataGenerator.Content.posts[0].id}/?key=${key}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.noCache)
            .expect(404);
    });
});
