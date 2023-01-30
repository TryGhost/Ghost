// Switch these lines once there are useful utils
// const testUtils = require('./utils');
const sinon = require('sinon');
const {MemberCreatedEvent, SubscriptionCancelledEvent, SubscriptionCreatedEvent} = require('@tryghost/member-events');
const {MentionCreatedEvent} = require('@tryghost/webmentions');

require('./utils');
const StaffService = require('../lib/staff-service');

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

    mailStub.calledWith(
        sinon.match.has('html', sinon.match('Subscription started on 1 Aug 2022'))
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
        let subscribeStub;
        let getEmailAlertUsersStub;
        let service;
        let options = {
            transacting: {},
            forUpdate: true
        };
        let stubs;

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

        const settingsHelpers = {
            getDefaultEmailDomain: () => {
                return 'ghost.example';
            }
        };

        beforeEach(function () {
            mailStub = sinon.stub().resolves();
            subscribeStub = sinon.stub().resolves();
            getEmailAlertUsersStub = sinon.stub().resolves([{
                email: 'owner@ghost.org',
                slug: 'ghost'
            }]);
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
                DomainEvents: {
                    subscribe: subscribeStub
                },
                settingsCache,
                urlUtils,
                settingsHelpers
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
                subscribeStub.calledWith(SubscriptionCreatedEvent).should.be.true();
                subscribeStub.calledWith(SubscriptionCancelledEvent).should.be.true();
                subscribeStub.calledWith(MemberCreatedEvent).should.be.true();
                subscribeStub.calledWith(MentionCreatedEvent).should.be.true();
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
                    settingsHelpers,
                    labs: {
                        isSet: () => 'webmentionEmail'
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
                await service.handleEvent(SubscriptionCreatedEvent, {
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
            
            it('handles new mention notification', async function () {
                await service.handleEvent(MentionCreatedEvent, {
                    data: {
                        mention: {
                            source: 'https://exmaple.com/some-post',
                            target: 'https://exmaple.com/some-mentioned-post',
                            sourceSiteTitle: 'Exmaple'
                        }
                    }
                });
                mailStub.calledWith(
                    sinon.match({subject: `💌 New mention from: Exmaple`})
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

                await service.emails.notifyFreeMemberSignup(member, options);

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
                    sinon.match.has('html', sinon.match('Created on 1 Aug 2022 &#8226; France'))
                ).should.be.true();
            });

            it('sends free member signup alert without member name', async function () {
                const member = {
                    email: 'member@example.com',
                    id: 'abc',
                    geolocation: '{"country": "France"}',
                    created_at: '2022-08-01T07:30:39.882Z'
                };

                await service.emails.notifyFreeMemberSignup(member, options);

                mailStub.calledOnce.should.be.true();
                testCommonMailData(stubs);
                getEmailAlertUsersStub.calledWith('free-signup').should.be.true();

                mailStub.calledWith(
                    sinon.match({subject: '🥳 Free member signup: member@example.com'})
                ).should.be.true();
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('🥳 Free member signup: member@example.com'))
                ).should.be.true();
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Created on 1 Aug 2022 &#8226; France'))
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
                    id: 'abc',
                    geolocation: '{"country": "France"}',
                    created_at: '2022-08-01T07:30:39.882Z'
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
                    id: 'abc',
                    geolocation: '{"country": "France"}',
                    created_at: '2022-08-01T07:30:39.882Z'
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
                    interval: 'month',
                    cancelAt: '2024-08-01T07:30:39.882Z',
                    canceledAt: '2022-08-05T07:30:39.882Z'
                };
            });

            it('sends paid subscription cancel alert', async function () {
                await service.emails.notifyPaidSubscriptionCanceled({member, tier, subscription: {
                    ...subscription,
                    cancellationReason: 'Changed my mind!'
                }}, options);

                mailStub.calledOnce.should.be.true();
                testCommonPaidSubCancelMailData(stubs);

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Subscription will expire on'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Canceled on 5 Aug 2022'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('1 Aug 2024'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', 'Offer')
                ).should.be.false();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Reason: Changed my mind!'))
                ).should.be.true();
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Cancellation reason'))
                ).should.be.true();
            });

            it('sends paid subscription cancel alert without reason', async function () {
                await service.emails.notifyPaidSubscriptionCanceled({member, tier, subscription}, options);

                mailStub.calledOnce.should.be.true();
                testCommonPaidSubCancelMailData(stubs);

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Subscription will expire on'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Canceled on 5 Aug 2022'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('1 Aug 2024'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Reason: '))
                ).should.be.false();
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Cancellation reason'))
                ).should.be.false();

                // check preview text
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('A paid member has just canceled their subscription.'))
                ).should.be.true();
            });
        });
    });
});
