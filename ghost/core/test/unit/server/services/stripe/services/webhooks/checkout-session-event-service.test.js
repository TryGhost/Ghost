const assert = require('node:assert/strict');
const errors = require('@tryghost/errors');
const sinon = require('sinon');

const CheckoutSessionEventService = require('../../../../../../../core/server/services/stripe/services/webhook/checkout-session-event-service');

describe('CheckoutSessionEventService', function () {
    let api, memberRepository, donationRepository, staffServiceEmails, sendSignupEmail, isPaidWelcomeEmailActive;

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
            create: sinon.stub().resolves({
                id: 'created_member'
            }),
            update: sinon.stub(),
            linkSubscription: sinon.stub(),
            upsertCustomer: sinon.stub(),
            removeComplimentarySubscription: sinon.stub()
        };

        donationRepository = {
            save: sinon.stub()
        };

        staffServiceEmails = {
            notifyDonationReceived: sinon.stub()
        };

        sendSignupEmail = sinon.stub();
        isPaidWelcomeEmailActive = sinon.stub().resolves(false);
    });

    function createService(deps = {}) {
        return new CheckoutSessionEventService({
            api,
            memberRepository,
            donationRepository,
            staffServiceEmails,
            sendSignupEmail,
            isPaidWelcomeEmailActive,
            ...deps
        });
    }

    describe('handleEvent', function () {
        it('should call handleSetupEvent if session mode is setup', async function () {
            const service = createService();
            const session = {mode: 'setup'};
            const handleSetupEventStub = sinon.stub(service, 'handleSetupEvent');

            await service.handleEvent(session);

            sinon.assert.calledWith(handleSetupEventStub, session);
        });

        it('should call handleSubscriptionEvent if session mode is subscription', async function () {
            const service = createService();
            const session = {mode: 'subscription'};
            const handleSubscriptionEventStub = sinon.stub(service, 'handleSubscriptionEvent');

            await service.handleEvent(session);

            sinon.assert.calledWith(handleSubscriptionEventStub, session);
        });

        it('should call handleDonationEvent if session mode is payment and session metadata ghost_donation is present', async function () {
            const service = createService();
            const session = {mode: 'payment', metadata: {ghost_donation: true}};
            const handleDonationEventStub = sinon.stub(service, 'handleDonationEvent');

            await service.handleEvent(session);

            sinon.assert.calledWith(handleDonationEventStub, session);
        });

        it('should do nothing if session mode is not setup, subscription, or payment', async function () {
            const service = createService();
            const session = {mode: 'unsupported_mode'};
            const handleSetupEventStub = sinon.stub(service, 'handleSetupEvent');
            const handleSubscriptionEventStub = sinon.stub(service, 'handleSubscriptionEvent');
            const handleDonationEventStub = sinon.stub(service, 'handleDonationEvent');

            await service.handleEvent(session);

            sinon.assert.notCalled(handleSetupEventStub);
            sinon.assert.notCalled(handleSubscriptionEventStub);
            sinon.assert.notCalled(handleDonationEventStub);
        });
    });

    describe('handleDonationEvent', function () {
        it('can handle donation event', async function () {
            const service = createService();
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

            sinon.assert.calledOnce(donationRepository.save);

            const savedDonationEvent = donationRepository.save.getCall(0).args[0];

            assert.equal(savedDonationEvent.amount, 1000);
            assert.equal(savedDonationEvent.currency, 'usd');
            assert.equal(savedDonationEvent.name, 'Test Name');
            assert.equal(savedDonationEvent.email, '');
            assert.equal(savedDonationEvent.donationMessage, 'Test donation message');
            assert.equal(savedDonationEvent.attributionId, 'attr_123');
            assert.equal(savedDonationEvent.attributionUrl, 'https://example.com/blog/');
            assert.equal(savedDonationEvent.attributionType, 'referral');
            assert.equal(savedDonationEvent.referrerSource, 'google');
            assert.equal(savedDonationEvent.referrerMedium, 'cpc');
            assert.equal(savedDonationEvent.referrerUrl, 'https://referrer.com');
        });

        it('donation message is null if its empty', async function () {
            const service = createService();
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

            sinon.assert.calledOnce(donationRepository.save);

            const savedDonationEvent = donationRepository.save.getCall(0).args[0];
            assert.equal(savedDonationEvent.donationMessage, null);
        });

        it('can handle donation event with member', async function () {
            const service = createService();
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

            // expect(donationRepository.save.calledOnce).to.be.true;
            sinon.assert.calledOnce(donationRepository.save);

            const savedDonationEvent = donationRepository.save.getCall(0).args[0];

            assert.equal(savedDonationEvent.amount, 1000);
            assert.equal(savedDonationEvent.currency, 'usd');
            assert.equal(savedDonationEvent.name, 'Test Name');
            assert.equal(savedDonationEvent.email, 'member@example.com');
            assert.equal(savedDonationEvent.donationMessage, 'Test donation message');
            assert.equal(savedDonationEvent.attributionId, 'attr_123');
            assert.equal(savedDonationEvent.attributionUrl, 'https://example.com/blog/');
            assert.equal(savedDonationEvent.attributionType, 'referral');
            assert.equal(savedDonationEvent.referrerSource, 'google');
            assert.equal(savedDonationEvent.referrerMedium, 'cpc');
            assert.equal(savedDonationEvent.referrerUrl, 'https://referrer.com');
        });

        it('can handle donation event with empty customer email', async function () {
            const service = createService();
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

            const member = {
                get: sinon.stub(),
                id: 'member_123'
            };

            member.get.withArgs('name').returns('Test Name');
            member.get.withArgs('email').returns('');

            memberRepository.get.resolves(member);

            await service.handleDonationEvent(session);

            sinon.assert.calledOnce(donationRepository.save);

            const savedDonationEvent = donationRepository.save.getCall(0).args[0];

            assert.equal(savedDonationEvent.amount, 1000);
        });
    });

    describe('handleSetupEvent', function () {
        it('fires getSetupIntent', function () {
            const service = createService();
            const session = {setup_intent: 'si_123'};

            service.handleSetupEvent(session);

            sinon.assert.calledWith(api.getSetupIntent, 'si_123');
        });

        it('fires getSetupIntent and memberRepository.get', async function () {
            const service = createService();
            const session = {setup_intent: 'si_123'};
            const setupIntent = {metadata: {customer_id: 'cust_123'}};

            api.getSetupIntent.resolves(setupIntent);

            await service.handleSetupEvent(session);

            sinon.assert.calledWith(api.getSetupIntent, 'si_123');
            sinon.assert.calledWith(memberRepository.get, {customer_id: 'cust_123'});
        });

        it('fires getSetupIntent, memberRepository.get and attachPaymentMethodToCustomer', async function () {
            const service = createService();
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

            sinon.assert.calledWith(api.getSetupIntent, 'si_123');
            sinon.assert.calledWith(memberRepository.get, {customer_id: 'cust_123'});
            sinon.assert.called(api.attachPaymentMethodToCustomer);
        });

        it('if member is not found, it should return early', async function () {
            const service = createService();
            const session = {setup_intent: 'si_123'};
            const setupIntent = {metadata: {customer_id: 'cust_123'}};

            api.getSetupIntent.resolves(setupIntent);
            memberRepository.get.resolves(null);

            await service.handleSetupEvent(session);

            sinon.assert.calledWith(api.getSetupIntent, 'si_123');
            sinon.assert.calledWith(memberRepository.get, {customer_id: 'cust_123'});
            sinon.assert.notCalled(api.attachPaymentMethodToCustomer);
        });

        it('if setupIntent has subscription_id, it should update subscription default payment method', async function () {
            const service = createService();
            const session = {setup_intent: 'si_123'};
            const setupIntent = {metadata: {customer_id: 'cust_123', subscription_id: 'sub_123'}, payment_method: 'pm_123'};
            const member = {id: 'member_123'};
            const updatedSubscription = {id: 'sub_123'};

            api.getSetupIntent.resolves(setupIntent);
            memberRepository.get.resolves(member);
            api.updateSubscriptionDefaultPaymentMethod.resolves(updatedSubscription);

            await service.handleSetupEvent(session);

            sinon.assert.calledWith(api.updateSubscriptionDefaultPaymentMethod, 'sub_123', 'pm_123');
            sinon.assert.calledWith(memberRepository.linkSubscription, {id: 'member_123', subscription: updatedSubscription});
        });

        it('if linkSubscription fails with ER_DUP_ENTRY, it should throw ConflictError', async function () {
            const service = createService();
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
                assert.fail('Expected ConflictError');
            } catch (err) {
                assert.equal(err.name, 'ConflictError');
            }
        });

        it('if linkSubscription fails with SQLITE_CONSTRAINT, it should throw ConflictError', async function () {
            const service = createService();
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
                assert.fail('Expected ConflictError');
            } catch (err) {
                assert.equal(err.name, 'ConflictError');
            }
        });

        it('if linkSubscription fails with unexpected error, it should throw', async function () {
            const service = createService();
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

                assert.fail('Expected error');
            } catch (err) {
                assert.equal(err.message, 'Unexpected error');
            }
        });

        it('updateSubscriptionDefaultPaymentMethod of all active subscriptions', async function () {
            const service = createService();
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

            sinon.assert.calledTwice(api.updateSubscriptionDefaultPaymentMethod);
        });

        it('throws if updateSubscriptionDefaultPaymentMethod fires but cannot link subscription', async function () {
            const service = createService();
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
                assert.fail('Expected error');
            } catch (err) {
                assert.equal(err.message, 'Unexpected error');
            }
        });

        it('throws is linkSubscription fauls with conflict error', async function () {
            const service = createService();
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
                assert.fail('Expected ConflictError');
            } catch (err) {
                assert(err instanceof errors.ConflictError);
                assert.equal(err.message, 'The server has encountered an conflict.');
            }
        });

        it('should throw ConflictError if linkSubscription fails with ER_DUP_ENTRY', async function () {
            const service = createService();
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
                assert.fail('Expected ConflictError');
            } catch (err) {
                assert(err instanceof errors.ConflictError);
            }
        });

        it('should throw ConflictError if linkSubscription fails with SQLITE_CONSTRAINT', async function () {
            const service = createService();
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
                assert.fail('Expected ConflictError');
            } catch (err) {
                assert(err instanceof errors.ConflictError);
            }
        });
    });

    describe('handleSubscriptionEvent', function () {
        let service;
        let session;
        let customer;
        let member;

        beforeEach(function () {
            service = createService();
            session = {
                customer: 'cust_123',
                metadata: {
                    name: 'Metadata Name',
                    newsletters: JSON.stringify([{id: 1, name: 'Newsletter'}]),
                    attribution_id: 'attr_123',
                    attribution_url: 'https://example.com',
                    attribution_type: 'referral',
                    referrer_source: 'google',
                    referrer_medium: 'cpc',
                    referrer_url: 'https://referrer.com',
                    offer: 'offer_123',
                    checkoutType: 'new'
                }
            };

            customer = {
                email: 'customer@example.com',
                id: 'cust_123',
                subscriptions: {
                    data: [
                        {
                            default_payment_method: {
                                billing_details: {name: 'Customer Name'}
                            }
                        }
                    ]
                }
            };

            member = {
                get: sinon.stub(),
                id: 'member_123'
            };
        });

        it('should get customer and member', async function () {
            api.getCustomer.resolves(customer);
            memberRepository.get.resolves(member);

            await service.handleSubscriptionEvent(session);

            sinon.assert.calledWith(api.getCustomer, 'cust_123', {expand: ['subscriptions.data.default_payment_method']});
            sinon.assert.calledWith(memberRepository.get, {email: 'customer@example.com'});
        });

        it('should create new member if not found', async function () {
            api.getCustomer.resolves(customer);
            memberRepository.get.resolves(null);

            await service.handleSubscriptionEvent(session);

            sinon.assert.calledOnce(memberRepository.create);
            const memberData = memberRepository.create.getCall(0).args[0];

            assert.equal(memberData.email, 'customer@example.com');

            assert.equal(memberData.name, 'Metadata Name'); // falls back to metadata name if payerName doesn't exist
            assert.deepEqual(memberData.newsletters, [{id: 1, name: 'Newsletter'}]);
            assert.deepEqual(memberData.attribution, {
                id: 'attr_123',
                url: 'https://example.com',
                type: 'referral',
                referrerSource: 'google',
                referrerMedium: 'cpc',
                referrerUrl: 'https://referrer.com'
            });
        });

        it('should create new member with payerName if it exists', async function () {
            api.getCustomer.resolves(customer);
            memberRepository.get.resolves(null);
            session.metadata.name = 'Session Name';

            await service.handleSubscriptionEvent(session);

            sinon.assert.calledOnce(memberRepository.create);
            const memberData = memberRepository.create.getCall(0).args[0];

            assert.equal(memberData.email, 'customer@example.com');

            assert.equal(memberData.name, 'Session Name');

            assert.deepEqual(memberData.newsletters, [{id: 1, name: 'Newsletter'}]);
        });

        it('should create new member with newsletters if metadata newsletters is not valid JSON', async function () {
            api.getCustomer.resolves(customer);
            memberRepository.get.resolves(null);
            session.metadata.newsletters = 'invalid';

            await service.handleSubscriptionEvent(session);

            const memberData = memberRepository.create.getCall(0).args[0];
            assert.equal(memberData.email, 'customer@example.com');
            assert.equal(memberData.name, 'Metadata Name');
            assert.equal(memberData.newsletters, undefined);
        });

        it('should update member if found', async function () {
            api.getCustomer.resolves(customer);
            memberRepository.get.resolves(member);
            // change member name
            customer.subscriptions.data[0].default_payment_method.billing_details.name = 'New Customer Name';
            await service.handleSubscriptionEvent(session);

            sinon.assert.calledOnce(memberRepository.update);
            const memberData = memberRepository.update.getCall(0).args[0];
            assert.equal(memberData.name, 'New Customer Name');
        });

        it('should update member with payerName if it exists', async function () {
            api.getCustomer.resolves(customer);
            memberRepository.get.resolves(member);
            session.metadata.name = 'Session Name';
            // change member name
            customer.subscriptions.data[0].default_payment_method.billing_details.name = 'New Customer Name';
            await service.handleSubscriptionEvent(session);

            sinon.assert.calledOnce(memberRepository.update);
            const memberData = memberRepository.update.getCall(0).args[0];
            assert.equal(memberData.name, 'New Customer Name');
        });

        it('should update member with newsletters if metadata newsletters is not valid JSON', async function () {
            api.getCustomer.resolves(customer);
            memberRepository.get.resolves(member);
            session.metadata.newsletters = 'invalid';
            // change member name
            customer.subscriptions.data[0].default_payment_method.billing_details.name = 'New Customer Name';
            await service.handleSubscriptionEvent(session);

            sinon.assert.calledOnce(memberRepository.update);
            const memberData = memberRepository.update.getCall(0).args[0];
            assert.equal(memberData.newsletters, undefined);
        });

        describe('signup email logic', function () {
            it('should send signup email for direct checkout flow even when welcome email is active', async function () {
                api.getCustomer.resolves(customer);
                memberRepository.get.resolves(null);
                session.metadata.ghostSignupContext = 'needs_magic_link_email';
                isPaidWelcomeEmailActive.resolves(true);

                await service.handleSubscriptionEvent(session);

                sinon.assert.calledOnce(sendSignupEmail);
                sinon.assert.calledWith(sendSignupEmail, 'customer@example.com');
                sinon.assert.notCalled(isPaidWelcomeEmailActive);
            });

            it('should send signup email when flow is has_precheckout_magic_link and welcome email is not active', async function () {
                api.getCustomer.resolves(customer);
                memberRepository.get.resolves(null);
                session.metadata.ghostSignupContext = 'has_precheckout_magic_link';
                isPaidWelcomeEmailActive.resolves(false);

                await service.handleSubscriptionEvent(session);

                sinon.assert.calledOnce(sendSignupEmail);
                sinon.assert.calledWith(sendSignupEmail, 'customer@example.com');
            });

            it('should NOT send signup email when flow is has_precheckout_magic_link and welcome email is active', async function () {
                api.getCustomer.resolves(customer);
                memberRepository.get.resolves(null);
                session.metadata.ghostSignupContext = 'has_precheckout_magic_link';
                isPaidWelcomeEmailActive.resolves(true);

                await service.handleSubscriptionEvent(session);

                sinon.assert.notCalled(sendSignupEmail);
            });

            it('should send signup email when flow is already_authenticated and welcome email is not active', async function () {
                api.getCustomer.resolves(customer);
                memberRepository.get.resolves(null);
                session.metadata.ghostSignupContext = 'already_authenticated';
                isPaidWelcomeEmailActive.resolves(false);

                await service.handleSubscriptionEvent(session);

                sinon.assert.calledOnce(sendSignupEmail);
                sinon.assert.calledWith(sendSignupEmail, 'customer@example.com');
            });

            it('should NOT send signup email when flow is already_authenticated and welcome email is active', async function () {
                api.getCustomer.resolves(customer);
                memberRepository.get.resolves(null);
                session.metadata.ghostSignupContext = 'already_authenticated';
                isPaidWelcomeEmailActive.resolves(true);

                await service.handleSubscriptionEvent(session);

                sinon.assert.notCalled(sendSignupEmail);
            });

            it('should send signup email when flow metadata is missing for backward compatibility', async function () {
                api.getCustomer.resolves(customer);
                memberRepository.get.resolves(null);
                delete session.metadata.ghostSignupContext;
                isPaidWelcomeEmailActive.resolves(true);

                await service.handleSubscriptionEvent(session);

                sinon.assert.calledOnce(sendSignupEmail);
                sinon.assert.calledWith(sendSignupEmail, 'customer@example.com');
                sinon.assert.notCalled(isPaidWelcomeEmailActive);
            });

            it('should NOT send signup email on upgrade regardless of flow or welcome email', async function () {
                api.getCustomer.resolves(customer);
                memberRepository.get.resolves(member);
                session.metadata.checkoutType = 'upgrade';
                session.metadata.ghostSignupContext = 'has_precheckout_magic_link';
                isPaidWelcomeEmailActive.resolves(false);

                await service.handleSubscriptionEvent(session);

                sinon.assert.notCalled(sendSignupEmail);
            });
        });
    });
});
