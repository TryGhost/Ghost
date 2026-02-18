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
    assert.equal(getEmailAlertUsersStub.calledWith(
        sinon.match.string,
        sinon.match({transacting: {}, forUpdate: true})
    ), true);

    // has right from/to address
    assert.equal(mailStub.calledWith(sinon.match({
        from: '"Default" <default@email.com>',
        to: 'owner@ghost.org'
    })), true);

    // Email HTML contains important bits

    // Has accent color
    assert.equal(mailStub.calledWith(
        sinon.match.has('html', sinon.match('#ffffff'))
    ), true);

    // Has email
    assert.equal(mailStub.calledWith(
        sinon.match.has('html', sinon.match('member@example.com'))
    ), true);

    // Has member url
    assert.equal(mailStub.calledWith(
        sinon.match.has('html', sinon.match('https://admin.ghost.example/#/members/abc'))
    ), true);

    // Has site url
    assert.equal(mailStub.calledWith(
        sinon.match.has('html', sinon.match('https://ghost.example'))
    ), true);

    // Has staff admin url
    assert.equal(mailStub.calledWith(
        sinon.match.has('html', sinon.match('https://admin.ghost.example/#/settings/staff/ghost/email-notifications'))
    ), true);
}

function testCommonPaidSubMailData({member, mailStub, getEmailAlertUsersStub}) {
    testCommonMailData({mailStub, getEmailAlertUsersStub});
    assert.equal(getEmailAlertUsersStub.calledWith('paid-started'), true);

    if (member?.name) {
        assert.equal(mailStub.calledWith(
            sinon.match({subject: '💸 Paid subscription started: Ghost'})
        ), true);

        assert.equal(mailStub.calledWith(
            sinon.match.has('html', sinon.match('💸 Paid subscription started: Ghost'))
        ), true);
    } else {
        assert.equal(mailStub.calledWith(
            sinon.match({subject: '💸 Paid subscription started: member@example.com'})
        ), true);

        assert.equal(mailStub.calledWith(
            sinon.match.has('html', sinon.match('💸 Paid subscription started: member@example.com'))
        ), true);
    }

    assert.equal(mailStub.calledWith(
        sinon.match.has('html', sinon.match('Test Tier'))
    ), true);
    assert.equal(mailStub.calledWith(
        sinon.match.has('html', sinon.match('$50.00/month'))
    ), true);
}

