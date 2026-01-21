import assert from 'assert/strict';
import sinon, {SinonStub} from 'sinon';
import {
    PostEmailHandler,
    PostStatus,
    Frame,
    PostModel,
    EmailModel
} from '../../../../../core/server/services/posts/post-email-handler';

// Mock factory that creates a properly typed PostModel
function createPostModel({
    status = 'draft' as PostStatus,
    newsletterId = null as string | null,
    emailRecipientFilter = 'all',
    previousStatus = undefined as PostStatus | undefined,
    wasChanged = false,
    email = undefined as EmailModel | undefined
} = {}): PostModel & {set: SinonStub} {
    const values: Record<string, unknown> = {
        status,
        newsletter_id: newsletterId,
        email_recipient_filter: emailRecipientFilter
    };
    const previousValues: Record<string, unknown> = {
        status: previousStatus
    };

    return {
        get: ((key: string) => values[key]) as PostModel['get'],
        previous: ((key: string) => previousValues[key]) as PostModel['previous'],
        wasChanged: sinon.stub().returns(wasChanged),
        set: sinon.stub(),
        relations: email ? {email} : {}
    };
}

// Mock factory that creates a properly typed EmailModel
function createEmailModel(status: string): EmailModel {
    const values: Record<string, unknown> = {status};
    return {
        get: ((key: string) => values[key]) as EmailModel['get']
    };
}

