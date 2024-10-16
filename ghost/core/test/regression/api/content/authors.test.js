const should = require('should');
const supertest = require('supertest');
const localUtils = require('./utils');
const testUtils = require('../../../utils');
const configUtils = require('../../../utils/configUtils');
const config = require('../../../../core/shared/config');

describe('Authors Content API', function () {
    const validKey = localUtils.getValidKey();
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await testUtils.initFixtures('owner:post', 'users', 'user:inactive', 'posts', 'api_keys');
    });

    afterEach(async function () {
        await configUtils.restore();
    });

    it('can not filter authors by password', async function () {
        const hashedPassword = '$2a$10$FxFlCsNBgXw42cBj0l1GFu39jffibqTqyAGBz7uCLwetYAdBYJEe6';
        const userId = '644fd18ca1f0b764b0279b2d';

        await testUtils.knex('users').insert({
            id: userId,
            slug: 'brute-force-password-test-user',
            name: 'Brute Force Password Test User',
            email: 'bruteforcepasswordtestuser@example.com',
            password: hashedPassword,
            status: 'active',
            created_at: '2019-01-01 00:00:00',
            created_by: '1'
        });

        const {id: postId} = await testUtils.knex('posts').first('id').where('slug', 'welcome');

        await testUtils.knex('posts_authors').insert({
            id: '644fd18ca1f0b764b0279b2f',
            post_id: postId,
            author_id: userId
        });

        const res = await request.get(localUtils.API.getApiQuery(`authors/?key=${validKey}&filter=password:'${hashedPassword}'`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200);

        const data = JSON.parse(res.text);

        await testUtils.knex('posts_authors').where('id', '644fd18ca1f0b764b0279b2f').del();
        await testUtils.knex('users').where('id', userId).del();

        if (data.authors.length === 1) {
            throw new Error('fuck');
        }
    });

    it('can not filter authors by email', async function () {
        const hashedPassword = '$2a$10$FxFlCsNBgXw42cBj0l1GFu39jffibqTqyAGBz7uCLwetYAdBYJEe6';
        const userEmail = 'bruteforcepasswordtestuser@example.com';
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

        const {id: postId} = await testUtils.knex('posts').first('id').where('slug', 'welcome');

        await testUtils.knex('posts_authors').insert({
            id: '644fd18ca1f0b764b0279b2f',
            post_id: postId,
            author_id: userId
        });

        const res = await request.get(localUtils.API.getApiQuery(`authors/?key=${validKey}&filter=email:'${userEmail}'`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200);

        const data = JSON.parse(res.text);

        await testUtils.knex('posts_authors').where('id', '644fd18ca1f0b764b0279b2f').del();
        await testUtils.knex('users').where('id', userId).del();

        if (data.authors.length === 1) {
            throw new Error('fuck');
        }
    });

    it('can read authors with fields', function () {
        return request.get(localUtils.API.getApiQuery(`authors/1/?key=${validKey}&fields=name`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);

                // We don't expose any other attrs.
                localUtils.API.checkResponse(res.body.authors[0], 'author', null, null, ['id', 'name']);
            });
    });

    it('browse authors with slug filter, should order in slug order', function () {
        return request.get(localUtils.API.getApiQuery(`authors/?key=${validKey}&filter=slug:[joe-bloggs,ghost,slimer-mcectoplasm]`))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200)
            .then((res) => {
                const jsonResponse = res.body;

                jsonResponse.authors.should.be.an.Array().with.lengthOf(3);
                jsonResponse.authors[0].slug.should.equal('joe-bloggs');
                jsonResponse.authors[1].slug.should.equal('ghost');
                jsonResponse.authors[2].slug.should.equal('slimer-mcectoplasm');
            });
    });
});
