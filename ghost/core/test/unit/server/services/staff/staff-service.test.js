// Switch these lines once there are useful utils
const assert = require('node:assert/strict');
// const testUtils = require('./utils');
const sinon = require('sinon');
const {MemberCreatedEvent, SubscriptionCancelledEvent, SubscriptionActivatedEvent} = require('../../../../../core/shared/events');
const MilestoneCreatedEvent = require('../../../../../core/server/services/milestones/milestone-created-event');

// Stuff we are testing
const DomainEvents = require('@tryghost/domain-events');

const StaffService = require('../../../../../core/server/services/staff/staff-service');

function testCommonMailData({mailStub, getEmailAlertUsersStub}) {
    sinon.assert.calledWith(getEmailAlertUsersStub, sinon.match.string, sinon.match({transacting: {}, forUpdate: true}));

    // has right from/to address
    sinon.assert.calledWith(mailStub, sinon.match({
        from: '"Default" <default@email.com>',
        to: 'owner@ghost.org'
    }));

    // Email HTML contains important bits

    // Has accent color
    sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('#ffffff')));

    // Has email
    sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('member@example.com')));

    // Has member url
    sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('https://admin.ghost.example/#/members/abc')));

    // Has site url
    sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('https://ghost.example')));

    // Has staff admin url
    sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('https://admin.ghost.example/#/settings/staff/ghost/email-notifications')));
}

function testCommonPaidSubMailData({member, mailStub, getEmailAlertUsersStub}) {
    testCommonMailData({mailStub, getEmailAlertUsersStub});
    sinon.assert.calledWith(getEmailAlertUsersStub, 'paid-started');

    if (member?.name) {
        sinon.assert.calledWith(mailStub, sinon.match({subject: '💸 Paid subscription started: Ghost'}));

        sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('💸 Paid subscription started: Ghost')));
    } else {
        sinon.assert.calledWith(mailStub, sinon.match({subject: '💸 Paid subscription started: member@example.com'}));

        sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('💸 Paid subscription started: member@example.com')));
    }

    sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Test Tier')));
    sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('$50.00/month')));
}

function testCommonPaidSubCancelMailData({mailStub, getEmailAlertUsersStub}) {
    testCommonMailData({mailStub, getEmailAlertUsersStub});
    sinon.assert.calledWith(getEmailAlertUsersStub, 'paid-canceled');
    sinon.assert.calledWith(mailStub, sinon.match({subject: '⚠️ Cancellation: Ghost'}));

    sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('⚠️ Cancellation: Ghost')));
    sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Test Tier')));
    sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('$50.00/month')));
}

