// Switch these lines once there are useful utils
// const testUtils = require('./utils');
const sinon = require('sinon');
const {MemberCreatedEvent, SubscriptionCancelledEvent, SubscriptionActivatedEvent} = require('@tryghost/member-events');
const {MilestoneCreatedEvent} = require('@tryghost/milestones');

// Stuff we are testing
const DomainEvents = require('@tryghost/domain-events');

require('./utils');
const StaffService = require('../index');

function testCommonMailData({mailStub, getEmailAlertUsersStub}) {
    getEmailAlertUsersStub.calledWith(
        sinon.match.string,
        sinon.match({transacting: {}, forUpdate: true})
    ).should.be.true();

    // has right from/to address
    mailStub.calledWith(sinon.match({
        from: 'ghost@ghost.example',
        to: 'owner@ghost.org'
    })).should.be.true();

    // Email HTML contains important bits

    // Has accent color
    mailStub.calledWith(
        sinon.match.has('html', sinon.match('#ffffff'))
    ).should.be.true();

    // Has email
    mailStub.calledWith(
        sinon.match.has('html', sinon.match('member@example.com'))
    ).should.be.true();

    // Has member url
    mailStub.calledWith(
        sinon.match.has('html', sinon.match('https://admin.ghost.example/#/members/abc'))
    ).should.be.true();

    // Has site url
    mailStub.calledWith(
        sinon.match.has('html', sinon.match('https://ghost.example'))
    ).should.be.true();

    // Has staff admin url
    mailStub.calledWith(
        sinon.match.has('html', sinon.match('https://admin.ghost.example/#/settings/staff/ghost'))
    ).should.be.true();
}

function testCommonPaidSubMailData({member, mailStub, getEmailAlertUsersStub}) {
    testCommonMailData({mailStub, getEmailAlertUsersStub});
    getEmailAlertUsersStub.calledWith('paid-started').should.be.true();

    if (member?.name) {
        mailStub.calledWith(
            sinon.match({subject: '💸 Paid subscription started: Ghost'})
        ).should.be.true();

        mailStub.calledWith(
            sinon.match.has('html', sinon.match('💸 Paid subscription started: Ghost'))
        ).should.be.true();
    } else {
        mailStub.calledWith(
            sinon.match({subject: '💸 Paid subscription started: member@example.com'})
        ).should.be.true();

        mailStub.calledWith(
            sinon.match.has('html', sinon.match('💸 Paid subscription started: member@example.com'))
        ).should.be.true();
    }

    mailStub.calledWith(
        sinon.match.has('html', sinon.match('Test Tier'))
    ).should.be.true();
    mailStub.calledWith(
        sinon.match.has('html', sinon.match('$50.00/month'))
    ).should.be.true();
}

