const chai = require('chai');
const sinon = require('sinon');
const {expect} = chai;
const errors = require('@tryghost/errors');

const CheckoutSessionEventService = require('../../../../lib/services/CheckoutSessionEventService');

describe('CheckoutSessionEventService', function () {
    let api, memberRepository, donationRepository, staffServiceEmails;

    beforeEach(function () {
        api = {
            getSubscription: sinon.stub(),
            getCustomer: sinon.stub(),
            getSetupIntent: sinon.stub(),
            attachPaymentMethodToCustomer: sinon.stub(),
            updateSubscriptionDefaultPaymentMethod: sinon.stub()
        };

        memberRepository = {
            get: sinon.stub(),
            create: sinon.stub(),
            update: sinon.stub(),
            linkSubscription: sinon.stub(),
            upsertCustomer: sinon.stub()
        };

        donationRepository = {
            save: sinon.stub()
        };

        staffServiceEmails = {
            notifyDonationReceived: sinon.stub()
        };
    });

    describe('handleEvent', function () {
        it('should call handleSetupEvent if session mode is setup', async function () {
            const service = new CheckoutSessionEventService({api, memberRepository, donationRepository, staffServiceEmails});
            const session = {mode: 'setup'};
            const handleSetupEventStub = sinon.stub(service, 'handleSetupEvent');

            await service.handleEvent(session);

            expect(handleSetupEventStub.calledWith(session)).to.be.true;
        });

        it('should call handleSubscriptionEvent if session mode is subscription', async function () {
            const service = new CheckoutSessionEventService({api, memberRepository, donationRepository, staffServiceEmails});
            const session = {mode: 'subscription'};
            const handleSubscriptionEventStub = sinon.stub(service, 'handleSubscriptionEvent');

            await service.handleEvent(session);

            expect(handleSubscriptionEventStub.calledWith(session)).to.be.true;
        });

        it('should call handleDonationEvent if session mode is payment and session metadata ghost_donation is present', async function () {
            const service = new CheckoutSessionEventService({api, memberRepository, donationRepository, staffServiceEmails});
            const session = {mode: 'payment', metadata: {ghost_donation: true}};
            const handleDonationEventStub = sinon.stub(service, 'handleDonationEvent');

            await service.handleEvent(session);

            expect(handleDonationEventStub.calledWith(session)).to.be.true;
        });
    });

    describe('handleDonationEvent', function () {
        it('can handle donation event', async function () {
            const service = new CheckoutSessionEventService({api, memberRepository, donationRepository, staffServiceEmails});
            const session = {
                custom_fields: [{key: 'donation_message', text: {value: 'Test donation message'}}],
                amount_total: 1000,
                currency: 'usd',
                customer: 'cust_123',
                customer_details: {name: 'Test Name', email: ''},
                metadata: {
                    attribution_id: 'attr_123',
                    attribution_url: 'https://example.com/blog/',
                    attribution_type: 'referral',
                    referrer_source: 'google',
                    referrer_medium: 'cpc',
                    referrer_url: 'https://referrer.com'
                }
            };

            memberRepository.get.resolves(null);

            await service.handleDonationEvent(session);

            expect(donationRepository.save.calledOnce).to.be.true;

            const savedDonationEvent = donationRepository.save.getCall(0).args[0];

            expect(savedDonationEvent.amount).to.equal(1000);
            expect(savedDonationEvent.currency).to.equal('usd');
            expect(savedDonationEvent.name).to.equal('Test Name');
            expect(savedDonationEvent.email).to.equal('');
            expect(savedDonationEvent.donationMessage).to.equal('Test donation message');
            expect(savedDonationEvent.attributionId).to.equal('attr_123');
            expect(savedDonationEvent.attributionUrl).to.equal('https://example.com/blog/');
            expect(savedDonationEvent.attributionType).to.equal('referral');
            expect(savedDonationEvent.referrerSource).to.equal('google');
            expect(savedDonationEvent.referrerMedium).to.equal('cpc');
            expect(savedDonationEvent.referrerUrl).to.equal('https://referrer.com');
        });

        it('donation message is null if its empty', async function () {
            const service = new CheckoutSessionEventService({api, memberRepository, donationRepository, staffServiceEmails});
            const session = {
                custom_fields: [{key: 'donation_message', text: {value: ''}},
                    {key: 'donation_message', text: {value: null}}],
                amount_total: 1000,
                currency: 'usd',
                customer: 'cust_123',
                customer_details: {name: 'Test Name', email: ''},
                metadata: {
                    attribution_id: 'attr_123',
                    attribution_url: 'https://example.com/blog/',
                    attribution_type: 'referral',
                    referrer_source: 'google',
                    referrer_medium: 'cpc',
                    referrer_url: 'https://referrer.com'
                }
            };

            memberRepository.get.resolves(null);

            await service.handleDonationEvent(session);

            expect(donationRepository.save.calledOnce).to.be.true;

            const savedDonationEvent = donationRepository.save.getCall(0).args[0];

            expect(savedDonationEvent.donationMessage).to.equal(null);
        });

        it('can handle donation event with member', async function () {
            const service = new CheckoutSessionEventService({api, memberRepository, donationRepository, staffServiceEmails});
            const session = {
                custom_fields: [{key: 'donation_message', text: {value: 'Test donation message'}}],
                amount_total: 1000,
                currency: 'usd',
                customer: 'cust_123',
                customer_details: {name: 'Test Name', email: 'member@example.com'},
                metadata: {
                    attribution_id: 'attr_123',
                    attribution_url: 'https://example.com/blog/',
                    attribution_type: 'referral',
                    referrer_source: 'google',
                    referrer_medium: 'cpc',
                    referrer_url: 'https://referrer.com'
                }
            };

            const member = {
                get: sinon.stub(),
                id: 'member_123'
            };
    
            // Stub the `get` method on the member object
            member.get.withArgs('name').returns('Test Name');
            member.get.withArgs('email').returns('member@example.com');

            memberRepository.get.resolves(member);

            await service.handleDonationEvent(session);

            expect(donationRepository.save.calledOnce).to.be.true;

            const savedDonationEvent = donationRepository.save.getCall(0).args[0];

            expect(savedDonationEvent.amount).to.equal(1000);
            expect(savedDonationEvent.currency).to.equal('usd');
            expect(savedDonationEvent.name).to.equal('Test Name');
            expect(savedDonationEvent.email).to.equal('member@example.com');
            expect(savedDonationEvent.donationMessage).to.equal('Test donation message');
            expect(savedDonationEvent.attributionId).to.equal('attr_123');
            expect(savedDonationEvent.attributionUrl).to.equal('https://example.com/blog/');
            expect(savedDonationEvent.attributionType).to.equal('referral');
            expect(savedDonationEvent.referrerSource).to.equal('google');
            expect(savedDonationEvent.referrerMedium).to.equal('cpc');
            expect(savedDonationEvent.referrerUrl).to.equal('https://referrer.com');
        });
    });

    describe('handleSetupEvent', function () {
        it('fires getSetupIntent', function () {
            const service = new CheckoutSessionEventService({api, memberRepository, donationRepository, staffServiceEmails});
            const session = {setup_intent: 'si_123'};

            service.handleSetupEvent(session);

            expect(api.getSetupIntent.calledWith('si_123')).to.be.true;
        });

        it('fires getSetupIntent and memberRepository.get', async function () {
            const service = new CheckoutSessionEventService({api, memberRepository, donationRepository, staffServiceEmails});
            const session = {setup_intent: 'si_123'};
            const setupIntent = {metadata: {customer_id: 'cust_123'}};

            // mock memberRe

            api.getSetupIntent.resolves(setupIntent);

            await service.handleSetupEvent(session);

            expect(api.getSetupIntent.calledWith('si_123')).to.be.true;
            expect(memberRepository.get.calledWith({customer_id: 'cust_123'})).to.be.true;
        });

        it('fires getSetupIntent, memberRepository.get and attachPaymentMethodToCustomer', async function () {
            const service = new CheckoutSessionEventService({api, memberRepository, donationRepository, staffServiceEmails});
            const session = {setup_intent: 'si_123'};
            const setupIntent = {metadata: {customer_id: 'cust_123'}, payment_method: 'pm_123'};
            const member = {id: 'member_123', related: sinon.stub()};
            const fetchStub = sinon.stub();
            member.related.withArgs('stripeSubscriptions').returns({fetch: fetchStub});
            const mockSubscriptions = [
                {get: sinon.stub().withArgs('status').returns('active')},
                {get: sinon.stub().withArgs('status').returns('trialing')},
                {get: sinon.stub().withArgs('status').returns('unpaid')}
            ];
            fetchStub.resolves({models: mockSubscriptions});

            api.getSetupIntent.resolves(setupIntent);
            memberRepository.get.resolves(member);

            await service.handleSetupEvent(session);

            // mock member.related

            expect(api.getSetupIntent.calledWith('si_123')).to.be.true;
            expect(memberRepository.get.calledWith({customer_id: 'cust_123'})).to.be.true;
            expect(api.attachPaymentMethodToCustomer.calledWith('cust_123', 'pm_123')).to.be.true;
        });

        it('if member is not found, it should return early', async function () {
            const service = new CheckoutSessionEventService({api, memberRepository, donationRepository, staffServiceEmails});
            const session = {setup_intent: 'si_123'};
            const setupIntent = {metadata: {customer_id: 'cust_123'}};

            api.getSetupIntent.resolves(setupIntent);
            memberRepository.get.resolves(null);

            await service.handleSetupEvent(session);

            expect(api.getSetupIntent.calledWith('si_123')).to.be.true;
            expect(memberRepository.get.calledWith({customer_id: 'cust_123'})).to.be.true;
            expect(api.attachPaymentMethodToCustomer.called).to.be.false;
        });

        it('if setupIntent has subscription_id, it should update subscription default payment method', async function () {
            const service = new CheckoutSessionEventService({api, memberRepository, donationRepository, staffServiceEmails});
            const session = {setup_intent: 'si_123'};
            const setupIntent = {metadata: {customer_id: 'cust_123', subscription_id: 'sub_123'}, payment_method: 'pm_123'};
            const member = {id: 'member_123'};
            const updatedSubscription = {id: 'sub_123'};

            api.getSetupIntent.resolves(setupIntent);
            memberRepository.get.resolves(member);
            api.updateSubscriptionDefaultPaymentMethod.resolves(updatedSubscription);

            await service.handleSetupEvent(session);

            expect(api.updateSubscriptionDefaultPaymentMethod.calledWith('sub_123', 'pm_123')).to.be.true;
            expect(memberRepository.linkSubscription.calledWith({id: 'member_123', subscription: updatedSubscription})).to.be.true;
        });

        it('if linkSubscription fails with ER_DUP_ENTRY, it should throw ConflictError', async function () {
            const service = new CheckoutSessionEventService({api, memberRepository, donationRepository, staffServiceEmails});
            const session = {setup_intent: 'si_123'};
            const setupIntent = {metadata: {customer_id: 'cust_123', subscription_id: 'sub_123'}, payment_method: 'pm_123'};
            const member = {id: 'member_123'};
            const updatedSubscription = {id: 'sub_123'};

            api.getSetupIntent.resolves(setupIntent);
            memberRepository.get.resolves(member);
            api.updateSubscriptionDefaultPaymentMethod.resolves(updatedSubscription);
            memberRepository.linkSubscription.rejects({code: 'ER_DUP_ENTRY'});

            try {
                await service.handleSetupEvent(session);
                expect.fail('Expected ConflictError');
            } catch (err) {
                expect(err.name).to.equal('ConflictError');
            }
        });

        it('if linkSubscription fails with SQLITE_CONSTRAINT, it should throw ConflictError', async function () {
            const service = new CheckoutSessionEventService({api, memberRepository, donationRepository, staffServiceEmails});
            const session = {setup_intent: 'si_123'};
            const setupIntent = {metadata: {customer_id: 'cust_123', subscription_id: 'sub_123'}, payment_method: 'pm_123'};
            const member = {id: 'member_123'};
            const updatedSubscription = {id: 'sub_123'};

            api.getSetupIntent.resolves(setupIntent);
            memberRepository.get.resolves(member);
            api.updateSubscriptionDefaultPaymentMethod.resolves(updatedSubscription);
            memberRepository.linkSubscription.rejects({code: 'SQLITE_CONSTRAINT'});

            try {
                await service.handleSetupEvent(session);
                expect.fail('Expected ConflictError');
            } catch (err) {
                expect(err.name).to.equal('ConflictError');
            }
        });

        it('if linkSubscription fails with unexpected error, it should throw', async function () {
            const service = new CheckoutSessionEventService({api, memberRepository, donationRepository, staffServiceEmails});
            const session = {setup_intent: 'si_123'};
            const setupIntent = {metadata: {customer_id: 'cust_123', subscription_id: 'sub_123'}, payment_method: 'pm_123'};
            const member = {id: 'member_123'};
            const updatedSubscription = {id: 'sub_123'};

            api.getSetupIntent.resolves(setupIntent);
            memberRepository.get.resolves(member);
            api.updateSubscriptionDefaultPaymentMethod.resolves(updatedSubscription);
            memberRepository.linkSubscription.rejects(new Error('Unexpected error'));

            try {
                await service.handleSetupEvent(session);
                expect.fail('Expected error');
            } catch (err) {
                expect(err.message).to.equal('Unexpected error');
            }
        });

        it('updateSubscriptionDefaultPaymentMethod of all active subscriptions', async function () {
            const service = new CheckoutSessionEventService({api, memberRepository, donationRepository, staffServiceEmails});
            const session = {setup_intent: 'si_123'};
            const setupIntent = {metadata: {customer_id: 'cust_123'}, payment_method: 'pm_123'};
            const member = {id: 'member_123', related: sinon.stub()};
            const fetchStub = sinon.stub();
            member.related.withArgs('stripeSubscriptions').returns({fetch: fetchStub});
            const mockSubscriptions = [
                {
                    get: sinon.stub().callsFake((key) => {
                        if (key === 'status') {
                            return 'active';
                        }
                        if (key === 'customer_id') {
                            return 'cust_123';
                        }
                        if (key === 'subscription_id') {
                            return 'sub_123';
                        }
                    })
                },
                {
                    get: sinon.stub().callsFake((key) => {
                        if (key === 'status') {
                            return 'trialing';
                        }
                        if (key === 'customer_id') {
                            return 'cust_123';
                        }
                        if (key === 'subscription_id') {
                            return 'sub_456';
                        }
                    })
                },
                {
                    get: sinon.stub().callsFake((key) => {
                        if (key === 'status') {
                            return 'canceled';
                        }
                        if (key === 'customer_id') {
                            return 'cust_123';
                        }
                    })
                }
            ];
            fetchStub.resolves({models: mockSubscriptions});

            api.getSetupIntent.resolves(setupIntent);
            memberRepository.get.resolves(member);

            await service.handleSetupEvent(session);

            expect(api.updateSubscriptionDefaultPaymentMethod.calledTwice).to.be.true;
        });

        it('throws if updateSubscriptionDefaultPaymentMethod fires but cannot link subscription', async function () {
            const service = new CheckoutSessionEventService({api, memberRepository, donationRepository, staffServiceEmails});
            const session = {setup_intent: 'si_123'};
            const setupIntent = {metadata: {customer_id: 'cust_123'}, payment_method: 'pm_123'};
            const member = {id: 'member_123', related: sinon.stub()};
            const fetchStub = sinon.stub();
            member.related.withArgs('stripeSubscriptions').returns({fetch: fetchStub});
            const mockSubscriptions = [
                {
                    get: sinon.stub().callsFake((key) => {
                        if (key === 'status') {
                            return 'active';
                        }
                        if (key === 'customer_id') {
                            return 'cust_123';
                        }
                        if (key === 'subscription_id') {
                            return 'sub_123';
                        }
                    })
                }
            ];
            fetchStub.resolves({models: mockSubscriptions});

            api.getSetupIntent.resolves(setupIntent);
            memberRepository.get.resolves(member);
            api.updateSubscriptionDefaultPaymentMethod.resolves({id: 'sub_123'});
            memberRepository.linkSubscription.rejects(new Error('Unexpected error'));

            try {
                await service.handleSetupEvent(session);
                expect.fail('Expected error');
            } catch (err) {
                expect(err.message).to.equal('Unexpected error');
            }
        });

        it('throws is linkSubscription fauls with conflict error', async function () {
            const service = new CheckoutSessionEventService({api, memberRepository, donationRepository, staffServiceEmails});
            const session = {setup_intent: 'si_123'};
            const setupIntent = {metadata: {customer_id: 'cust_123', subscription_id: 'sub_123'}, payment_method: 'pm_123'};
            const member = {id: 'member_123'};
            const updatedSubscription = {id: 'sub_123'};

            api.getSetupIntent.resolves(setupIntent);
            memberRepository.get.resolves(member);
            api.updateSubscriptionDefaultPaymentMethod.resolves(updatedSubscription);
            memberRepository.linkSubscription.rejects({code: 'ER_DUP_ENTRY'});

            try {
                await service.handleSetupEvent(session);
                expect.fail('Expected ConflictError');
            } catch (err) {
                // Ensure that the error is an instance of ConflictError
                expect(err).to.be.instanceOf(errors.ConflictError);
                // Check the error message
                expect(err.message).to.equal('The server has encountered an conflict.');
            }
        });
    });
});