describe('StaffService', function () {
    describe('Constructor', function () {
        it('doesn\'t throw', function () {
            new StaffService({});
        });
    });

    describe('email notifications:', function () {
        let mailStub;
        let loggingWarningStub;
        let subscribeStub;
        let getEmailAlertUsersStub;
        let service;
        let options = {
            transacting: {},
            forUpdate: true
        };
        let stubs;
        let labs = {
            isSet: () => {
                return false;
            }
        };

        const settingsCache = {
            get: (setting) => {
                if (setting === 'title') {
                    return 'Ghost Site';
                } else if (setting === 'accent_color') {
                    return '#ffffff';
                }
                return '';
            }
        };

        const urlUtils = {
            getSiteUrl: () => {
                return 'https://ghost.example';
            },
            urlJoin: (adminUrl,hash,path) => {
                return `${adminUrl}/${hash}${path}`;
            },
            urlFor: () => {
                return 'https://admin.ghost.example';
            }
        };

        const blogIcon = {
            getIconUrl: () => {
                return 'https://ghost.example/siteicon.png';
            }
        };

        const settingsHelpers = {
            getDefaultEmail: () => ({
                address: 'default@email.com',
                name: 'Default'
            })
        };

        beforeEach(function () {
            loggingWarningStub = sinon.stub().resolves();
            mailStub = sinon.stub().resolves();
            subscribeStub = sinon.stub().resolves();
            getEmailAlertUsersStub = sinon.stub().resolves([{
                email: 'owner@ghost.org',
                slug: 'ghost'
            }]);
            service = new StaffService({
                logging: {
                    warn: loggingWarningStub,
                    error: () => {}
                },
                models: {
                    User: {
                        getEmailAlertUsers: getEmailAlertUsersStub
                    }
                },
                mailer: {
                    send: mailStub
                },
                DomainEvents: {
                    subscribe: subscribeStub
                },
                settingsCache,
                urlUtils,
                blogIcon,
                settingsHelpers,
                labs
            });
            stubs = {mailStub, getEmailAlertUsersStub};
        });
        afterEach(function () {
            sinon.restore();
        });

        describe('subscribeEvents', function () {
            it('subscribes to events', async function () {
                service.subscribeEvents();
                sinon.assert.callCount(subscribeStub, 4);
                sinon.assert.calledWith(subscribeStub, SubscriptionActivatedEvent);
                sinon.assert.calledWith(subscribeStub, SubscriptionCancelledEvent);
                sinon.assert.calledWith(subscribeStub, MemberCreatedEvent);
                sinon.assert.calledWith(subscribeStub, MilestoneCreatedEvent);
            });

            it('listens to events', async function () {
                service = new StaffService({
                    logging: {
                        warn: () => {},
                        error: () => {}
                    },
                    models: {
                        User: {
                            getEmailAlertUsers: getEmailAlertUsersStub
                        }
                    },
                    mailer: {
                        send: mailStub
                    },
                    DomainEvents,
                    settingsCache,
                    urlUtils,
                    blogIcon,
                    settingsHelpers
                });
                service.subscribeEvents();
                sinon.spy(service, 'handleEvent');
                DomainEvents.dispatch(MemberCreatedEvent.create({
                    source: 'member',
                    memberId: 'member-2'
                }));
                await DomainEvents.allSettled();
                sinon.assert.calledWith(service.handleEvent, MemberCreatedEvent);

                DomainEvents.dispatch(SubscriptionActivatedEvent.create({
                    source: 'member',
                    memberId: 'member-1',
                    subscriptionId: 'sub-1',
                    offerId: 'offer-1',
                    tierId: 'tier-1'
                }));
                await DomainEvents.allSettled();
                sinon.assert.calledWith(service.handleEvent, SubscriptionActivatedEvent);

                DomainEvents.dispatch(SubscriptionCancelledEvent.create({
                    source: 'member',
                    memberId: 'member-1',
                    subscriptionId: 'sub-1',
                    tierId: 'tier-1'
                }));
                await DomainEvents.allSettled();
                sinon.assert.calledWith(service.handleEvent, SubscriptionCancelledEvent);

                DomainEvents.dispatch(MilestoneCreatedEvent.create({
                    milestone: {
                        type: 'arr',
                        value: '100',
                        currency: 'usd'
                    }
                }));
                await DomainEvents.allSettled();
                sinon.assert.calledWith(service.handleEvent, MilestoneCreatedEvent);
            });
        });

        describe('handleEvent', function () {
            beforeEach(function () {
                const models = {
                    User: {
                        getEmailAlertUsers: sinon.stub().resolves([{
                            email: 'owner@ghost.org',
                            slug: 'ghost'
                        }]),
                        findAll: sinon.stub().resolves([{
                            toJSON: sinon.stub().returns({
                                email: 'owner@ghost.org',
                                slug: 'ghost'
                            })
                        }])
                    },
                    Member: {
                        findOne: sinon.stub().resolves({
                            toJSON: sinon.stub().returns({
                                id: '1',
                                email: 'jamie@example.com',
                                name: 'Jamie',
                                status: 'free',
                                geolocation: null,
                                created_at: '2022-08-01T07:30:39.882Z'
                            })
                        })
                    },
                    Product: {
                        findOne: sinon.stub().resolves({
                            toJSON: sinon.stub().returns({
                                id: 'tier-1',
                                name: 'Tier 1'
                            })
                        })
                    },
                    Offer: {
                        findOne: sinon.stub().resolves({
                            toJSON: sinon.stub().returns({
                                discount_amount: 1000,
                                duration: 'forever',
                                discount_type: 'fixed',
                                name: 'Test offer',
                                duration_in_months: null
                            })
                        })
                    },
                    StripeCustomerSubscription: {
                        findOne: sinon.stub().resolves({
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
                        })
                    }
                };

                service = new StaffService({
                    logging: {
                        warn: () => {},
                        error: () => {}
                    },
                    models: models,
                    mailer: {
                        send: mailStub
                    },
                    DomainEvents: {
                        subscribe: subscribeStub
                    },
                    settingsCache,
                    urlUtils,
                    blogIcon,
                    settingsHelpers,
                    labs: {
                        isSet: () => {
                            return false;
                        }
                    },
                    memberAttributionService: {
                        getSubscriptionCreatedAttribution: sinon.stub().resolves(),
                        getMemberCreatedAttribution: sinon.stub().resolves(),
                        fetchResource: sinon.stub().callsFake((attribution) => {
                            return Promise.resolve({
                                title: attribution.title,
                                url: attribution.url,
                                type: attribution.type,
                                referrerSource: attribution.referrerSource
                            });
                        })
                    }
                });
            });
            it('handles free member created event', async function () {
                await service.handleEvent(MemberCreatedEvent, {
                    data: {
                        source: 'member',
                        memberId: 'member-1'
                    }
                });

                sinon.assert.called(service.memberAttributionService.getMemberCreatedAttribution);

                sinon.assert.calledWith(mailStub, sinon.match({subject: '🥳 Free member signup: Jamie'}));
            });
            it('handles free member created event with provided attribution', async function () {
                await service.handleEvent(MemberCreatedEvent, {
                    data: {
                        source: 'member',
                        memberId: 'member-1',
                        attribution: {
                            title: 'Welcome Post',
                            url: 'https://example.com/welcome',
                            type: 'post',
                            referrerSource: 'Direct'
                        }
                    }
                });

                // provided attribution should be used instead of fetching it
                sinon.assert.notCalled(service.memberAttributionService.getMemberCreatedAttribution);
                sinon.assert.called(service.memberAttributionService.fetchResource);

                sinon.assert.calledWith(mailStub, sinon.match({subject: '🥳 Free member signup: Jamie'}));
            });

            it('handles paid member created event', async function () {
                await service.handleEvent(SubscriptionActivatedEvent, {
                    data: {
                        source: 'member',
                        memberId: 'member-1',
                        subscriptionId: 'sub-1',
                        offerId: 'offer-1',
                        tierId: 'tier-1'
                    }
                });

                sinon.assert.called(service.memberAttributionService.getSubscriptionCreatedAttribution);

                sinon.assert.calledWith(mailStub, sinon.match({subject: '💸 Paid subscription started: Jamie'}));
            });

            it('handles paid member created event with provided attribution', async function () {
                await service.handleEvent(SubscriptionActivatedEvent, {
                    data: {
                        source: 'member',
                        memberId: 'member-1',
                        subscriptionId: 'sub-1',
                        offerId: 'offer-1',
                        tierId: 'tier-1',
                        attribution: {
                            title: 'Welcome Post',
                            url: 'https://example.com/welcome',
                            type: 'post',
                            referrerSource: 'Direct'
                        }
                    }
                });

                // provided attribution should be used instead of fetching it
                sinon.assert.notCalled(service.memberAttributionService.getSubscriptionCreatedAttribution);
                sinon.assert.called(service.memberAttributionService.fetchResource);

                sinon.assert.calledWith(mailStub, sinon.match({subject: '💸 Paid subscription started: Jamie'}));

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Welcome Post')));

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Direct')));
            });

            it('handles paid member cancellation event', async function () {
                await service.handleEvent(SubscriptionCancelledEvent, {
                    data: {
                        source: 'member',
                        memberId: 'member-1',
                        subscriptionId: 'sub-1',
                        tierId: 'tier-1'
                    }
                });

                sinon.assert.calledWith(mailStub, sinon.match({subject: '⚠️ Cancellation: Jamie'}));
            });

            it('handles milestone created event', async function () {
                await service.handleEvent(MilestoneCreatedEvent, {
                    data: {
                        milestone: {
                            type: 'arr',
                            value: '1000',
                            currency: 'usd',
                            emailSentAt: Date.now()
                        }
                    }
                });
                sinon.assert.calledWith(mailStub, sinon.match({subject: `Ghost Site hit $1,000 ARR`}));
            });
        });

        describe('notifyFreeMemberSignup', function () {
            it('sends free member signup alert', async function () {
                const member = {
                    name: 'Ghost',
                    email: 'member@example.com',
                    id: 'abc',
                    geolocation: '{"country": "France"}',
                    created_at: '2022-08-01T07:30:39.882Z'
                };

                await service.emails.notifyFreeMemberSignup({member}, options);

                sinon.assert.calledOnce(mailStub);
                testCommonMailData(stubs);
                sinon.assert.calledWith(getEmailAlertUsersStub, 'free-signup');

                sinon.assert.calledWith(mailStub, sinon.match({subject: '🥳 Free member signup: Ghost'}));
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('🥳 Free member signup: Ghost')));
            });

            it('sends free member signup alert without member name', async function () {
                const member = {
                    email: 'member@example.com',
                    id: 'abc',
                    geolocation: '{"country": "France"}',
                    created_at: '2022-08-01T07:30:39.882Z'
                };

                await service.emails.notifyFreeMemberSignup({member}, options);

                sinon.assert.calledOnce(mailStub);
                testCommonMailData(stubs);
                sinon.assert.calledWith(getEmailAlertUsersStub, 'free-signup');

                sinon.assert.calledWith(mailStub, sinon.match({subject: '🥳 Free member signup: member@example.com'}));
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('🥳 Free member signup: member@example.com')));
            });

            it('sends free member signup alert with attribution', async function () {
                const member = {
                    name: 'Ghost',
                    email: 'member@example.com',
                    id: 'abc'
                };

                const attribution = {
                    referrerSource: 'Twitter',
                    title: 'Welcome Post',
                    url: 'https://example.com/welcome'
                };

                await service.emails.notifyFreeMemberSignup({member, attribution}, options);

                sinon.assert.calledOnce(mailStub);
                testCommonMailData(stubs);
                sinon.assert.calledWith(getEmailAlertUsersStub, 'free-signup');

                sinon.assert.calledWith(mailStub, sinon.match({subject: '🥳 Free member signup: Ghost'}));
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('🥳 Free member signup: Ghost')));

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Source')));

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Twitter')));

                // check attribution page
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Welcome Post')));

                // check attribution url
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('https://example.com/welcome')));
            });
        });

        describe('notifyPaidSubscriptionStart', function () {
            let member;
            let tier;
            let offer;
            let subscription;
            before(function () {
                member = {
                    name: 'Ghost',
                    email: 'member@example.com',
                    id: 'abc'
                };
                offer = {
                    name: 'Half price',
                    duration: 'once',
                    type: 'percent',
                    amount: 50
                };
                tier = {
                    name: 'Test Tier'
                };
                subscription = {
                    amount: 5000,
                    currency: 'USD',
                    interval: 'month',
                    startDate: '2022-08-01T07:30:39.882Z'
                };
            });

            it('sends paid subscription start alert with attribution', async function () {
                const attribution = {
                    referrerSource: 'Twitter',
                    title: 'Welcome Post',
                    url: 'https://example.com/welcome'
                };
                await service.emails.notifyPaidSubscriptionStarted({member, offer: null, tier, subscription, attribution}, options);

                sinon.assert.calledOnce(mailStub);
                testCommonPaidSubMailData({...stubs, member});

                // check attribution text
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Twitter')));

                // check attribution text
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Source')));

                // check attribution page
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Welcome Post')));

                // check attribution url
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('https://example.com/welcome')));
            });

            it('sends paid subscription start alert without offer', async function () {
                await service.emails.notifyPaidSubscriptionStarted({member, offer: null, tier, subscription}, options);

                sinon.assert.calledOnce(mailStub);
                testCommonPaidSubMailData({...stubs, member});

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', 'Offer')
                ), false);
            });

            it('sends paid subscription start alert without member name', async function () {
                let memberData = {
                    email: 'member@example.com',
                    id: 'abc'
                };
                await service.emails.notifyPaidSubscriptionStarted({member: memberData, offer: null, tier, subscription}, options);

                sinon.assert.calledOnce(mailStub);
                testCommonPaidSubMailData({...stubs, member: memberData});

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', 'Offer')
                ), false);

                // check preview text
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Test Tier: $50.00/month')));
            });

            it('sends paid subscription start alert with percent offer - first payment', async function () {
                await service.emails.notifyPaidSubscriptionStarted({member, offer, tier, subscription}, options);

                sinon.assert.calledOnce(mailStub);
                testCommonPaidSubMailData({...stubs, member});

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Half price')));
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('50% off')));
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('first payment')));

                // check preview text
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Test Tier: $50.00/month - Offer: Half price - 50% off, first payment')));
            });

            it('sends paid subscription start alert with fixed type offer - repeating duration', async function () {
                offer = {
                    name: 'Save ten',
                    duration: 'repeating',
                    durationInMonths: 3,
                    type: 'fixed',
                    currency: 'USD',
                    amount: 1000
                };

                await service.emails.notifyPaidSubscriptionStarted({member, offer, tier, subscription}, options);

                sinon.assert.calledOnce(mailStub);
                testCommonPaidSubMailData({...stubs, member});

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Save ten')));
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('$10.00 off')));
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('first 3 months')));
            });

            it('sends paid subscription start alert with fixed type offer - forever duration', async function () {
                offer = {
                    name: 'Save twenty',
                    duration: 'forever',
                    type: 'fixed',
                    currency: 'USD',
                    amount: 2000
                };

                await service.emails.notifyPaidSubscriptionStarted({member, offer, tier, subscription}, options);

                sinon.assert.calledOnce(mailStub);
                testCommonPaidSubMailData({...stubs, member});

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Save twenty')));
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('$20.00 off')));
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('forever')));
            });

            it('sends paid subscription start alert with free trial offer', async function () {
                offer = {
                    name: 'Free week',
                    duration: 'trial',
                    type: 'trial',
                    amount: 7
                };

                await service.emails.notifyPaidSubscriptionStarted({member, offer, tier, subscription}, options);

                sinon.assert.calledOnce(mailStub);
                testCommonPaidSubMailData({...stubs, member});

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Free week')));
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('7 days free')));
            });
        });

        describe('notifyPaidSubscriptionCancel', function () {
            let member;
            let tier;
            let subscription;
            let expiryAt;
            let canceledAt;
            let cancelNow;
            before(function () {
                member = {
                    name: 'Ghost',
                    email: 'member@example.com',
                    id: 'abc',
                    geolocation: '{"country": "France"}',
                    created_at: '2022-08-01T07:30:39.882Z'
                };

                tier = {
                    name: 'Test Tier'
                };

                subscription = {
                    amount: 5000,
                    currency: 'USD',
                    interval: 'month'
                };

                expiryAt = '2024-09-05T07:30:39.882Z';
                canceledAt = '2022-08-05T07:30:39.882Z';
                cancelNow = false;
            });

            it('sends paid subscription cancel notification when sub is canceled at the end of billing period', async function () {
                await service.emails.notifyPaidSubscriptionCanceled({member, tier, subscription: {
                    ...subscription,
                    cancellationReason: 'Changed my mind!'
                }, expiryAt, canceledAt, cancelNow}, options);

                sinon.assert.calledOnce(mailStub);
                testCommonPaidSubCancelMailData(stubs);

                // Expiration sentence is in the future tense
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Expires on')));

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('5 Sep 2024')));

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', 'Offer')
                ), false);

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Cancellation reason')));

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Changed my mind!')));
            });

            it('sends paid subscription cancel alert when sub is canceled without reason', async function () {
                await service.emails.notifyPaidSubscriptionCanceled({member, tier, subscription, expiryAt, cancelNow}, options);

                sinon.assert.calledOnce(mailStub);
                testCommonPaidSubCancelMailData(stubs);

                // Expiration sentence is in the future tense
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Expires on')));

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('5 Sep 2024')));

                // Cancellation reason block is hidden
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Cancellation reason'))
                ), false);
            });

            it('sends paid subscription cancel alert when subscription is canceled immediately', async function () {
                cancelNow = true;
                await service.emails.notifyPaidSubscriptionCanceled({member, tier, subscription: {
                    ...subscription,
                    cancellationReason: 'Payment failed'
                }, expiryAt, canceledAt, cancelNow}, options);

                sinon.assert.calledOnce(mailStub);
                testCommonPaidSubCancelMailData(stubs);

                // We don't show "Canceled on" when subscription is canceled immediately
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Canceled on'))
                ), false);

                // Expiration sentence is in the past tense
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Expired on')));

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('5 Sep 2024')));

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', 'Offer')
                ), false);

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Cancellation reason')));

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Payment failed')));
            });
        });

        describe('notifyMilestoneReceived', function () {
            it('send Members milestone email', async function () {
                const milestone = {
                    type: 'members',
                    value: 25000,
                    emailSentAt: Date.now()
                };

                await service.emails.notifyMilestoneReceived({milestone});

                sinon.assert.calledWith(getEmailAlertUsersStub, 'milestone-received');

                sinon.assert.calledOnce(mailStub);

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Ghost Site now has 25k members')));

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Celebrating 25,000 signups')));

                // Correct image and NO height for Members milestone
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('src="https://static.ghost.org/v5.0.0/images/milestone-email-members-25k.png" width="580" align="center"')));

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Congrats, <strong>25k people</strong> have chosen to support and follow your work. That’s an audience big enough to sell out Madison Square Garden. What an incredible milestone!')));

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('View your dashboard')));
            });

            it('send ARR milestone email', async function () {
                const milestone = {
                    type: 'arr',
                    value: 500000,
                    currency: 'usd',
                    emailSentAt: Date.now()
                };

                await service.emails.notifyMilestoneReceived({milestone});

                sinon.assert.calledWith(getEmailAlertUsersStub, 'milestone-received');

                sinon.assert.calledOnce(mailStub);

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Ghost Site hit $500,000 ARR')));

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Congrats! You reached $500k ARR')));

                // Correct image and height for ARR milestone
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('src="https://static.ghost.org/v5.0.0/images/milestone-email-usd-500k.png" width="580" height="348" align="center"')));

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('<strong>Ghost Site</strong> is now generating <strong>$500,000</strong> in annual recurring revenue. Congratulations &mdash; this is a significant milestone.')));

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Login to your dashboard')));
            });

            it('does not send email when no date provided', async function () {
                const milestone = {
                    type: 'members',
                    value: 25000
                };

                await service.emails.notifyMilestoneReceived({milestone});

                assert.equal(getEmailAlertUsersStub.calledWith('milestone-received'), false);

                sinon.assert.notCalled(mailStub);
            });

            it('does not send email when a reason not to send email was provided', async function () {
                const milestone = {
                    type: 'members',
                    value: 25000,
                    emailSentAt: Date.now(),
                    meta: {
                        reason: 'no-email'
                    }
                };

                await service.emails.notifyMilestoneReceived({milestone});

                assert.equal(getEmailAlertUsersStub.calledWith('milestone-received'), false);

                sinon.assert.notCalled(mailStub);
            });

            it('does not send email for a milestone without correct content', async function () {
                const milestone = {
                    type: 'members',
                    value: 5000, // milestone not configured
                    emailSentAt: Date.now()
                };

                await service.emails.notifyMilestoneReceived({milestone});

                assert.equal(getEmailAlertUsersStub.calledWith('milestone-received'), false);

                sinon.assert.calledOnce(loggingWarningStub);

                sinon.assert.notCalled(mailStub);
            });
        });

        describe('notifyDonationReceived', function () {
            it('send donation email', async function () {
                const donationPaymentEvent = {
                    amount: 1500,
                    currency: 'eur',
                    name: 'Simon',
                    email: 'simon@example.com',
                    donationMessage: 'Thank you for the awesome newsletter!'
                };

                await service.emails.notifyDonationReceived({donationPaymentEvent});

                sinon.assert.calledWith(getEmailAlertUsersStub, 'donation');

                sinon.assert.calledOnce(mailStub);

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('One-time payment received: €15.00 from Simon')));
            });

            it('has donation message in text', async function () {
                const donationPaymentEvent = {
                    amount: 1500,
                    currency: 'eur',
                    name: 'Jamie',
                    email: 'jamie@example.com',
                    donationMessage: 'Thank you for the awesome newsletter!'
                };

                await service.emails.notifyDonationReceived({donationPaymentEvent});

                sinon.assert.calledWith(getEmailAlertUsersStub, 'donation');

                sinon.assert.calledOnce(mailStub);

                sinon.assert.calledWith(mailStub, sinon.match.has('text', sinon.match('Thank you for the awesome newsletter!')));
            });

            it('has donation message in html', async function () {
                const donationPaymentEvent = {
                    amount: 1500,
                    currency: 'eur',
                    name: 'Jamie',
                    email: 'jamie@example.com',
                    donationMessage: 'Thank you for the awesome newsletter!'
                };

                await service.emails.notifyDonationReceived({donationPaymentEvent});

                sinon.assert.calledWith(getEmailAlertUsersStub, 'donation');

                sinon.assert.calledOnce(mailStub);

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Thank you for the awesome newsletter!')));
            });

            it('does not contain donation message in HTML if not provided', async function () {
                const donationPaymentEvent = {
                    amount: 1500,
                    currency: 'eur',
                    name: 'Jamie',
                    email: 'jamie@example.com',
                    donationMessage: null // No donation message provided
                };

                await service.emails.notifyDonationReceived({donationPaymentEvent});

                sinon.assert.calledWith(getEmailAlertUsersStub, 'donation');
                sinon.assert.calledOnce(mailStub);

                // Check that the specific HTML block for the donation message is NOT present
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match(function (html) {
                    // Ensure that the block with `{{donation.donationMessage}}` does not exist in the rendered HTML
                    return !html.includes('“') && !html.includes('”');
                })));
            });

            // Not really a relevant test, but it's here to show that the donation message is wrapped in quotation marks
            // and that the above test is actually working, since only the donation message is wrapped in quotation marks
            it('The donation message is wrapped in quotation marks', async function () {
                const donationPaymentEvent = {
                    amount: 1500,
                    currency: 'eur',
                    name: 'Jamie',
                    email: 'jamie@example.com',
                    donationMessage: 'Thank you for the great newsletter!'
                };

                await service.emails.notifyDonationReceived({donationPaymentEvent});

                sinon.assert.calledWith(getEmailAlertUsersStub, 'donation');
                sinon.assert.calledOnce(mailStub);

                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match(function (html) {
                    return html.includes('“') && html.includes('”');
                })));
            });

            it('send donation email without message', async function () {
                const donationPaymentEvent = {
                    amount: 1500,
                    currency: 'eur',
                    name: 'Ronald',
                    email: 'ronald@example.com',
                    donationMessage: null
                };

                await service.emails.notifyDonationReceived({donationPaymentEvent});

                sinon.assert.calledWith(getEmailAlertUsersStub, 'donation');

                sinon.assert.calledOnce(mailStub);

                sinon.assert.calledWith(mailStub, sinon.match.has('text', sinon.match('No message provided')));
            });
        });

        describe('notifyGiftReceived', function () {
            it('sends gift email with correct subject', async function () {
                await service.emails.notifyGiftReceived({
                    name: 'Alice',
                    email: 'alice@example.com',
                    memberId: null,
                    amount: 6000,
                    currency: 'usd',
                    tierName: 'Gold',
                    cadence: 'year',
                    duration: 1
                });

                sinon.assert.calledWith(getEmailAlertUsersStub, 'gift-subscription-purchased');
                sinon.assert.calledOnce(mailStub);
                sinon.assert.calledWith(mailStub, sinon.match.has('subject', sinon.match('Gift subscription purchased: $60.00 from Alice')));
            });

            it('includes amount in HTML', async function () {
                await service.emails.notifyGiftReceived({
                    name: 'Bob',
                    email: 'bob@example.com',
                    memberId: null,
                    amount: 1500,
                    currency: 'eur',
                    tierName: 'Gold',
                    cadence: 'year',
                    duration: 1
                });

                sinon.assert.calledOnce(mailStub);
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('€15.00')));
            });

            it('includes purchaser name in HTML', async function () {
                await service.emails.notifyGiftReceived({
                    name: 'Charlie',
                    email: 'charlie@example.com',
                    memberId: null,
                    amount: 5000,
                    currency: 'usd',
                    tierName: 'Gold',
                    cadence: 'year',
                    duration: 1
                });

                sinon.assert.calledOnce(mailStub);
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Charlie')));
            });

            it('includes amount in plain text', async function () {
                await service.emails.notifyGiftReceived({
                    name: 'Diana',
                    email: 'diana@example.com',
                    memberId: null,
                    amount: 2000,
                    currency: 'gbp',
                    tierName: 'Gold',
                    cadence: 'year',
                    duration: 1
                });

                sinon.assert.calledOnce(mailStub);
                sinon.assert.calledWith(mailStub, sinon.match.has('text', sinon.match('£20.00')));
            });

            it('falls back to email when name is null', async function () {
                await service.emails.notifyGiftReceived({
                    name: null,
                    email: 'anon@example.com',
                    memberId: null,
                    amount: 3000,
                    currency: 'usd',
                    tierName: 'Gold',
                    cadence: 'year',
                    duration: 1
                });

                sinon.assert.calledOnce(mailStub);
                sinon.assert.calledWith(mailStub, sinon.match.has('subject', sinon.match('from anon@example.com')));
            });

            it('includes tier and cadence in HTML when provided', async function () {
                await service.emails.notifyGiftReceived({
                    name: 'Erin',
                    email: 'erin@example.com',
                    memberId: null,
                    amount: 12000,
                    currency: 'usd',
                    tierName: 'Premium',
                    cadence: 'year',
                    duration: 1
                });

                sinon.assert.calledOnce(mailStub);
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Premium')));
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('1 year')));
            });

            it('formats cadence with pluralized unit when duration is greater than 1', async function () {
                await service.emails.notifyGiftReceived({
                    name: 'Erin',
                    email: 'erin@example.com',
                    memberId: null,
                    amount: 12000,
                    currency: 'usd',
                    tierName: 'Premium',
                    cadence: 'month',
                    duration: 3
                });

                sinon.assert.calledOnce(mailStub);
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('3 months')));
            });
        });

        describe('notifyGiftSubscriptionStarted', function () {
            it('sends gift subscription email with correct subject', async function () {
                await service.emails.notifyGiftSubscriptionStarted({
                    memberName: 'Jamie',
                    memberEmail: 'jamie@example.com',
                    memberId: 'abc',
                    tierName: 'Premium',
                    buyerEmail: 'gifter@example.com'
                });

                sinon.assert.calledWith(getEmailAlertUsersStub, 'paid-started');
                sinon.assert.calledOnce(mailStub);
                sinon.assert.calledWith(mailStub, sinon.match.has('subject', sinon.match('New paid subscriber: Jamie')));
            });

            it('includes the tier in HTML and plain text', async function () {
                await service.emails.notifyGiftSubscriptionStarted({
                    memberName: 'Jamie',
                    memberEmail: 'jamie@example.com',
                    memberId: 'abc',
                    tierName: 'Premium',
                    buyerEmail: 'gifter@example.com'
                });

                sinon.assert.calledOnce(mailStub);
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Premium')));
                sinon.assert.calledWith(mailStub, sinon.match.has('text', sinon.match('Tier: Premium')));
            });

            it('includes the member name in HTML and plain text', async function () {
                await service.emails.notifyGiftSubscriptionStarted({
                    memberName: 'Jamie',
                    memberEmail: 'jamie@example.com',
                    memberId: 'abc',
                    tierName: 'Premium',
                    buyerEmail: 'gifter@example.com'
                });

                sinon.assert.calledOnce(mailStub);
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Jamie')));
                sinon.assert.calledWith(mailStub, sinon.match.has('text', sinon.match('Jamie')));
            });

            it('includes the source in HTML and plain text', async function () {
                await service.emails.notifyGiftSubscriptionStarted({
                    memberName: 'Jamie',
                    memberEmail: 'jamie@example.com',
                    memberId: 'abc',
                    tierName: 'Premium',
                    buyerEmail: 'gifter@example.com'
                });

                sinon.assert.calledOnce(mailStub);
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('Gift subscription')));
                sinon.assert.calledWith(mailStub, sinon.match.has('text', sinon.match('Source: Gift subscription')));
            });

            it('includes the buyer email in HTML and plain text', async function () {
                await service.emails.notifyGiftSubscriptionStarted({
                    memberName: 'Jamie',
                    memberEmail: 'jamie@example.com',
                    memberId: 'abc',
                    tierName: 'Premium',
                    buyerEmail: 'gifter@example.com'
                });

                sinon.assert.calledOnce(mailStub);
                sinon.assert.calledWith(mailStub, sinon.match.has('html', sinon.match('gifter@example.com')));
                sinon.assert.calledWith(mailStub, sinon.match.has('text', sinon.match('Gifted by: gifter@example.com')));
            });
        });
    });
});
