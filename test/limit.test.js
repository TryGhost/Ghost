// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const errors = require('./fixtures/errors');
const {MaxLimit, AllowlistLimit, FlagLimit, MaxPeriodicLimit} = require('../lib/limit');

describe('Limit Service', function () {
    describe('Flag Limit', function () {
        it('do nothing if is over limit', async function () {
            // NOTE: the behavior of flag limit in "is over limit" usecase is flawed and should not be relied on
            //       possible solution could be throwing an error to prevent clients from using it?
            const config = {
                disabled: true
            };
            const limit = new FlagLimit({name: 'flaggy', config, errors});

            const result = await limit.errorIfIsOverLimit();
            should(result).be.undefined();
        });

        it('throws if would go over limit', async function () {
            const config = {
                disabled: true
            };
            const limit = new FlagLimit({name: 'flaggy', config, errors});

            try {
                await limit.errorIfWouldGoOverLimit();
                should.fail(limit, 'Should have errored');
            } catch (err) {
                should.exist(err);

                should.exist(err.errorType);
                should.equal(err.errorType, 'HostLimitError');

                should.exist(err.errorDetails);
                should.equal(err.errorDetails.name, 'flaggy');

                should.exist(err.message);
                should.equal(err.message, 'Your plan does not support flaggy. Please upgrade to enable flaggy.');
            }
        });
    });

    describe('Max Limit', function () {
        describe('Constructor', function () {
            it('throws if initialized without a max limit', function () {
                const config = {};

                try {
                    const limit = new MaxLimit({name: 'no limits!', config, errors});
                    should.fail(limit, 'Should have errored');
                } catch (err) {
                    should.exist(err);
                    should.exist(err.errorType);
                    should.equal(err.errorType, 'IncorrectUsageError');
                    err.message.should.match(/max limit without a limit/);
                }
            });

            it('throws if initialized without a current count query', function () {
                const config = {
                    max: 100
                };

                try {
                    const limit = new MaxLimit({name: 'no accountability!', config, errors});
                    should.fail(limit, 'Should have errored');
                } catch (err) {
                    should.exist(err);
                    should.exist(err.errorType);
                    should.equal(err.errorType, 'IncorrectUsageError');
                    err.message.should.match(/max limit without a current count query/);
                }
            });
        });

        describe('Is over limit', function () {
            it('throws if is over the limit', async function () {
                const config = {
                    max: 3,
                    currentCountQuery: () => 42
                };
                const limit = new MaxLimit({name: 'maxy', config, errors});

                try {
                    await limit.errorIfIsOverLimit();
                    should.fail(limit, 'Should have errored');
                } catch (err) {
                    should.exist(err);

                    should.exist(err.errorType);
                    should.equal(err.errorType, 'HostLimitError');

                    should.exist(err.errorDetails);
                    should.equal(err.errorDetails.name, 'maxy');

                    should.exist(err.message);
                    should.equal(err.message, 'This action would exceed the maxy limit on your current plan.');
                }
            });

            it('passes if does not go over the limit', async function () {
                const config = {
                    max: 1,
                    currentCountQuery: () => 1
                };

                const limit = new MaxLimit({name: 'maxy', config, errors});

                await limit.errorIfIsOverLimit();
            });

            it('ignores default configured max limit when it is passed explicitly', async function () {
                const config = {
                    max: 10,
                    currentCountQuery: () => 10
                };

                const limit = new MaxLimit({name: 'maxy', config, errors});

                // should pass as the limit is exactly on the limit 10 >= 10
                await limit.errorIfIsOverLimit({max: 10});

                try {
                    // should fail because limit is overridden to 10 < 9
                    await limit.errorIfIsOverLimit({max: 9});
                    should.fail(limit, 'Should have errored');
                } catch (err) {
                    should.exist(err);

                    should.exist(err.errorType);
                    should.equal(err.errorType, 'HostLimitError');

                    should.exist(err.errorDetails);
                    should.equal(err.errorDetails.name, 'maxy');

                    should.exist(err.message);
                    should.equal(err.message, 'This action would exceed the maxy limit on your current plan.');
                }
            });
        });

        describe('Would go over limit', function () {
            it('throws if would go over the limit', async function () {
                const config = {
                    max: 1,
                    currentCountQuery: () => 1
                };
                const limit = new MaxLimit({name: 'maxy', config, errors});

                try {
                    await limit.errorIfWouldGoOverLimit();
                    should.fail(limit, 'Should have errored');
                } catch (err) {
                    should.exist(err);

                    should.exist(err.errorType);
                    should.equal(err.errorType, 'HostLimitError');

                    should.exist(err.errorDetails);
                    should.equal(err.errorDetails.name, 'maxy');

                    should.exist(err.message);
                    should.equal(err.message, 'This action would exceed the maxy limit on your current plan.');
                }
            });

            it('passes if does not go over the limit', async function () {
                const config = {
                    max: 2,
                    currentCountQuery: () => 1
                };

                const limit = new MaxLimit({name: 'maxy', config, errors});

                await limit.errorIfWouldGoOverLimit();
            });

            it('ignores default configured max limit when it is passed explicitly', async function () {
                const config = {
                    max: 10,
                    currentCountQuery: () => 10
                };

                const limit = new MaxLimit({name: 'maxy', config, errors});

                // should pass as the limit is overridden to 10 + 1 = 11
                await limit.errorIfWouldGoOverLimit({max: 11});

                try {
                    // should fail because limit is overridden to 10 + 1 < 1
                    await limit.errorIfWouldGoOverLimit({max: 1});
                    should.fail(limit, 'Should have errored');
                } catch (err) {
                    should.exist(err);

                    should.exist(err.errorType);
                    should.equal(err.errorType, 'HostLimitError');

                    should.exist(err.errorDetails);
                    should.equal(err.errorDetails.name, 'maxy');

                    should.exist(err.message);
                    should.equal(err.message, 'This action would exceed the maxy limit on your current plan.');
                }
            });
        });
    });

    describe('Periodic Max Limit', function () {
        describe('Constructor', function () {
            it('throws if initialized without a maxPeriodic limit', function () {
                const config = {};

                try {
                    const limit = new MaxPeriodicLimit({name: 'no limits!', config, errors});
                    should.fail(limit, 'Should have errored');
                } catch (err) {
                    should.exist(err);
                    should.exist(err.errorType);
                    should.equal(err.errorType, 'IncorrectUsageError');
                    err.message.should.match(/periodic max limit without a limit/gi);
                }
            });

            it('throws if initialized without a current count query', function () {
                const config = {
                    maxPeriodic: 100
                };

                try {
                    const limit = new MaxPeriodicLimit({name: 'no accountability!', config, errors});
                    should.fail(limit, 'Should have errored');
                } catch (err) {
                    should.exist(err);
                    should.exist(err.errorType);
                    should.equal(err.errorType, 'IncorrectUsageError');
                    err.message.should.match(/periodic max limit without a current count query/gi);
                }
            });

            it('throws if initialized without interval', function () {
                const config = {
                    maxPeriodic: 100,
                    currentCountQuery: () => {}
                };

                try {
                    const limit = new MaxPeriodicLimit({name: 'no accountability!', config, errors});
                    should.fail(limit, 'Should have errored');
                } catch (err) {
                    should.exist(err);
                    should.exist(err.errorType);
                    should.equal(err.errorType, 'IncorrectUsageError');
                    err.message.should.match(/periodic max limit without an interval/gi);
                }
            });

            it('throws if initialized with unsupported interval', function () {
                const config = {
                    maxPeriodic: 100,
                    currentCountQuery: () => {},
                    interval: 'week'
                };

                try {
                    const limit = new MaxPeriodicLimit({name: 'no accountability!', config, errors});
                    should.fail(limit, 'Should have errored');
                } catch (err) {
                    should.exist(err);
                    should.exist(err.errorType);
                    should.equal(err.errorType, 'IncorrectUsageError');
                    err.message.should.match(/periodic max limit without unsupported interval. Please specify one of: month/gi);
                }
            });

            it('throws if initialized without start date', function () {
                const config = {
                    maxPeriodic: 100,
                    currentCountQuery: () => {},
                    interval: 'month'
                };

                try {
                    const limit = new MaxPeriodicLimit({name: 'no accountability!', config, errors});
                    should.fail(limit, 'Should have errored');
                } catch (err) {
                    should.exist(err);
                    should.exist(err.errorType);
                    should.equal(err.errorType, 'IncorrectUsageError');
                    err.message.should.match(/periodic max limit without a start date/gi);
                }
            });
        });

        describe('Is over limit', function () {
            it('throws if is over the limit', async function () {
                const currentCountyQueryMock = sinon.mock().returns(11);

                const config = {
                    maxPeriodic: 3,
                    error: 'You have exceeded the number of emails you can send within your billing period.',
                    interval: 'month',
                    startDate: '2021-01-01T00:00:00Z',
                    currentCountQuery: currentCountyQueryMock
                };

                try {
                    const limit = new MaxPeriodicLimit({name: 'mailguard', config, errors});
                    await limit.errorIfIsOverLimit();
                } catch (error) {
                    error.errorType.should.equal('HostLimitError');
                    error.errorDetails.name.should.equal('mailguard');
                    error.errorDetails.limit.should.equal(3);
                    error.errorDetails.total.should.equal(11);

                    currentCountyQueryMock.callCount.should.equal(1);
                    should(currentCountyQueryMock.args).not.be.undefined();
                    should(currentCountyQueryMock.args[0][0]).be.undefined(); //knex db connection

                    const nowDate = new Date();
                    const startOfTheMonthDate = new Date(Date.UTC(
                        nowDate.getUTCFullYear(),
                        nowDate.getUTCMonth()
                    )).toISOString();

                    currentCountyQueryMock.args[0][1].should.equal(startOfTheMonthDate);
                }
            });
        });
    });

    describe('Allowlist limit', function () {
        it('rejects when the allowlist config isn\'t specified', async function () {
            try {
                new AllowlistLimit({name: 'test', config: {}, errors});
                throw new Error('Should have failed earlier...');
            } catch (error) {
                error.errorType.should.equal('IncorrectUsageError');
                error.message.should.match(/allowlist limit without an allowlist/);
            }
        });

        it('accept correct values', async function () {
            const limit = new AllowlistLimit({name: 'test', config: {
                allowlist: ['test', 'ok']
            }, errors});

            await limit.errorIfIsOverLimit({value: 'test'});
        });

        it('rejects unknown values', async function () {
            const limit = new AllowlistLimit({name: 'test', config: {
                allowlist: ['test', 'ok']
            }, errors});

            try {
                await limit.errorIfIsOverLimit({value: 'unknown value'});
                throw new Error('Should have failed earlier...');
            } catch (error) {
                error.errorType.should.equal('HostLimitError');
            }
        });
    });
});
