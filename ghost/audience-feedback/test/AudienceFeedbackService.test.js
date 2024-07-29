const assert = require('assert/strict');
const {AudienceFeedbackService} = require('../index');

describe('audienceFeedbackService', function () {
    it('exported', function () {
        assert.equal(require('../index').AudienceFeedbackService, AudienceFeedbackService);
    });

    const mockData = {
        uuid: '7b11de3c-dff9-4563-82ae-a281122d201d',
        postId: '634fc3901e0a291855d8b135',
        postTitle: 'somepost',
        score: 1,
        key: 'somekey'
    };

    describe('build link', function () {
        it('Can build link to post', async function () {
            const instance = new AudienceFeedbackService({
                urlService: {
                    getUrlByResourceId: () => `https://localhost:2368/${mockData.postTitle}/`
                },
                config: {
                    baseURL: new URL('https://localhost:2368')
                }
            });
            const link = instance.buildLink(mockData.uuid, mockData.postId, mockData.score, mockData.key);
            const expectedLink = `https://localhost:2368/${mockData.postTitle}/#/feedback/${mockData.postId}/${mockData.score}/?uuid=${mockData.uuid}&key=somekey`;
            assert.equal(link.href, expectedLink);
        });

        it('Can build link to home page if post wasn\'t published', async function () {
            const instance = new AudienceFeedbackService({
                urlService: {
                    getUrlByResourceId: () => `https://localhost:2368/${mockData.postTitle}/404/`
                },
                config: {
                    baseURL: new URL('https://localhost:2368')
                }
            });
            const link = instance.buildLink(mockData.uuid, mockData.postId, mockData.score, mockData.key);
            const expectedLink = `https://localhost:2368/#/feedback/${mockData.postId}/${mockData.score}/?uuid=${mockData.uuid}&key=somekey`;
            assert.equal(link.href, expectedLink);
        });
    });
});
