const sinon = require('sinon');
const AudienceFeedbackController = require('../../../../../core/server/services/audience-feedback/audience-feedback-controller');

describe('AudienceFeedbackController', function () {
    describe('redirectToPost', function () {
        const postId = '634fc3901e0a291855d8b135';
        const uuid = '7b11de3c-dff9-4563-82ae-a281122d201d';
        const key = 'a'.repeat(64);

        function createController(buildLink) {
            return new AudienceFeedbackController({
                repository: {},
                audienceFeedbackService: {buildLink}
            });
        }

        it('resolves the post by id and redirects to the feedback flow', function () {
            const buildLink = sinon.stub().returns(
                new URL(`https://site.com/current-slug/#/feedback/${postId}/1/?uuid=${uuid}&key=${key}`)
            );
            const controller = createController(buildLink);
            const req = {params: {postId, score: '1'}, query: {uuid, key}};
            const res = {redirect: sinon.fake()};

            controller.redirectToPost(req, res, () => {});

            sinon.assert.calledOnceWithExactly(buildLink, uuid, {id: postId}, 1, key);
            sinon.assert.calledOnceWithExactly(
                res.redirect,
                `https://site.com/current-slug/#/feedback/${postId}/1/?uuid=${uuid}&key=${key}`
            );
        });

        it('coerces any non-"1" score to 0', function () {
            const buildLink = sinon.stub().returns(new URL('https://site.com/'));
            const controller = createController(buildLink);
            const req = {params: {postId, score: 'bogus'}, query: {uuid, key}};
            controller.redirectToPost(req, {redirect: sinon.fake()}, () => {});

            sinon.assert.calledOnceWithExactly(buildLink, uuid, {id: postId}, 0, key);
        });

        it('forwards errors to next', function () {
            const error = new Error('boom');
            const buildLink = sinon.stub().throws(error);
            const controller = createController(buildLink);
            const next = sinon.fake();
            const res = {redirect: sinon.fake()};

            controller.redirectToPost({params: {postId, score: '1'}, query: {}}, res, next);

            sinon.assert.notCalled(res.redirect);
            sinon.assert.calledOnceWithExactly(next, error);
        });
    });
});
