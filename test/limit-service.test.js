// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const LimitService = require('../lib/limit-service');
const {MaxLimit, FlagLimit} = require('../lib/limit');

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

        it('can load multiple limits', function () {
            const limitService = new LimitService();

            let limits = {staff: {max: 2}, members: {max: 100}};

            limitService.loadLimits({limits, errors});

            limitService.limits.should.be.an.Object().with.properties(['staff', 'members']);
            limitService.limits.staff.should.be.an.instanceOf(MaxLimit);
            limitService.limits.members.should.be.an.instanceOf(MaxLimit);
            limitService.isLimited('staff').should.be.true();
            limitService.isLimited('members').should.be.true();
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
