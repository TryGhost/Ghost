// Switch these lines once there are useful utils
// const testUtils = require('./utils');
const sinon = require('sinon');

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
        let getEmailAlertUsersStub;
        let service;
        let options = {
            transacting: {},
            forUpdate: true
        };
        let stubs;
        beforeEach(function () {
            mailStub = sinon.stub().resolves();
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
                settingsCache: {
                    get: (setting) => {
                        if (setting === 'title') {
                            return 'Ghost Site';
                        } else if (setting === 'accent_color') {
                            return '#ffffff';
                        }
                        return '';
                    }
                },
                urlUtils: {
                    getSiteUrl: () => {
                        return 'https://ghost.example';
                    },
                    urlJoin: (adminUrl,hash,path) => {
                        return `${adminUrl}/${hash}${path}`;
                    },
                    urlFor: () => {
                        return 'https://admin.ghost.example';
                    }
                }
            });
            stubs = {mailStub, getEmailAlertUsersStub};
        });
        afterEach(function () {
            sinon.restore();
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

                await service.notifyFreeMemberSignup(member, options);

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

                await service.notifyFreeMemberSignup(member, options);

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
                    plan_amount: 5000,
                    plan_currency: 'USD',
                    plan_interval: 'month',
                    start_date: '2022-08-01T07:30:39.882Z'
                };
            });

            it('sends paid subscription start alert without offer', async function () {
                await service.notifyPaidSubscriptionStart({member, offer: null, tier, subscription}, options);

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
                await service.notifyPaidSubscriptionStart({member: memberData, offer: null, tier, subscription}, options);

                mailStub.calledOnce.should.be.true();
                testCommonPaidSubMailData({...stubs, member: memberData});

                mailStub.calledWith(
                    sinon.match.has('html', 'Offer')
                ).should.be.false();
            });

            it('sends paid subscription start alert with percent offer - first payment', async function () {
                await service.notifyPaidSubscriptionStart({member, offer, tier, subscription}, options);

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
            });

            it('sends paid subscription start alert with fixed type offer - repeating duration', async function () {
                offer = {
                    name: 'Save ten',
                    duration: 'repeating',
                    duration_in_months: 3,
                    type: 'fixed',
                    currency: 'USD',
                    amount: 10
                };

                await service.notifyPaidSubscriptionStart({member, offer, tier, subscription}, options);

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
                    amount: 20
                };

                await service.notifyPaidSubscriptionStart({member, offer, tier, subscription}, options);

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

                await service.notifyPaidSubscriptionStart({member, offer, tier, subscription}, options);

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
                    items: {
                        data: [{
                            price: {
                                unit_amount: 5000,
                                currency: 'USD',
                                recurring: {interval: 'month'}
                            }
                        }]
                    },
                    cancel_at: 1690875039,
                    canceled_at: 1659684639
                };
            });

            it('sends paid subscription cancel alert', async function () {
                let cancellationReason = 'Changed my mind!';
                await service.notifyPaidSubscriptionCancel({member, tier, subscription, cancellationReason}, options);

                mailStub.calledOnce.should.be.true();
                testCommonPaidSubCancelMailData(stubs);

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Subscription will expire on'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Canceled on 5 Aug 2022'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('1 Aug 2023'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', 'Offer')
                ).should.be.false();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Reason: Changed my mind! - '))
                ).should.be.true();
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Cancellation reason'))
                ).should.be.true();
            });

            it('sends paid subscription cancel alert without reason', async function () {
                await service.notifyPaidSubscriptionCancel({member, tier, subscription}, options);

                mailStub.calledOnce.should.be.true();
                testCommonPaidSubCancelMailData(stubs);

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Subscription will expire on'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Canceled on 5 Aug 2022'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('1 Aug 2023'))
                ).should.be.true();

                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Reason: '))
                ).should.be.false();
                mailStub.calledWith(
                    sinon.match.has('html', sinon.match('Cancellation reason'))
                ).should.be.false();
            });
        });
    });
});
