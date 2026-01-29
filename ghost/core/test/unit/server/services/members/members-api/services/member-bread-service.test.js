const assert = require('assert/strict');
const sinon = require('sinon');
const MemberBreadService = require('../../../../../../../core/server/services/members/members-api/services/member-bread-service');

describe('MemberBreadService', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('add', function () {
        // Helper to create a mock member model
        function createMockMemberModel(overrides = {}) {
            return {
                id: 'member_123',
                get: sinon.stub().callsFake((key) => {
                    const data = {
                        id: 'member_123',
                        uuid: 'uuid-123',
                        email: 'test@example.com',
                        name: 'Test User',
                        status: 'free',
                        email_disabled: false,
                        ...overrides
                    };
                    return data[key];
                }),
                related: sinon.stub().returns({toJSON: () => [], models: []}),
                toJSON: sinon.stub().returns({
                    id: 'member_123',
                    uuid: 'uuid-123',
                    email: 'test@example.com',
                    name: 'Test User',
                    status: 'free',
                    subscriptions: [],
                    ...overrides
                })
            };
        }

        // Helper to create a properly mocked service
        function createService(memberRepositoryOverrides = {}) {
            const mockMemberModel = createMockMemberModel();

            const linkStripeCustomerStub = sinon.stub().resolves();
            const createStub = sinon.stub().resolves(mockMemberModel);

            const memberRepository = {
                create: createStub,
                linkStripeCustomer: linkStripeCustomerStub,
                ...memberRepositoryOverrides
            };

            const service = new MemberBreadService({
                memberRepository,
                stripeService: {configured: true},
                memberAttributionService: {getAttributionFromContext: sinon.stub().resolves(null)},
                emailService: {},
                labsService: {isSet: sinon.stub().returns(false)},
                newslettersService: {browse: sinon.stub().resolves([])},
                settingsCache: {get: sinon.stub()},
                emailSuppressionList: {getSuppressionData: sinon.stub().resolves({suppressed: false, info: null})},
                settingsHelpers: {createUnsubscribeUrl: sinon.stub().returns('http://example.com/unsubscribe')}
            });

            // Stub the read method to avoid having to mock all its dependencies
            sinon.stub(service, 'read').resolves({
                id: 'member_123',
                email: 'test@example.com',
                name: 'Test User',
                status: 'free'
            });

            return {service, memberRepository, linkStripeCustomerStub, createStub};
        }

        it('passes context to linkStripeCustomer when stripe_customer_id is provided', async function () {
            // This test verifies that when a member is created via Admin API with a stripe_customer_id,
            // the context (containing {user: true}) is passed through to linkStripeCustomer.
            // This is important because linkStripeCustomer -> linkSubscription uses context
            // to determine the source for welcome emails. Without context, the source defaults
            // to 'member', causing welcome emails to be incorrectly sent for admin-created members.

            const {service, linkStripeCustomerStub} = createService();

            // Call add with admin context and stripe_customer_id
            await service.add({
                email: 'test@example.com',
                name: 'Test User',
                stripe_customer_id: 'cus_123'
            }, {
                context: {user: true}  // Admin context
            });

            // Verify linkStripeCustomer was called
            assert.equal(linkStripeCustomerStub.calledOnce, true, 'linkStripeCustomer should be called once');

            // Get the options passed to linkStripeCustomer
            const linkStripeCustomerOptions = linkStripeCustomerStub.firstCall.args[1];

            // BUG: Currently this fails because sharedOptions in member-bread-service.js
            // only includes 'transacting', not 'context'. The context should be passed through
            // so that linkStripeCustomer -> linkSubscription can correctly determine
            // that this is an admin-created member and NOT send a welcome email.
            assert.ok(linkStripeCustomerOptions.context, 'context should be passed to linkStripeCustomer');
            assert.equal(linkStripeCustomerOptions.context.user, true, 'context.user should be true');
        });

        it('passes context to linkStripeCustomer when transacting and stripe_customer_id are both provided', async function () {
            const {service, linkStripeCustomerStub} = createService();
            const mockTransaction = {executionPromise: Promise.resolve()};

            // Call add with admin context, stripe_customer_id, and a transaction
            await service.add({
                email: 'test@example.com',
                name: 'Test User',
                stripe_customer_id: 'cus_456'
            }, {
                context: {user: true},
                transacting: mockTransaction
            });

            // Verify linkStripeCustomer was called
            assert.equal(linkStripeCustomerStub.calledOnce, true, 'linkStripeCustomer should be called once');

            // Get the options passed to linkStripeCustomer
            const linkStripeCustomerOptions = linkStripeCustomerStub.firstCall.args[1];

            // Should have both transacting AND context
            assert.equal(linkStripeCustomerOptions.transacting, mockTransaction, 'transacting should be passed');
            assert.ok(linkStripeCustomerOptions.context, 'context should also be passed');
            assert.equal(linkStripeCustomerOptions.context.user, true, 'context.user should be true');
        });

        it('passes import context to linkStripeCustomer', async function () {
            const {service, linkStripeCustomerStub} = createService();

            // Call add with import context
            await service.add({
                email: 'import-test@example.com',
                name: 'Imported User',
                stripe_customer_id: 'cus_789'
            }, {
                context: {import: true}
            });

            const linkStripeCustomerOptions = linkStripeCustomerStub.firstCall.args[1];

            // Import context should also be passed through
            assert.ok(linkStripeCustomerOptions.context, 'context should be passed to linkStripeCustomer');
            assert.equal(linkStripeCustomerOptions.context.import, true, 'context.import should be true');
        });
    });
});