function testCommonPaidSubCancelMailData({mailStub, getEmailAlertUsersStub}) {
    testCommonMailData({mailStub, getEmailAlertUsersStub});
    getEmailAlertUsersStub.calledWith('paid-canceled').should.be.true();
    mailStub.calledWith(
        sinon.match({subject: '⚠️ Cancellation: Ghost'})
    ).should.be.true();

    mailStub.calledWith(
        sinon.match.has('html', sinon.match('⚠️ Cancellation: Ghost'))
    ).should.be.true();
    mailStub.calledWith(
        sinon.match.has('html', sinon.match('Test Tier'))
    ).should.be.true();
    mailStub.calledWith(
        sinon.match.has('html', sinon.match('$50.00/month'))
    ).should.be.true();
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
            getDefaultEmailDomain: () => {
                return 'ghost.example';
            },
            useNewEmailAddresses: () => {
                return false;
            }
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
                subscribeStub.callCount.should.eql(4);
                subscribeStub.calledWith(SubscriptionActivatedEvent).should.be.true();
                subscribeStub.calledWith(SubscriptionCancelledEvent).should.be.true();
                subscribeStub.calledWith(MemberCreatedEvent).should.be.true();
                subscribeStub.calledWith(MilestoneCreatedEvent).should.be.true();
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
                service.handleEvent.calledWith(MemberCreatedEvent).should.be.true();

                DomainEvents.dispatch(SubscriptionActivatedEvent.create({
                    source: 'member',
                    memberId: 'member-1',
                    subscriptionId: 'sub-1',
                    offerId: 'offer-1',
                    tierId: 'tier-1'
                }));
                await DomainEvents.allSettled();
                service.handleEvent.calledWith(SubscriptionActivatedEvent).should.be.true();

                DomainEvents.dispatch(SubscriptionCancelledEvent.create({
                    source: 'member',
                    memberId: 'member-1',
                    subscriptionId: 'sub-1',
                    tierId: 'tier-1'
                }));
                await DomainEvents.allSettled();
                service.handleEvent.calledWith(SubscriptionCancelledEvent).should.be.true();

                DomainEvents.dispatch(MilestoneCreatedEvent.create({
                    milestone: {
                        type: 'arr',
                        value: '100',
                        currency: 'usd'
                    }
                }));
                await DomainEvents.allSettled();
                service.handleEvent.calledWith(MilestoneCreatedEvent).should.be.true();
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

                mailStub.calledWith(
                    sinon.match({subject: '🥳 Free member signup: Jamie'})
                ).should.be.true();
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

                mailStub.calledWith(
                    sinon.match({subject: '💸 Paid subscription started: Jamie'})
                ).should.be.true();
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

                mailStub.calledWith(
                    sinon.match({subject: '⚠️ Cancellation: Jamie'})
                ).should.be.true();
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
                mailStub.calledWith(
                    sinon.match({subject: `Ghost Site hit $1,000 ARR`})
                ).should.be.true();
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

                mailStub.calledOnce.should.be.true();
                testCommonMailData(stubs);
                getEmailAlertUsersStub.calledWith('free-signup').should.be.true();

                mailStub.calledWith(
                    sinon.match({subject: '🥳 Free member signup: Ghost'})
                ).should.be.true();
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('🥳 Free member signup: Ghost'))
                ).should.be.true();
            });

            it('sends free member signup alert without member name', async function () {
                const member = {
                    email: 'member@example.com',
                    id: 'abc',
                    geolocation: '{"country": "France"}',
                    created_at: '2022-08-01T07:30:39.882Z'
                };

                await service.emails.notifyFreeMemberSignup({member}, options);

                mailStub.calledOnce.should.be.true();
                testCommonMailData(stubs);
                getEmailAlertUsersStub.calledWith('free-signup').should.be.true();

                mailStub.calledWith(
                    sinon.match({subject: '🥳 Free member signup: member@example.com'})
                ).should.be.true();
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('🥳 Free member signup: member@example.com'))
                ).should.be.true();
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

                mailStub.calledOnce.should.be.true();
                testCommonMailData(stubs);
                getEmailAlertUsersStub.calledWith('free-signup').should.be.true();

                mailStub.calledWith(
                    sinon.match({subject: '🥳 Free member signup: Ghost'})
                ).should.be.true();
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('🥳 Free member signup: Ghost'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Source'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Twitter'))
                ).should.be.true();

                // check attribution page
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Welcome Post'))
                ).should.be.true();

                // check attribution url
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('https://example.com/welcome'))
                ).should.be.true();
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

                mailStub.calledOnce.should.be.true();
                testCommonPaidSubMailData({...stubs, member});

                // check attribution text
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Twitter'))
                ).should.be.true();

                // check attribution text
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Source'))
                ).should.be.true();

                // check attribution page
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Welcome Post'))
                ).should.be.true();

                // check attribution url
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('https://example.com/welcome'))
                ).should.be.true();
            });

            it('sends paid subscription start alert without offer', async function () {
                await service.emails.notifyPaidSubscriptionStarted({member, offer: null, tier, subscription}, options);

                mailStub.calledOnce.should.be.true();
                testCommonPaidSubMailData({...stubs, member});

                mailStub.calledWith(
                    sinon.match.has('html', 'Offer')
                ).should.be.false();
            });

            it('sends paid subscription start alert without member name', async function () {
                let memberData = {
                    email: 'member@example.com',
                    id: 'abc'
                };
                await service.emails.notifyPaidSubscriptionStarted({member: memberData, offer: null, tier, subscription}, options);

                mailStub.calledOnce.should.be.true();
                testCommonPaidSubMailData({...stubs, member: memberData});

                mailStub.calledWith(
                    sinon.match.has('html', 'Offer')
                ).should.be.false();

                // check preview text
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Test Tier: $50.00/month'))
                ).should.be.true();
            });

            it('sends paid subscription start alert with percent offer - first payment', async function () {
                await service.emails.notifyPaidSubscriptionStarted({member, offer, tier, subscription}, options);

                mailStub.calledOnce.should.be.true();
                testCommonPaidSubMailData({...stubs, member});

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Half price'))
                ).should.be.true();
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('50% off'))
                ).should.be.true();
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('first payment'))
                ).should.be.true();

                // check preview text
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Test Tier: $50.00/month - Offer: Half price - 50% off, first payment'))
                ).should.be.true();
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

                mailStub.calledOnce.should.be.true();
                testCommonPaidSubMailData({...stubs, member});

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Save ten'))
                ).should.be.true();
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('$10.00 off'))
                ).should.be.true();
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('first 3 months'))
                ).should.be.true();
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

                mailStub.calledOnce.should.be.true();
                testCommonPaidSubMailData({...stubs, member});

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Save twenty'))
                ).should.be.true();
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('$20.00 off'))
                ).should.be.true();
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('forever'))
                ).should.be.true();
            });

            it('sends paid subscription start alert with free trial offer', async function () {
                offer = {
                    name: 'Free week',
                    duration: 'trial',
                    type: 'trial',
                    amount: 7
                };

                await service.emails.notifyPaidSubscriptionStarted({member, offer, tier, subscription}, options);

                mailStub.calledOnce.should.be.true();
                testCommonPaidSubMailData({...stubs, member});

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Free week'))
                ).should.be.true();
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('7 days free'))
                ).should.be.true();
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

                mailStub.calledOnce.should.be.true();
                testCommonPaidSubCancelMailData(stubs);

                // Expiration sentence is in the future tense
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Expires on'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('5 Sep 2024'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', 'Offer')
                ).should.be.false();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Reason: Changed my mind!'))
                ).should.be.true();
            });

            it('sends paid subscription cancel alert when sub is canceled without reason', async function () {
                await service.emails.notifyPaidSubscriptionCanceled({member, tier, subscription, expiryAt, cancelNow}, options);

                mailStub.calledOnce.should.be.true();
                testCommonPaidSubCancelMailData(stubs);

                // Expiration sentence is in the future tense
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Expires on'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('5 Sep 2024'))
                ).should.be.true();

                // Cancellation reason block is hidden
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Reason: '))
                ).should.be.false();
            });

            it('sends paid subscription cancel alert when subscription is canceled immediately', async function () {
                cancelNow = true;
                await service.emails.notifyPaidSubscriptionCanceled({member, tier, subscription: {
                    ...subscription,
                    cancellationReason: 'Payment failed'
                }, expiryAt, canceledAt, cancelNow}, options);

                mailStub.calledOnce.should.be.true();
                testCommonPaidSubCancelMailData(stubs);

                // We don't show "Canceled on" when subscription is canceled immediately
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Canceled on'))
                ).should.be.false();

                // Expiration sentence is in the past tense
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Expired on'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('5 Sep 2024'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', 'Offer')
                ).should.be.false();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Reason: Payment failed'))
                ).should.be.true();
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

                getEmailAlertUsersStub.calledWith('milestone-received').should.be.true();

                mailStub.calledOnce.should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Ghost Site now has 25k members'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Celebrating 25,000 signups'))
                ).should.be.true();

                // Correct image and NO height for Members milestone
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('src="https://static.ghost.org/v5.0.0/images/milestone-email-members-25k.png" width="580" align="center"'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Congrats, <strong>25k people</strong> have chosen to support and follow your work. That’s an audience big enough to sell out Madison Square Garden. What an incredible milestone!'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('View your dashboard'))
                ).should.be.true();
            });

            it('send ARR milestone email', async function () {
                const milestone = {
                    type: 'arr',
                    value: 500000,
                    currency: 'usd',
                    emailSentAt: Date.now()
                };

                await service.emails.notifyMilestoneReceived({milestone});

                getEmailAlertUsersStub.calledWith('milestone-received').should.be.true();

                mailStub.calledOnce.should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Ghost Site hit $500,000 ARR'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Congrats! You reached $500k ARR'))
                ).should.be.true();

                // Correct image and height for ARR milestone
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('src="https://static.ghost.org/v5.0.0/images/milestone-email-usd-500k.png" width="580" height="348" align="center"'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('<strong>Ghost Site</strong> is now generating <strong>$500,000</strong> in annual recurring revenue. Congratulations &mdash; this is a significant milestone.'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Login to your dashboard'))
                ).should.be.true();
            });

            it('does not send email when no date provided', async function () {
                const milestone = {
                    type: 'members',
                    value: 25000
                };

                await service.emails.notifyMilestoneReceived({milestone});

                getEmailAlertUsersStub.calledWith('milestone-received').should.be.false();

                mailStub.called.should.be.false();
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

                getEmailAlertUsersStub.calledWith('milestone-received').should.be.false();

                mailStub.called.should.be.false();
            });

            it('does not send email for a milestone without correct content', async function () {
                const milestone = {
                    type: 'members',
                    value: 5000, // milestone not configured
                    emailSentAt: Date.now()
                };

                await service.emails.notifyMilestoneReceived({milestone});

                getEmailAlertUsersStub.calledWith('milestone-received').should.be.false();

                loggingWarningStub.calledOnce.should.be.true();

                mailStub.called.should.be.false();
            });
        });

        describe('notifyDonationReceived', function () {
            it('send donation email', async function () {
                const donationPaymentEvent = {
                    amount: 1500,
                    currency: 'eur',
                    name: 'Simon',
                    email: 'simon@example.com'
                };

                await service.emails.notifyDonationReceived({donationPaymentEvent});

                getEmailAlertUsersStub.calledWith('donation').should.be.true();

                mailStub.calledOnce.should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('One-time payment received: €15.00 from Simon'))
                ).should.be.true();
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
                textTemplate.should.match(/- Webmentions \(https:\/\/webmention.io\/\)/);
                textTemplate.should.match(/Ghost Demo \(https:\/\/demo.ghost.io\/\)/);
                textTemplate.should.match(/Sent to jamie@example.com from ghost.org/);
            });
        });
    });
});