function testCommonPaidSubCancelMailData({mailStub, getEmailAlertUsersStub}) {
    testCommonMailData({mailStub, getEmailAlertUsersStub});
    assert.equal(getEmailAlertUsersStub.calledWith('paid-canceled'), true);
    assert.equal(mailStub.calledWith(
        sinon.match({subject: '⚠️ Cancellation: Ghost'})
    ), true);

    assert.equal(mailStub.calledWith(
        sinon.match.has('html', sinon.match('⚠️ Cancellation: Ghost'))
    ), true);
    assert.equal(mailStub.calledWith(
        sinon.match.has('html', sinon.match('Test Tier'))
    ), true);
    assert.equal(mailStub.calledWith(
        sinon.match.has('html', sinon.match('$50.00/month'))
    ), true);
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
                assert.equal(subscribeStub.callCount, 4);
                assert.equal(subscribeStub.calledWith(SubscriptionActivatedEvent), true);
                assert.equal(subscribeStub.calledWith(SubscriptionCancelledEvent), true);
                assert.equal(subscribeStub.calledWith(MemberCreatedEvent), true);
                assert.equal(subscribeStub.calledWith(MilestoneCreatedEvent), true);
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
                assert.equal(service.handleEvent.calledWith(MemberCreatedEvent), true);

                DomainEvents.dispatch(SubscriptionActivatedEvent.create({
                    source: 'member',
                    memberId: 'member-1',
                    subscriptionId: 'sub-1',
                    offerId: 'offer-1',
                    tierId: 'tier-1'
                }));
                await DomainEvents.allSettled();
                assert.equal(service.handleEvent.calledWith(SubscriptionActivatedEvent), true);

                DomainEvents.dispatch(SubscriptionCancelledEvent.create({
                    source: 'member',
                    memberId: 'member-1',
                    subscriptionId: 'sub-1',
                    tierId: 'tier-1'
                }));
                await DomainEvents.allSettled();
                assert.equal(service.handleEvent.calledWith(SubscriptionCancelledEvent), true);

                DomainEvents.dispatch(MilestoneCreatedEvent.create({
                    milestone: {
                        type: 'arr',
                        value: '100',
                        currency: 'usd'
                    }
                }));
                await DomainEvents.allSettled();
                assert.equal(service.handleEvent.calledWith(MilestoneCreatedEvent), true);
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

                assert.equal(service.memberAttributionService.getMemberCreatedAttribution.called, true);

                assert.equal(mailStub.calledWith(
                    sinon.match({subject: '🥳 Free member signup: Jamie'})
                ), true);
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
                assert.equal(service.memberAttributionService.getMemberCreatedAttribution.called, false);
                assert.equal(service.memberAttributionService.fetchResource.called, true);

                assert.equal(mailStub.calledWith(
                    sinon.match({subject: '🥳 Free member signup: Jamie'})
                ), true);
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

                assert.equal(service.memberAttributionService.getSubscriptionCreatedAttribution.called, true);

                assert.equal(mailStub.calledWith(
                    sinon.match({subject: '💸 Paid subscription started: Jamie'})
                ), true);
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
                assert.equal(service.memberAttributionService.getSubscriptionCreatedAttribution.called, false);
                assert.equal(service.memberAttributionService.fetchResource.called, true);

                assert.equal(mailStub.calledWith(
                    sinon.match({subject: '💸 Paid subscription started: Jamie'})
                ), true);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Welcome Post'))
                ), true);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Direct'))
                ), true);
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

                assert.equal(mailStub.calledWith(
                    sinon.match({subject: '⚠️ Cancellation: Jamie'})
                ), true);
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
                assert.equal(mailStub.calledWith(
                    sinon.match({subject: `Ghost Site hit $1,000 ARR`})
                ), true);
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

                assert.equal(mailStub.calledOnce, true);
                testCommonMailData(stubs);
                assert.equal(getEmailAlertUsersStub.calledWith('free-signup'), true);

                assert.equal(mailStub.calledWith(
                    sinon.match({subject: '🥳 Free member signup: Ghost'})
                ), true);
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('🥳 Free member signup: Ghost'))
                ), true);
            });

            it('sends free member signup alert without member name', async function () {
                const member = {
                    email: 'member@example.com',
                    id: 'abc',
                    geolocation: '{"country": "France"}',
                    created_at: '2022-08-01T07:30:39.882Z'
                };

                await service.emails.notifyFreeMemberSignup({member}, options);

                assert.equal(mailStub.calledOnce, true);
                testCommonMailData(stubs);
                assert.equal(getEmailAlertUsersStub.calledWith('free-signup'), true);

                assert.equal(mailStub.calledWith(
                    sinon.match({subject: '🥳 Free member signup: member@example.com'})
                ), true);
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('🥳 Free member signup: member@example.com'))
                ), true);
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

                assert.equal(mailStub.calledOnce, true);
                testCommonMailData(stubs);
                assert.equal(getEmailAlertUsersStub.calledWith('free-signup'), true);

                assert.equal(mailStub.calledWith(
                    sinon.match({subject: '🥳 Free member signup: Ghost'})
                ), true);
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('🥳 Free member signup: Ghost'))
                ), true);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Source'))
                ), true);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Twitter'))
                ), true);

                // check attribution page
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Welcome Post'))
                ), true);

                // check attribution url
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('https://example.com/welcome'))
                ), true);
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

                assert.equal(mailStub.calledOnce, true);
                testCommonPaidSubMailData({...stubs, member});

                // check attribution text
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Twitter'))
                ), true);

                // check attribution text
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Source'))
                ), true);

                // check attribution page
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Welcome Post'))
                ), true);

                // check attribution url
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('https://example.com/welcome'))
                ), true);
            });

            it('sends paid subscription start alert without offer', async function () {
                await service.emails.notifyPaidSubscriptionStarted({member, offer: null, tier, subscription}, options);

                assert.equal(mailStub.calledOnce, true);
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

                assert.equal(mailStub.calledOnce, true);
                testCommonPaidSubMailData({...stubs, member: memberData});

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', 'Offer')
                ), false);

                // check preview text
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Test Tier: $50.00/month'))
                ), true);
            });

            it('sends paid subscription start alert with percent offer - first payment', async function () {
                await service.emails.notifyPaidSubscriptionStarted({member, offer, tier, subscription}, options);

                assert.equal(mailStub.calledOnce, true);
                testCommonPaidSubMailData({...stubs, member});

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Half price'))
                ), true);
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('50% off'))
                ), true);
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('first payment'))
                ), true);

                // check preview text
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Test Tier: $50.00/month - Offer: Half price - 50% off, first payment'))
                ), true);
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

                assert.equal(mailStub.calledOnce, true);
                testCommonPaidSubMailData({...stubs, member});

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Save ten'))
                ), true);
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('$10.00 off'))
                ), true);
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('first 3 months'))
                ), true);
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

                assert.equal(mailStub.calledOnce, true);
                testCommonPaidSubMailData({...stubs, member});

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Save twenty'))
                ), true);
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('$20.00 off'))
                ), true);
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('forever'))
                ), true);
            });

            it('sends paid subscription start alert with free trial offer', async function () {
                offer = {
                    name: 'Free week',
                    duration: 'trial',
                    type: 'trial',
                    amount: 7
                };

                await service.emails.notifyPaidSubscriptionStarted({member, offer, tier, subscription}, options);

                assert.equal(mailStub.calledOnce, true);
                testCommonPaidSubMailData({...stubs, member});

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Free week'))
                ), true);
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('7 days free'))
                ), true);
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

                assert.equal(mailStub.calledOnce, true);
                testCommonPaidSubCancelMailData(stubs);

                // Expiration sentence is in the future tense
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Expires on'))
                ), true);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('5 Sep 2024'))
                ), true);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', 'Offer')
                ), false);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Reason: Changed my mind!'))
                ), true);
            });

            it('sends paid subscription cancel alert when sub is canceled without reason', async function () {
                await service.emails.notifyPaidSubscriptionCanceled({member, tier, subscription, expiryAt, cancelNow}, options);

                assert.equal(mailStub.calledOnce, true);
                testCommonPaidSubCancelMailData(stubs);

                // Expiration sentence is in the future tense
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Expires on'))
                ), true);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('5 Sep 2024'))
                ), true);

                // Cancellation reason block is hidden
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Reason: '))
                ), false);
            });

            it('sends paid subscription cancel alert when subscription is canceled immediately', async function () {
                cancelNow = true;
                await service.emails.notifyPaidSubscriptionCanceled({member, tier, subscription: {
                    ...subscription,
                    cancellationReason: 'Payment failed'
                }, expiryAt, canceledAt, cancelNow}, options);

                assert.equal(mailStub.calledOnce, true);
                testCommonPaidSubCancelMailData(stubs);

                // We don't show "Canceled on" when subscription is canceled immediately
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Canceled on'))
                ), false);

                // Expiration sentence is in the past tense
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Expired on'))
                ), true);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('5 Sep 2024'))
                ), true);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', 'Offer')
                ), false);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Reason: Payment failed'))
                ), true);
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

                assert.equal(getEmailAlertUsersStub.calledWith('milestone-received'), true);

                assert.equal(mailStub.calledOnce, true);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Ghost Site now has 25k members'))
                ), true);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Celebrating 25,000 signups'))
                ), true);

                // Correct image and NO height for Members milestone
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('src="https://static.ghost.org/v5.0.0/images/milestone-email-members-25k.png" width="580" align="center"'))
                ), true);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Congrats, <strong>25k people</strong> have chosen to support and follow your work. That’s an audience big enough to sell out Madison Square Garden. What an incredible milestone!'))
                ), true);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('View your dashboard'))
                ), true);
            });

            it('send ARR milestone email', async function () {
                const milestone = {
                    type: 'arr',
                    value: 500000,
                    currency: 'usd',
                    emailSentAt: Date.now()
                };

                await service.emails.notifyMilestoneReceived({milestone});

                assert.equal(getEmailAlertUsersStub.calledWith('milestone-received'), true);

                assert.equal(mailStub.calledOnce, true);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Ghost Site hit $500,000 ARR'))
                ), true);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Congrats! You reached $500k ARR'))
                ), true);

                // Correct image and height for ARR milestone
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('src="https://static.ghost.org/v5.0.0/images/milestone-email-usd-500k.png" width="580" height="348" align="center"'))
                ), true);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('<strong>Ghost Site</strong> is now generating <strong>$500,000</strong> in annual recurring revenue. Congratulations &mdash; this is a significant milestone.'))
                ), true);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Login to your dashboard'))
                ), true);
            });

            it('does not send email when no date provided', async function () {
                const milestone = {
                    type: 'members',
                    value: 25000
                };

                await service.emails.notifyMilestoneReceived({milestone});

                assert.equal(getEmailAlertUsersStub.calledWith('milestone-received'), false);

                assert.equal(mailStub.called, false);
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

                assert.equal(mailStub.called, false);
            });

            it('does not send email for a milestone without correct content', async function () {
                const milestone = {
                    type: 'members',
                    value: 5000, // milestone not configured
                    emailSentAt: Date.now()
                };

                await service.emails.notifyMilestoneReceived({milestone});

                assert.equal(getEmailAlertUsersStub.calledWith('milestone-received'), false);

                assert.equal(loggingWarningStub.calledOnce, true);

                assert.equal(mailStub.called, false);
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

                assert.equal(getEmailAlertUsersStub.calledWith('donation'), true);

                assert.equal(mailStub.calledOnce, true);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('One-time payment received: €15.00 from Simon'))
                ), true);
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

                assert.equal(getEmailAlertUsersStub.calledWith('donation'), true);

                assert.equal(mailStub.calledOnce, true);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('text', sinon.match('Thank you for the awesome newsletter!'))
                ), true);
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

                assert.equal(getEmailAlertUsersStub.calledWith('donation'), true);

                assert.equal(mailStub.calledOnce, true);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Thank you for the awesome newsletter!'))
                ), true);
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

                assert.equal(getEmailAlertUsersStub.calledWith('donation'), true);
                assert.equal(mailStub.calledOnce, true);

                // Check that the specific HTML block for the donation message is NOT present
                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match(function (html) {
                        // Ensure that the block with `{{donation.donationMessage}}` does not exist in the rendered HTML
                        return !html.includes('“') && !html.includes('”');
                    }))
                ), true);
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

                assert.equal(getEmailAlertUsersStub.calledWith('donation'), true);
                assert.equal(mailStub.calledOnce, true);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('html', sinon.match(function (html) {
                        return html.includes('“') && html.includes('”');
                    }))
                ), true);
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

                assert.equal(getEmailAlertUsersStub.calledWith('donation'), true);

                assert.equal(mailStub.calledOnce, true);

                assert.equal(mailStub.calledWith(
                    sinon.match.has('text', sinon.match('No message provided'))
                ), true);
            });
        });

        describe('renderText for webmentions', function () {
            it('renders plaintext report for mentions', async function () {
                const textTemplate = await service.emails.renderText('mention-report', {
                    toEmail: 'jamie@example.com',
                    siteDomain: 'ghost.org',
                    staffUrl: 'https://admin.example.com/blog/ghost/#/settings/staff/jane.',
                    mentions: [
                        {
                            sourceSiteTitle: 'Webmentions',
                            sourceUrl: 'https://webmention.io/'
                        },
                        {
                            sourceSiteTitle: 'Ghost Demo',
                            sourceUrl: 'https://demo.ghost.io/'
                        }
                    ]
                });
                assert.match(textTemplate, /- Webmentions \(https:\/\/webmention.io\/\)/);
                assert.match(textTemplate, /Ghost Demo \(https:\/\/demo.ghost.io\/\)/);
                assert.match(textTemplate, /Sent to jamie@example.com from ghost.org/);
            });
        });
    });
});
