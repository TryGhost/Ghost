const PostEmailHandler = require('../../../../../core/server/services/posts/post-email-handler');
const assert = require('node:assert/strict');
const sinon = require('sinon');

describe('PostEmailHandler', function () {
    let postEmailHandler;
    let mockModels;
    let mockEmailService;

    beforeEach(function () {
        mockModels = {
            Post: {
                findOne: sinon.stub()
            },
            Member: {
                findPage: sinon.stub()
            },
            Newsletter: {
                findOne: sinon.stub()
            }
        };

        mockEmailService = {
            checkCanSendEmail: sinon.stub().resolves(),
            createEmail: sinon.stub(),
            retryEmail: sinon.stub()
        };

        postEmailHandler = new PostEmailHandler({
            models: mockModels,
            emailService: mockEmailService
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('constructor', function () {
        it('can construct class with dependencies', function () {
            const handler = new PostEmailHandler({
                models: mockModels,
                emailService: mockEmailService
            });
            assert.ok(handler);
            assert.equal(handler.models, mockModels);
            assert.equal(handler.emailService, mockEmailService);
        });
    });

    describe('shouldSendEmail', function () {
        it('returns correct values for status transitions', function () {
            const testCases = [
                // [newStatus, previousStatus, expected]
                // Should send email: transitioning to published/sent from draft/scheduled
                ['published', 'draft', true],
                ['published', 'scheduled', true],
                ['sent', 'draft', true],
                ['sent', 'scheduled', true],
                ['published', undefined, true],

                // Should not send email: status unchanged
                ['published', 'published', false],
                ['sent', 'sent', false],

                // Should not send email: transitioning between published/sent
                ['sent', 'published', false],
                ['published', 'sent', false],

                // Should not send email: transitioning to draft/scheduled
                ['draft', 'published', false],
                ['draft', 'draft', false],
                ['scheduled', 'draft', false],

                // Should not send email: undefined statuses
                [undefined, undefined, false],
                [undefined, 'draft', false]
            ];

            for (const [newStatus, previousStatus, expected] of testCases) {
                assert.equal(
                    postEmailHandler.shouldSendEmail(newStatus, previousStatus),
                    expected,
                    `shouldSendEmail(${newStatus}, ${previousStatus}) should be ${expected}`
                );
            }
        });
    });

    describe('validateBeforeSave', function () {
        function createFrame(status, options = {}) {
            return {
                data: {posts: [{status}]},
                options: {id: 'post-123', ...options}
            };
        }

        function createExistingPost({status = 'draft', newsletterId = null, emailRecipientFilter = null} = {}) {
            const post = {get: sinon.stub()};
            post.get.withArgs('status').returns(status);
            post.get.withArgs('newsletter_id').returns(newsletterId);
            post.get.withArgs('email_recipient_filter').returns(emailRecipientFilter);
            return post;
        }

        function setupExistingPost(postOptions) {
            const post = createExistingPost(postOptions);
            mockModels.Post.findOne.resolves(post);
            return post;
        }

        function setupNewsletter(id = 'newsletter-123') {
            const newsletter = {id};
            mockModels.Newsletter.findOne.resolves(newsletter);
            return newsletter;
        }

        it('returns early when new status is draft', async function () {
            await postEmailHandler.validateBeforeSave(createFrame('draft'));

            sinon.assert.notCalled(mockModels.Post.findOne);
            sinon.assert.notCalled(mockEmailService.checkCanSendEmail);
        });

        it('returns early when new status is scheduled', async function () {
            await postEmailHandler.validateBeforeSave(createFrame('scheduled'));

            sinon.assert.notCalled(mockModels.Post.findOne);
            sinon.assert.notCalled(mockEmailService.checkCanSendEmail);
        });

        it('validates when publishing post with newsletter option', async function () {
            setupExistingPost();
            const newsletter = setupNewsletter();

            await postEmailHandler.validateBeforeSave(createFrame('published', {newsletter: 'default-newsletter'}));

            sinon.assert.calledOnceWithExactly(
                mockModels.Post.findOne,
                {id: 'post-123', status: 'all'},
                {columns: ['id', 'status', 'newsletter_id', 'email_recipient_filter']}
            );
            sinon.assert.calledOnceWithExactly(mockEmailService.checkCanSendEmail, newsletter, 'all');
        });

        it('validates when publishing post with existing newsletter_id', async function () {
            setupExistingPost({newsletterId: 'newsletter-456'});
            setupNewsletter('newsletter-456');

            await postEmailHandler.validateBeforeSave(createFrame('published'));

            sinon.assert.calledOnce(mockEmailService.checkCanSendEmail);
        });

        it('skips validation when post is already published', async function () {
            setupExistingPost({status: 'published', newsletterId: 'newsletter-456'});

            await postEmailHandler.validateBeforeSave(createFrame('published'));

            sinon.assert.notCalled(mockEmailService.checkCanSendEmail);
        });

        it('skips validation when no newsletter specified', async function () {
            setupExistingPost();

            await postEmailHandler.validateBeforeSave(createFrame('published'));

            sinon.assert.notCalled(mockEmailService.checkCanSendEmail);
        });

        it('validates when status is sent', async function () {
            setupExistingPost({newsletterId: 'newsletter-456'});
            setupNewsletter('newsletter-456');

            await postEmailHandler.validateBeforeSave(createFrame('sent'));

            sinon.assert.calledOnce(mockEmailService.checkCanSendEmail);
        });

        it('validates email recipient filter from frame options', async function () {
            setupExistingPost({newsletterId: 'newsletter-123'});
            mockModels.Member.findPage.resolves({data: []});
            const newsletter = setupNewsletter();

            await postEmailHandler.validateBeforeSave(createFrame('published', {email_segment: 'status:paid'}));

            sinon.assert.calledOnceWithExactly(mockModels.Member.findPage, {filter: 'status:paid', limit: 1});
            sinon.assert.calledOnceWithExactly(mockEmailService.checkCanSendEmail, newsletter, 'status:paid');
        });

        it('falls back to existing post email_recipient_filter', async function () {
            setupExistingPost({newsletterId: 'newsletter-123', emailRecipientFilter: 'status:free'});
            mockModels.Member.findPage.resolves({data: []});
            setupNewsletter();

            await postEmailHandler.validateBeforeSave(createFrame('published'));

            sinon.assert.calledOnceWithExactly(mockModels.Member.findPage, {filter: 'status:free', limit: 1});
        });

        it('defaults to "all" when no filter specified', async function () {
            setupExistingPost({newsletterId: 'newsletter-123'});
            const newsletter = setupNewsletter();

            await postEmailHandler.validateBeforeSave(createFrame('published'));

            sinon.assert.notCalled(mockModels.Member.findPage);
            sinon.assert.calledOnceWithExactly(mockEmailService.checkCanSendEmail, newsletter, 'all');
        });

        it('propagates filter validation errors', async function () {
            setupExistingPost({newsletterId: 'newsletter-123'});
            mockModels.Member.findPage.rejects(new Error('Invalid filter'));

            await assert.rejects(
                postEmailHandler.validateBeforeSave(createFrame('published', {email_segment: 'invalid:::filter'})),
                err => err.name === 'BadRequestError'
            );
        });

        it('propagates checkCanSendEmail errors', async function () {
            setupExistingPost({newsletterId: 'newsletter-123'});
            setupNewsletter();
            mockEmailService.checkCanSendEmail.rejects(new Error('Email limit exceeded'));

            await assert.rejects(
                postEmailHandler.validateBeforeSave(createFrame('published')),
                err => err.message === 'Email limit exceeded'
            );
        });
    });

    describe('validateEmailRecipientFilter', function () {
        it('skips validation for empty/null/undefined/all filters', async function () {
            const skipFilters = ['', null, undefined, 'all'];

            for (const filter of skipFilters) {
                await assert.doesNotReject(
                    postEmailHandler.validateEmailRecipientFilter(filter)
                );
            }
            sinon.assert.notCalled(mockModels.Member.findPage);
        });

        it('passes validation for valid custom filter', async function () {
            mockModels.Member.findPage.resolves({data: []});

            await assert.doesNotReject(
                postEmailHandler.validateEmailRecipientFilter('status:free')
            );

            sinon.assert.calledOnceWithExactly(
                mockModels.Member.findPage,
                {filter: 'status:free', limit: 1}
            );
        });

        it('throws BadRequestError for invalid filter', async function () {
            mockModels.Member.findPage.rejects(new Error('Invalid filter syntax'));

            await assert.rejects(
                postEmailHandler.validateEmailRecipientFilter('invalid:::filter'),
                (err) => {
                    assert.equal(err.name, 'BadRequestError');
                    assert.ok(err.message.includes('valid filter'));
                    assert.equal(err.context, 'Invalid filter syntax');
                    return true;
                }
            );
        });
    });

    describe('getNewsletter', function () {
        function createFrame(newsletterSlug = null) {
            return {options: newsletterSlug ? {newsletter: newsletterSlug} : {}};
        }

        function createExistingPost(newsletterId) {
            return {get: sinon.stub().withArgs('newsletter_id').returns(newsletterId)};
        }

        it('returns newsletter by slug when specified in frame options', async function () {
            const newsletter = {id: 'newsletter-123', slug: 'weekly-digest'};
            mockModels.Newsletter.findOne.resolves(newsletter);

            const result = await postEmailHandler.getNewsletter(createFrame('weekly-digest'), null);

            assert.equal(result, newsletter);
            sinon.assert.calledOnceWithExactly(mockModels.Newsletter.findOne, {slug: 'weekly-digest'});
        });

        it('returns newsletter by id from existing post when no slug in options', async function () {
            const newsletter = {id: 'newsletter-456'};
            mockModels.Newsletter.findOne.resolves(newsletter);

            const result = await postEmailHandler.getNewsletter(createFrame(), createExistingPost('newsletter-456'));

            assert.equal(result, newsletter);
            sinon.assert.calledOnceWithExactly(mockModels.Newsletter.findOne, {id: 'newsletter-456'});
        });

        it('returns null when no newsletter specified and existing post has no newsletter_id', async function () {
            const result = await postEmailHandler.getNewsletter(createFrame(), createExistingPost(null));

            assert.equal(result, null);
            sinon.assert.notCalled(mockModels.Newsletter.findOne);
        });

        it('returns null when no newsletter specified and no existing post', async function () {
            const result = await postEmailHandler.getNewsletter(createFrame(), null);

            assert.equal(result, null);
            sinon.assert.notCalled(mockModels.Newsletter.findOne);
        });

        it('prioritizes frame options newsletter over existing post newsletter_id', async function () {
            const newsletter = {id: 'newsletter-new', slug: 'new-newsletter'};
            mockModels.Newsletter.findOne.resolves(newsletter);

            const result = await postEmailHandler.getNewsletter(createFrame('new-newsletter'), createExistingPost('newsletter-old'));

            assert.equal(result, newsletter);
            sinon.assert.calledOnceWithExactly(mockModels.Newsletter.findOne, {slug: 'new-newsletter'});
        });
    });

    describe('createOrRetryEmail', function () {
        function createMockEmail(status) {
            return {
                id: 'email-123',
                get: sinon.stub().withArgs('status').returns(status)
            };
        }

        function createMockModel({
            newsletterId = 'newsletter-123',
            currentStatus = 'published',
            previousStatus = 'draft',
            wasChanged = true,
            email = null
        } = {}) {
            const get = sinon.stub();
            get.withArgs('newsletter_id').returns(newsletterId);
            get.withArgs('status').returns(currentStatus);

            return {
                wasChanged: sinon.stub().returns(wasChanged),
                get,
                previous: sinon.stub().withArgs('status').returns(previousStatus),
                relations: email ? {email} : {},
                set: sinon.stub()
            };
        }

        it('does nothing when model has no newsletter_id', async function () {
            const model = createMockModel({newsletterId: null});

            await postEmailHandler.createOrRetryEmail(model);

            sinon.assert.notCalled(mockEmailService.createEmail);
            sinon.assert.notCalled(mockEmailService.retryEmail);
        });

        it('does nothing when model was not changed', async function () {
            const model = createMockModel({wasChanged: false});

            await postEmailHandler.createOrRetryEmail(model);

            sinon.assert.notCalled(mockEmailService.createEmail);
            sinon.assert.notCalled(mockEmailService.retryEmail);
        });

        it('does nothing when status transition does not warrant sending email', async function () {
            const model = createMockModel({previousStatus: 'published'});

            await postEmailHandler.createOrRetryEmail(model);

            sinon.assert.notCalled(mockEmailService.createEmail);
            sinon.assert.notCalled(mockEmailService.retryEmail);
        });

        it('creates email when publishing fresh post', async function () {
            const model = createMockModel();
            const createdEmail = {id: 'email-123'};
            mockEmailService.createEmail.resolves(createdEmail);

            await postEmailHandler.createOrRetryEmail(model);

            sinon.assert.calledOnceWithExactly(mockEmailService.createEmail, model);
            sinon.assert.notCalled(mockEmailService.retryEmail);
            sinon.assert.calledOnceWithExactly(model.set, 'email', createdEmail);
        });

        it('retries email when existing email has failed status', async function () {
            const failedEmail = createMockEmail('failed');
            const model = createMockModel({email: failedEmail});
            const retriedEmail = {id: 'email-123', status: 'pending'};
            mockEmailService.retryEmail.resolves(retriedEmail);

            await postEmailHandler.createOrRetryEmail(model);

            sinon.assert.notCalled(mockEmailService.createEmail);
            sinon.assert.calledOnceWithExactly(mockEmailService.retryEmail, failedEmail);
            sinon.assert.calledOnceWithExactly(model.set, 'email', retriedEmail);
        });

        it('does not set email on model when existing email is not failed', async function () {
            const existingEmail = createMockEmail('submitted');
            const model = createMockModel({email: existingEmail});

            await postEmailHandler.createOrRetryEmail(model);

            sinon.assert.notCalled(mockEmailService.createEmail);
            sinon.assert.notCalled(mockEmailService.retryEmail);
            sinon.assert.notCalled(model.set);
        });

        it('handles sent status transition', async function () {
            const model = createMockModel({currentStatus: 'sent'});
            const createdEmail = {id: 'email-456'};
            mockEmailService.createEmail.resolves(createdEmail);

            await postEmailHandler.createOrRetryEmail(model);

            sinon.assert.calledOnceWithExactly(mockEmailService.createEmail, model);
            sinon.assert.calledOnceWithExactly(model.set, 'email', createdEmail);
        });

        it('does not set email when createEmail returns null', async function () {
            const model = createMockModel();
            mockEmailService.createEmail.resolves(null);

            await postEmailHandler.createOrRetryEmail(model);

            sinon.assert.calledOnceWithExactly(mockEmailService.createEmail, model);
            sinon.assert.notCalled(model.set);
        });
    });
});
