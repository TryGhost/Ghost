// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const LimitService = require('../lib/limit-service');
const {MaxLimit, MaxPeriodicLimit, FlagLimit} = require('../lib/limit');

const errors = require('./fixtures/errors');

describe('Limit Service', function () {
    describe('Lodash Template', function () {
        it('Does not get clobbered by this lib', function () {
            require('../lib/limit');
            let _ = require('lodash');

            _.templateSettings.interpolate.should.eql(/<%=([\s\S]+?)%>/g);
        });
    });

    describe('Error Messages', function () {
        it('Formats numbers correctly', function () {
            let limit = new MaxLimit({
                name: 'test',
                config: {
                    max: 35000000,
                    currentCountQuery: () => {},
                    error: 'Your plan supports up to {{max}} staff users. Please upgrade to add more.'
                },
                errors
            });

            let error = limit.generateError(35000001);

            error.message.should.eql('Your plan supports up to 35,000,000 staff users. Please upgrade to add more.');
            error.errorDetails.limit.should.eql(35000000);
            error.errorDetails.total.should.eql(35000001);
        });

        it('Supports {{max}} and {{count}} variables', function () {
            let limit = new MaxLimit({
                name: 'test',
                config: {
                    max: 5,
                    currentCountQuery: () => {},
                    error: 'Your plan supports up to {{max}} staff users. You are currently at {{count}} staff users.Please upgrade to add more.'
                },
                errors
            });

            let error = limit.generateError(7);

            error.message.should.eql('Your plan supports up to 5 staff users. You are currently at 7 staff users.Please upgrade to add more.');
            error.errorDetails.limit.should.eql(5);
            error.errorDetails.total.should.eql(7);
        });
    });

    describe('Loader', function () {
        it('throws if errors configuration is not specified', function () {
            const limitService = new LimitService();

            let limits = {staff: {max: 2}};

            try {
                limitService.loadLimits({limits});
                should.fail(limitService, 'Should have errored');
            } catch (err) {
                should.exist(err);
                err.message.should.eql(`Config Missing: 'errors' is required.`);
            }
        });

        it('can load a basic limit', function () {
            const limitService = new LimitService();

            let limits = {staff: {max: 2}};

            limitService.loadLimits({limits, errors});

            limitService.limits.should.be.an.Object().with.properties(['staff']);
            limitService.limits.staff.should.be.an.instanceOf(MaxLimit);
            limitService.isLimited('staff').should.be.true();
            limitService.isLimited('members').should.be.false();
        });

        it('can load a periodic max limit', function () {
            const limitService = new LimitService();

            let limits = {
                emails: {
                    maxPeriodic: 3
                }
            };

            let subscription = {
                interval: 'month',
                startDate: '2021-09-18T19:00:52Z'
            };

            limitService.loadLimits({limits, subscription, errors});

            limitService.limits.should.be.an.Object().with.properties(['emails']);
            limitService.limits.emails.should.be.an.instanceOf(MaxPeriodicLimit);
            limitService.isLimited('emails').should.be.true();
            limitService.isLimited('staff').should.be.false();
        });

        it('throws when loadding a periodic max limit without a subscription', function () {
            const limitService = new LimitService();

            let limits = {
                emails: {
                    maxPeriodic: 3
                }
            };

            try {
                limitService.loadLimits({limits, errors});
                throw new Error('Should have failed earlier...');
            } catch (error) {
                error.errorType.should.equal('IncorrectUsageError');
                error.message.should.match(/periodic max limit without a subscription/);
            }
        });

        it('can load multiple limits', function () {
            const limitService = new LimitService();

            let limits = {
                staff: {max: 2},
                members: {max: 100},
                emails: {disabled: true}
            };

            limitService.loadLimits({limits, errors});

            limitService.limits.should.be.an.Object().with.properties(['staff', 'members']);
            limitService.limits.staff.should.be.an.instanceOf(MaxLimit);
            limitService.limits.members.should.be.an.instanceOf(MaxLimit);
            limitService.isLimited('staff').should.be.true();
            limitService.isLimited('members').should.be.true();
            limitService.isLimited('emails').should.be.true();
        });

        it('can load camel cased limits', function () {
            const limitService = new LimitService();

            let limits = {customThemes: {disabled: true}};

            limitService.loadLimits({limits, errors});

            limitService.limits.should.be.an.Object().with.properties(['customThemes']);
            limitService.limits.customThemes.should.be.an.instanceOf(FlagLimit);
            limitService.isLimited('staff').should.be.false();
            limitService.isLimited('members').should.be.false();
            limitService.isLimited('custom_themes').should.be.true();
            limitService.isLimited('customThemes').should.be.true();
        });

        it('can load incorrectly cased limits', function () {
            const limitService = new LimitService();

            let limits = {custom_themes: {disabled: true}};

            limitService.loadLimits({limits, errors});

            limitService.limits.should.be.an.Object().with.properties(['customThemes']);
            limitService.limits.customThemes.should.be.an.instanceOf(FlagLimit);
            limitService.isLimited('staff').should.be.false();
            limitService.isLimited('members').should.be.false();
            limitService.isLimited('custom_themes').should.be.true();
            limitService.isLimited('customThemes').should.be.true();
        });

        it('answers correctly when no limits are provided', function () {
            const limitService = new LimitService();

            let limits = {};

            limitService.loadLimits({limits, errors});

            limitService.isLimited('staff').should.be.false();
            limitService.isLimited('members').should.be.false();
            limitService.isLimited('custom_themes').should.be.false();
            limitService.isLimited('customThemes').should.be.false();
            limitService.isLimited('emails').should.be.false();
        });

        it('populates new limits if called multiple times', function () {
            const limitService = new LimitService();

            const staffLimit = {staff: {max: 2}};

            limitService.loadLimits({limits: staffLimit, errors});

            limitService.limits.should.be.an.Object().with.properties(['staff']);
            limitService.limits.staff.should.be.an.instanceOf(MaxLimit);
            limitService.isLimited('staff').should.be.true();
            limitService.isLimited('members').should.be.false();

            const membersLimit = {members: {max: 3}};

            limitService.loadLimits({limits: membersLimit, errors});

            limitService.limits.should.be.an.Object().with.properties(['members']);
            limitService.limits.members.should.be.an.instanceOf(MaxLimit);
            limitService.isLimited('staff').should.be.false();
            limitService.isLimited('members').should.be.true();
        });
    });

    describe('Custom limit count query configuration', function () {
        it('can use a custom implementation of max limit query', async function () {
            const limitService = new LimitService();

            let limits = {
                staff: {
                    max: 2,
                    currentCountQuery: () => 5
                },
                members: {
                    max: 100,
                    currentCountQuery: () => 100
                }
            };

            limitService.loadLimits({limits, errors});

            (await limitService.checkIsOverLimit('staff')).should.be.true();
            (await limitService.checkWouldGoOverLimit('staff')).should.be.true();

            (await limitService.checkIsOverLimit('members')).should.be.false();
            (await limitService.checkWouldGoOverLimit('members')).should.be.true();
        });
    });
});