describe('PostEmailHandler', function () {
    let postEmailHandler: PostEmailHandler;

    // Store stubs with proper types to avoid casting everywhere
    let stubs: {
        postFindOne: SinonStub;
        memberFindPage: SinonStub;
        newsletterFindOne: SinonStub;
        checkCanSendEmail: SinonStub;
        createEmail: SinonStub;
        retryEmail: SinonStub;
    };

    beforeEach(function () {
        stubs = {
            postFindOne: sinon.stub(),
            memberFindPage: sinon.stub(),
            newsletterFindOne: sinon.stub(),
            checkCanSendEmail: sinon.stub().resolves(),
            createEmail: sinon.stub(),
            retryEmail: sinon.stub()
        };

        postEmailHandler = new PostEmailHandler({
            models: {
                Post: {findOne: stubs.postFindOne},
                Member: {findPage: stubs.memberFindPage},
                Newsletter: {findOne: stubs.newsletterFindOne}
            },
            emailService: {
                checkCanSendEmail: stubs.checkCanSendEmail,
                createEmail: stubs.createEmail,
                retryEmail: stubs.retryEmail
            }
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('constructor', function () {
        it('can construct class with dependencies', function () {
            const handler = new PostEmailHandler({
                models: {
                    Post: {findOne: sinon.stub()},
                    Member: {findPage: sinon.stub()},
                    Newsletter: {findOne: sinon.stub()}
                },
                emailService: {
                    checkCanSendEmail: sinon.stub(),
                    createEmail: sinon.stub(),
                    retryEmail: sinon.stub()
                }
            });
            assert.ok(handler);
        });
    });

    describe('shouldSendEmail', function () {
        it('returns correct values for status transitions', function () {
            const testCases: Array<[PostStatus | undefined, PostStatus | undefined, boolean]> = [
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
                ['scheduled', 'draft', false]
            ];

            for (const [newStatus, previousStatus, expected] of testCases) {
                assert.equal(
                    postEmailHandler.shouldSendEmail(newStatus as PostStatus, previousStatus),
                    expected,
                    `shouldSendEmail(${newStatus}, ${previousStatus}) should be ${expected}`
                );
            }
        });
    });

    describe('validateBeforeSave', function () {
        function createFrame(status: PostStatus | undefined, options: Partial<Frame['options']> = {}): Frame {
            return {
                data: {posts: [{status}]},
                options: {id: 'post-123', ...options}
            };
        }

        function setupExistingPost(postOptions?: Parameters<typeof createPostModel>[0]): PostModel {
            const post = createPostModel(postOptions);
            stubs.postFindOne.resolves(post);
            return post;
        }

        function setupNewsletter(id = 'newsletter-123'): {id: string} {
            const newsletter = {id};
            stubs.newsletterFindOne.resolves(newsletter);
            return newsletter;
        }

        it('returns early when new status is draft', async function () {
            await postEmailHandler.validateBeforeSave(createFrame('draft'));

            sinon.assert.notCalled(stubs.postFindOne);
            sinon.assert.notCalled(stubs.checkCanSendEmail);
        });

        it('returns early when new status is scheduled', async function () {
            await postEmailHandler.validateBeforeSave(createFrame('scheduled'));

            sinon.assert.notCalled(stubs.postFindOne);
            sinon.assert.notCalled(stubs.checkCanSendEmail);
        });

        it('validates when publishing post with newsletter option', async function () {
            setupExistingPost();
            const newsletter = setupNewsletter();

            await postEmailHandler.validateBeforeSave(createFrame('published', {newsletter: 'default-newsletter'}));

            sinon.assert.calledOnceWithExactly(
                stubs.postFindOne,
                {id: 'post-123', status: 'all'},
                {columns: ['id', 'status', 'newsletter_id', 'email_recipient_filter']}
            );
            sinon.assert.calledOnceWithExactly(stubs.checkCanSendEmail, newsletter, 'all');
        });

        it('validates when publishing post with existing newsletter_id', async function () {
            setupExistingPost({newsletterId: 'newsletter-456'});
            setupNewsletter('newsletter-456');

            await postEmailHandler.validateBeforeSave(createFrame('published'));

            sinon.assert.calledOnce(stubs.checkCanSendEmail);
        });

        it('skips validation when post is already published', async function () {
            setupExistingPost({status: 'published', newsletterId: 'newsletter-456'});

            await postEmailHandler.validateBeforeSave(createFrame('published'));

            sinon.assert.notCalled(stubs.checkCanSendEmail);
        });

        it('skips validation when no newsletter specified', async function () {
            setupExistingPost();

            await postEmailHandler.validateBeforeSave(createFrame('published'));

            sinon.assert.notCalled(stubs.checkCanSendEmail);
        });

        it('validates when status is sent', async function () {
            setupExistingPost({newsletterId: 'newsletter-456'});
            setupNewsletter('newsletter-456');

            await postEmailHandler.validateBeforeSave(createFrame('sent'));

            sinon.assert.calledOnce(stubs.checkCanSendEmail);
        });

        it('validates email recipient filter from frame options', async function () {
            setupExistingPost({newsletterId: 'newsletter-123'});
            stubs.memberFindPage.resolves({data: []});
            const newsletter = setupNewsletter();

            await postEmailHandler.validateBeforeSave(createFrame('published', {email_segment: 'status:paid'}));

            sinon.assert.calledOnceWithExactly(stubs.memberFindPage, {filter: 'status:paid', limit: 1});
            sinon.assert.calledOnceWithExactly(stubs.checkCanSendEmail, newsletter, 'status:paid');
        });

        it('falls back to existing post email_recipient_filter', async function () {
            setupExistingPost({newsletterId: 'newsletter-123', emailRecipientFilter: 'status:free'});
            stubs.memberFindPage.resolves({data: []});
            setupNewsletter();

            await postEmailHandler.validateBeforeSave(createFrame('published'));

            sinon.assert.calledOnceWithExactly(stubs.memberFindPage, {filter: 'status:free', limit: 1});
        });

        it('defaults to "all" when no filter specified', async function () {
            setupExistingPost({newsletterId: 'newsletter-123'});
            const newsletter = setupNewsletter();

            await postEmailHandler.validateBeforeSave(createFrame('published'));

            sinon.assert.notCalled(stubs.memberFindPage);
            sinon.assert.calledOnceWithExactly(stubs.checkCanSendEmail, newsletter, 'all');
        });

        it('propagates filter validation errors', async function () {
            setupExistingPost({newsletterId: 'newsletter-123'});
            stubs.memberFindPage.rejects(new Error('Invalid filter'));

            await assert.rejects(
                postEmailHandler.validateBeforeSave(createFrame('published', {email_segment: 'invalid:::filter'})),
                (err: Error) => err.name === 'BadRequestError'
            );
        });

        it('propagates checkCanSendEmail errors', async function () {
            setupExistingPost({newsletterId: 'newsletter-123'});
            setupNewsletter();
            stubs.checkCanSendEmail.rejects(new Error('Email limit exceeded'));

            await assert.rejects(
                postEmailHandler.validateBeforeSave(createFrame('published')),
                (err: Error) => err.message === 'Email limit exceeded'
            );
        });
    });

    describe('validateEmailRecipientFilter', function () {
        it('skips validation for empty/all filters', async function () {
            const skipFilters = ['', 'all'];

            for (const filter of skipFilters) {
                await assert.doesNotReject(
                    postEmailHandler.validateEmailRecipientFilter(filter)
                );
            }
            sinon.assert.notCalled(stubs.memberFindPage);
        });

        it('passes validation for valid custom filter', async function () {
            stubs.memberFindPage.resolves({data: []});

            await assert.doesNotReject(
                postEmailHandler.validateEmailRecipientFilter('status:free')
            );

            sinon.assert.calledOnceWithExactly(
                stubs.memberFindPage,
                {filter: 'status:free', limit: 1}
            );
        });

        it('throws BadRequestError for invalid filter', async function () {
            stubs.memberFindPage.rejects(new Error('Invalid filter syntax'));

            await assert.rejects(
                postEmailHandler.validateEmailRecipientFilter('invalid:::filter'),
                (err: Error & {context?: string}) => {
                    assert.equal(err.name, 'BadRequestError');
                    assert.ok(err.message.includes('valid filter'));
                    assert.equal(err.context, 'Invalid filter syntax');
                    return true;
                }
            );
        });
    });

    describe('getNewsletter', function () {
        function createFrame(newsletterSlug: string | null = null): Frame {
            return {
                data: {posts: [{}]},
                options: newsletterSlug ? {id: 'post-123', newsletter: newsletterSlug} : {id: 'post-123'}
            };
        }

        it('returns newsletter by slug when specified in frame options', async function () {
            const newsletter = {id: 'newsletter-123', slug: 'weekly-digest'};
            stubs.newsletterFindOne.resolves(newsletter);

            const result = await postEmailHandler.getNewsletter(createFrame('weekly-digest'), null);

            assert.equal(result, newsletter);
            sinon.assert.calledOnceWithExactly(stubs.newsletterFindOne, {slug: 'weekly-digest'});
        });

        it('returns newsletter by id from existing post when no slug in options', async function () {
            const newsletter = {id: 'newsletter-456'};
            stubs.newsletterFindOne.resolves(newsletter);

            const result = await postEmailHandler.getNewsletter(createFrame(), createPostModel({newsletterId: 'newsletter-456'}));

            assert.equal(result, newsletter);
            sinon.assert.calledOnceWithExactly(stubs.newsletterFindOne, {id: 'newsletter-456'});
        });

        it('returns null when no newsletter specified and existing post has no newsletter_id', async function () {
            const result = await postEmailHandler.getNewsletter(createFrame(), createPostModel({newsletterId: null}));

            assert.equal(result, null);
            sinon.assert.notCalled(stubs.newsletterFindOne);
        });

        it('returns null when no newsletter specified and no existing post', async function () {
            const result = await postEmailHandler.getNewsletter(createFrame(), null);

            assert.equal(result, null);
            sinon.assert.notCalled(stubs.newsletterFindOne);
        });

        it('prioritizes frame options newsletter over existing post newsletter_id', async function () {
            const newsletter = {id: 'newsletter-new', slug: 'new-newsletter'};
            stubs.newsletterFindOne.resolves(newsletter);

            const result = await postEmailHandler.getNewsletter(createFrame('new-newsletter'), createPostModel({newsletterId: 'newsletter-old'}));

            assert.equal(result, newsletter);
            sinon.assert.calledOnceWithExactly(stubs.newsletterFindOne, {slug: 'new-newsletter'});
        });
    });

    describe('createOrRetryEmail', function () {
        it('does nothing when model has no newsletter_id', async function () {
            const model = createPostModel({newsletterId: null, wasChanged: true});

            await postEmailHandler.createOrRetryEmail(model);

            sinon.assert.notCalled(stubs.createEmail);
            sinon.assert.notCalled(stubs.retryEmail);
        });

        it('does nothing when model was not changed', async function () {
            const model = createPostModel({status: 'published', previousStatus: 'draft', wasChanged: false});

            await postEmailHandler.createOrRetryEmail(model);

            sinon.assert.notCalled(stubs.createEmail);
            sinon.assert.notCalled(stubs.retryEmail);
        });

        it('does nothing when status transition does not warrant sending email', async function () {
            const model = createPostModel({status: 'published', previousStatus: 'published', wasChanged: true});

            await postEmailHandler.createOrRetryEmail(model);

            sinon.assert.notCalled(stubs.createEmail);
            sinon.assert.notCalled(stubs.retryEmail);
        });

        it('creates email when publishing fresh post', async function () {
            const model = createPostModel({newsletterId: 'newsletter-123', status: 'published', previousStatus: 'draft', wasChanged: true});
            const createdEmail = {id: 'email-123'};
            stubs.createEmail.resolves(createdEmail);

            await postEmailHandler.createOrRetryEmail(model);

            sinon.assert.calledOnce(stubs.createEmail);
            assert.equal(stubs.createEmail.firstCall.args[0], model);
            sinon.assert.notCalled(stubs.retryEmail);
            sinon.assert.calledOnce(model.set);
            assert.deepEqual(model.set.firstCall.args, ['email', createdEmail]);
        });

        it('retries email when existing email has failed status', async function () {
            const failedEmail = createEmailModel('failed');
            const model = createPostModel({newsletterId: 'newsletter-123', status: 'published', previousStatus: 'draft', wasChanged: true, email: failedEmail});
            const retriedEmail = {id: 'email-123', status: 'pending'};
            stubs.retryEmail.resolves(retriedEmail);

            await postEmailHandler.createOrRetryEmail(model);

            sinon.assert.notCalled(stubs.createEmail);
            sinon.assert.calledOnce(stubs.retryEmail);
            assert.equal(stubs.retryEmail.firstCall.args[0], failedEmail);
            sinon.assert.calledOnce(model.set);
            assert.deepEqual(model.set.firstCall.args, ['email', retriedEmail]);
        });

        it('does not set email on model when existing email is not failed', async function () {
            const existingEmail = createEmailModel('submitted');
            const model = createPostModel({newsletterId: 'newsletter-123', status: 'published', previousStatus: 'draft', wasChanged: true, email: existingEmail});

            await postEmailHandler.createOrRetryEmail(model);

            sinon.assert.notCalled(stubs.createEmail);
            sinon.assert.notCalled(stubs.retryEmail);
            sinon.assert.notCalled(model.set);
        });

        it('handles sent status transition', async function () {
            const model = createPostModel({newsletterId: 'newsletter-123', status: 'sent', previousStatus: 'draft', wasChanged: true});
            const createdEmail = {id: 'email-456'};
            stubs.createEmail.resolves(createdEmail);

            await postEmailHandler.createOrRetryEmail(model);

            sinon.assert.calledOnce(stubs.createEmail);
            assert.equal(stubs.createEmail.firstCall.args[0], model);
            sinon.assert.calledOnce(model.set);
            assert.deepEqual(model.set.firstCall.args, ['email', createdEmail]);
        });

        it('does not set email when createEmail returns null', async function () {
            const model = createPostModel({newsletterId: 'newsletter-123', status: 'published', previousStatus: 'draft', wasChanged: true});
            stubs.createEmail.resolves(null);

            await postEmailHandler.createOrRetryEmail(model);

            sinon.assert.calledOnce(stubs.createEmail);
            assert.equal(stubs.createEmail.firstCall.args[0], model);
            sinon.assert.notCalled(model.set);
        });
    });
});
