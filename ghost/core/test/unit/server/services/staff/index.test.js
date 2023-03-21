const sinon = require('sinon');
const staffService = require('../../../../../core/server/services/staff');

const DomainEvents = require('@tryghost/domain-events');
const {mockManager} = require('../../../../utils/e2e-framework');
const models = require('../../../../../core/server/models');

const {SubscriptionCancelledEvent, MemberCreatedEvent, SubscriptionActivatedEvent} = require('@tryghost/member-events');
const {MilestoneCreatedEvent} = require('@tryghost/milestones');

describe('Staff Service:', function () {
    before(function () {
        models.init();
    });

    beforeEach(function () {
        mockManager.mockMail();
        mockManager.mockSlack();
        mockManager.mockSetting('title', 'The Weekly Roundup');

        sinon.stub(models.User, 'getEmailAlertUsers').resolves([{
            email: 'owner@ghost.org',
            slug: 'ghost'
        }]);

        sinon.stub(models.Member, 'findOne').resolves({
            toJSON: sinon.stub().returns({
                id: '1',
                email: 'jamie@example.com',
                name: 'Jamie',
                status: 'free',
                geolocation: null,
                created_at: '2022-08-01T07:30:39.882Z'
            })
        });

        sinon.stub(models.Product, 'findOne').resolves({
            toJSON: sinon.stub().returns({
                id: 'tier-1',
                name: 'Tier 1'
            })
        });

        sinon.stub(models.Offer, 'findOne').resolves({
            toJSON: sinon.stub().returns({
                discount_amount: 1000,
                duration: 'forever',
                discount_type: 'fixed',
                name: 'Test offer',
                duration_in_months: null
            })
        });

        sinon.stub(models.StripeCustomerSubscription, 'findOne').resolves({
            toJSON: sinon.stub().returns({
                id: 'sub-1',
                plan: {
                    amount: 5000,
                    currency: 'USD',
                    interval: 'month'
                },
                start_date: new Date('2022-08-01T07:30:39.882Z'),
                current_period_end: '2024-08-01T07:30:39.882Z',
                cancellation_reason: 'Changed my mind!'
            })
        });
    });

    afterEach(function () {
        sinon.restore();
        mockManager.restore();
    });

    describe('free member created event:', function () {
        let eventData = {
            memberId: '1'
        };

        it('sends email for member source', async function () {
            await staffService.init();
            DomainEvents.dispatch(MemberCreatedEvent.create({
                source: 'member',
                ...eventData
            }));

            // Wait for the dispatched events (because this happens async)
            await DomainEvents.allSettled();
            mockManager.assert.sentEmail({
                to: 'owner@ghost.org',
                subject: /🥳 Free member signup: Jamie/
            });
            mockManager.assert.sentEmailCount(1);
        });

        it('sends email for api source', async function () {
            await staffService.init();
            DomainEvents.dispatch(MemberCreatedEvent.create({
                source: 'api',
                ...eventData
            }));

            // Wait for the dispatched events (because this happens async)
            await DomainEvents.allSettled();
            mockManager.assert.sentEmail({
                to: 'owner@ghost.org',
                subject: /🥳 Free member signup: Jamie/
            });
            mockManager.assert.sentEmailCount(1);
        });

        it('does not send email for importer source', async function () {
            await staffService.init();
            DomainEvents.dispatch(MemberCreatedEvent.create({
                source: 'import',
                ...eventData
            }));

            // Wait for the dispatched events (because this happens async)
            await DomainEvents.allSettled();
            mockManager.assert.sentEmailCount(0);
        });
    });

    describe('paid subscription start event:', function () {
        let eventData = {
            memberId: '1',
            tierId: 'tier-1',
            subscriptionId: 'sub-1',
            offerId: 'offer-1'
        };

        afterEach(function () {
            sinon.restore();
        });

        it('sends email for member source', async function () {
            await staffService.init();
            DomainEvents.dispatch(SubscriptionActivatedEvent.create({
                source: 'member',
                ...eventData
            }));

            // Wait for the dispatched events (because this happens async)
            await DomainEvents.allSettled();
            mockManager.assert.sentEmail({
                to: 'owner@ghost.org',
                subject: /💸 Paid subscription started: Jamie/
            });
            mockManager.assert.sentEmailCount(1);
        });

        it('sends email for api source', async function () {
            await staffService.init();
            DomainEvents.dispatch(SubscriptionActivatedEvent.create({
                source: 'api',
                ...eventData
            }));

            // Wait for the dispatched events (because this happens async)
            await DomainEvents.allSettled();
            mockManager.assert.sentEmail({
                to: 'owner@ghost.org',
                subject: /💸 Paid subscription started: Jamie/
            });
            mockManager.assert.sentEmailCount(1);
        });

        it('does not send email for importer source', async function () {
            await staffService.init();
            DomainEvents.dispatch(SubscriptionActivatedEvent.create({
                source: 'import',
                ...eventData
            }));

            // Wait for the dispatched events (because this happens async)
            await DomainEvents.allSettled();
            mockManager.assert.sentEmailCount(0);
        });
    });

    describe('paid subscription cancel event:', function () {
        let eventData = {
            memberId: '1',
            tierId: 'tier-1',
            subscriptionId: 'sub-1'
        };

        it('sends email for member source', async function () {
            await staffService.init();
            DomainEvents.dispatch(SubscriptionCancelledEvent.create({
                source: 'member',
                ...eventData
            }, new Date()));

            // Wait for the dispatched events (because this happens async)
            await DomainEvents.allSettled();
            mockManager.assert.sentEmail({
                to: 'owner@ghost.org',
                subject: /⚠️ Cancellation: Jamie/
            });
            mockManager.assert.sentEmailCount(1);
        });

        it('sends email for api source', async function () {
            await staffService.init();
            DomainEvents.dispatch(SubscriptionCancelledEvent.create({
                source: 'api',
                ...eventData
            }));

            // Wait for the dispatched events (because this happens async)
            await DomainEvents.allSettled();
            mockManager.assert.sentEmail({
                to: 'owner@ghost.org',
                subject: /⚠️ Cancellation: Jamie/
            });
            mockManager.assert.sentEmailCount(1);
        });

        it('does not send email for importer source', async function () {
            await staffService.init();
            DomainEvents.dispatch(SubscriptionCancelledEvent.create({
                source: 'import',
                ...eventData
            }));

            // Wait for the dispatched events (because this happens async)
            await DomainEvents.allSettled();
            mockManager.assert.sentEmailCount(0);
        });
    });

    describe('milestone created event:', function () {
        it('sends email for achieved milestone', async function () {
            await staffService.init();
            DomainEvents.dispatch(MilestoneCreatedEvent.create({
                milestone: {
                    type: 'arr',
                    currency: 'usd',
                    value: 1000,
                    createdAt: new Date(),
                    emailSentAt: new Date()
                },
                meta: {
                    currentValue: 105
                }
            }));

            // Wait for the dispatched events (because this happens async)
            await DomainEvents.allSettled();

            mockManager.assert.sentEmailCount(1);

            mockManager.assert.sentEmail({
                to: 'owner@ghost.org',
                subject: /The Weekly Roundup hit \$1,000 ARR/
            });
        });

        it('does not send email when no email created at provided or a reason is set', async function () {
            DomainEvents.dispatch(MilestoneCreatedEvent.create({
                milestone: {
                    type: 'arr',
                    currency: 'usd',
                    value: 1000,
                    createdAt: new Date(),
                    emailSentAt: null
                },
                meta: {
                    currentValue: 105
                }
            }));

            // Wait for the dispatched events (because this happens async)
            await DomainEvents.allSettled();

            DomainEvents.dispatch(MilestoneCreatedEvent.create({
                milestone: {
                    type: 'arr',
                    currency: 'usd',
                    value: 1000,
                    createdAt: new Date(),
                    emailSentAt: new Date(),
                    meta: {
                        currentValue: 105,
                        reason: 'import'
                    }
                }
            }));

            // Wait for the dispatched events (because this happens async)
            await DomainEvents.allSettled();

            mockManager.assert.sentEmailCount(0);
        });
    });
});
