const sinon = require('sinon');
const permissions = require('../../../../../core/server/services/permissions');
const AudienceFeedbackController = require('../../../../../core/server/services/audience-feedback/audience-feedback-controller');

describe('AudienceFeedbackController', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('redirectToPost', function () {
        const postId = '634fc3901e0a291855d8b135';
        const uuid = '7b11de3c-dff9-4563-82ae-a281122d201d';
        const key = 'a'.repeat(64);

        function createController({buildLink, buildFallbackLink, getPostById}) {
            return new AudienceFeedbackController({
                repository: {getPostById},
                audienceFeedbackService: {buildLink, buildFallbackLink}
            });
        }

        it('loads the full post and redirects to the feedback flow', async function () {
            // The URL service needs a full post record (status for the base
            // filter, tags/authors for filtered routes) — an id-only resource
            // is reported as thin by the URL service.
            const post = {id: postId, status: 'published'};
            const getPostById = sinon.stub().resolves(post);
            const buildLink = sinon.stub().returns(
                new URL(`https://site.com/current-slug/#/feedback/${postId}/1/?uuid=${uuid}&key=${key}`)
            );
            const controller = createController({buildLink, getPostById});
            const req = {params: {postId, score: '1'}, query: {uuid, key}};
            const res = {redirect: sinon.fake()};

            await controller.redirectToPost(req, res, () => {});

            sinon.assert.calledOnceWithExactly(getPostById, postId, {withRelated: ['tags', 'authors']});
            sinon.assert.calledOnceWithExactly(buildLink, uuid, post, 1, key);
            sinon.assert.calledOnceWithExactly(
                res.redirect,
                `https://site.com/current-slug/#/feedback/${postId}/1/?uuid=${uuid}&key=${key}`
            );
        });

        it('falls back to the home page link when the post no longer exists', async function () {
            const getPostById = sinon.stub().resolves(null);
            const buildLink = sinon.stub();
            const buildFallbackLink = sinon.stub().returns(
                new URL(`https://site.com/#/feedback/${postId}/1/?uuid=${uuid}&key=${key}`)
            );
            const controller = createController({buildLink, buildFallbackLink, getPostById});
            const req = {params: {postId, score: '1'}, query: {uuid, key}};
            const res = {redirect: sinon.fake()};

            await controller.redirectToPost(req, res, () => {});

            sinon.assert.notCalled(buildLink);
            sinon.assert.calledOnceWithExactly(buildFallbackLink, uuid, postId, 1, key);
            sinon.assert.calledOnceWithExactly(
                res.redirect,
                `https://site.com/#/feedback/${postId}/1/?uuid=${uuid}&key=${key}`
            );
        });

        it('coerces any non-"1" score to 0', async function () {
            const post = {id: postId, status: 'published'};
            const getPostById = sinon.stub().resolves(post);
            const buildLink = sinon.stub().returns(new URL('https://site.com/'));
            const controller = createController({buildLink, getPostById});
            const req = {params: {postId, score: 'bogus'}, query: {uuid, key}};

            await controller.redirectToPost(req, {redirect: sinon.fake()}, () => {});

            sinon.assert.calledOnceWithExactly(buildLink, uuid, post, 0, key);
        });

        it('forwards errors to next', async function () {
            const error = new Error('boom');
            const getPostById = sinon.stub().rejects(error);
            const buildLink = sinon.stub();
            const controller = createController({buildLink, getPostById});
            const next = sinon.fake();
            const res = {redirect: sinon.fake()};

            await controller.redirectToPost({params: {postId, score: '1'}, query: {}}, res, next);

            sinon.assert.notCalled(res.redirect);
            sinon.assert.calledOnceWithExactly(next, error);
        });
    });

    describe('browse', function () {
        const postId = '634fc3901e0a291855d8b135';
        const context = {user: 'user-id'};

        function createController(getForPost) {
            return new AudienceFeedbackController({
                repository: {getForPost},
                audienceFeedbackService: {}
            });
        }

        it('includes member data when the user can browse members', async function () {
            const browseMember = sinon.stub().resolves();
            sinon.stub(permissions, 'canThis').withArgs(context).returns({
                browse: {
                    member: browseMember
                }
            });
            const result = {data: [], meta: {}};
            const getForPost = sinon.stub().resolves(result);
            const controller = createController(getForPost);

            const response = await controller.browse({
                data: {id: postId},
                options: {context}
            });

            sinon.assert.calledOnce(browseMember);
            sinon.assert.calledOnceWithExactly(getForPost, postId, {
                limit: 10,
                page: 1,
                withMember: true
            });
            sinon.assert.match(response, result);
        });

        it('excludes member data when the user cannot browse members', async function () {
            const browseMember = sinon.stub().rejects();
            sinon.stub(permissions, 'canThis').withArgs(context).returns({
                browse: {
                    member: browseMember
                }
            });
            const result = {data: [], meta: {}};
            const getForPost = sinon.stub().resolves(result);
            const controller = createController(getForPost);

            const response = await controller.browse({
                data: {id: postId},
                options: {context}
            });

            sinon.assert.calledOnce(browseMember);
            sinon.assert.calledOnceWithExactly(getForPost, postId, {
                limit: 10,
                page: 1,
                withMember: false
            });
            sinon.assert.match(response, result);
        });
    });
});
