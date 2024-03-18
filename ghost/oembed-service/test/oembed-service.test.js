const assert = require('assert/strict');
const nock = require('nock');

const OembedService = require('../');

describe('oembed-service', function () {
    /** @type {OembedService} */
    let oembedService;

    before(function () {
        oembedService = new OembedService({});

        nock.disableNetConnect();
    });

    afterEach(function () {
        nock.cleanAll();
    });

    describe('known provider', function () {
        it('should return data if successful', async function () {
            nock('https://www.youtube.com')
                .get('/oembed')
                .query(true)
                .reply(200, {
                    title: 'Test Title',
                    author_name: 'Test Author',
                    author_url: 'https://www.youtube.com/user/testauthor',
                    html: '<iframe src="https://www.youtube.com/embed/1234"></iframe>'
                });

            const response = await oembedService.knownProvider('https://www.youtube.com/watch?v=1234');
            assert.equal(response.title, 'Test Title');
            assert.equal(response.author_name, 'Test Author');
            assert.equal(response.author_url, 'https://www.youtube.com/user/testauthor');
            assert.equal(response.html, '<iframe src="https://www.youtube.com/embed/1234"></iframe>');
        });

        it('should return a ValidationError if upstream 401s', async function () {
            nock('https://www.youtube.com')
                .get('/oembed')
                .query(true)
                .reply(401);

            try {
                await oembedService.knownProvider('https://www.youtube.com/watch?v=1234');
            } catch (error) {
                assert.equal(error.name, 'ValidationError');
                assert.equal(error.statusCode, 422);
                assert.equal(error.context, 'URL contains a private resource.');
            }
        });

        it('should return a ValidationError if upstream 403s', async function () {
            nock('https://www.youtube.com')
                .get('/oembed')
                .query(true)
                .reply(403);

            try {
                await oembedService.knownProvider('https://www.youtube.com/watch?v=1234');
            } catch (error) {
                assert.equal(error.name, 'ValidationError');
                assert.equal(error.statusCode, 422);
                assert.equal(error.context, 'URL contains a private resource.');
            }
        });

        it('should return a ValidationError if upstream 404s', async function () {
            nock('https://www.youtube.com')
                .get('/oembed')
                .query(true)
                .reply(404);

            try {
                await oembedService.knownProvider('https://www.youtube.com/watch?v=1234');
            } catch (error) {
                assert.equal(error.name, 'ValidationError');
                assert.equal(error.statusCode, 422);
                assert.equal(error.context, 'Request failed with error code 404');
            }
        });

        it('should return a ValidationError if upstream 500s', async function () {
            nock('https://www.youtube.com')
                .get('/oembed')
                .query(true)
                .reply(500);

            try {
                await oembedService.knownProvider('https://www.youtube.com/watch?v=1234');
            } catch (error) {
                assert.equal(error.name, 'ValidationError');
                assert.equal(error.statusCode, 422);
                assert.equal(error.context, 'Request failed with error code 500');
            }
        });
    });
});
