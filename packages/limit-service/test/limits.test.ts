import { strict as assert } from 'node:assert';


import errors from './fixtures/errors.ts';
import { assertAlwaysCalledWith, assertAlwaysCalledWithLeading, assertThrownCountedError, assertThrownError, assertThrownNamedError } from './utils/assertions.ts';

import type { Count, CurrentCountQuery, GhostErrorOptions, Knex, LimitConfig } from '../src/types.ts';

import { describe, expect, it, vi } from 'vitest';

import { AllowlistLimit, FlagLimit, MaxLimit, MaxPeriodicLimit } from '../src/limits.ts';

describe('Limit', function () {
    describe('Flag Limit', function () {
        it('do nothing if is over limit', async function () {
            // NOTE: the behavior of flag limit in "is over limit" use case is flawed and should not be relied on
            // possible solution could be throwing an error to prevent clients from using it?
            const config = {
                disabled: true
            };
            const limit = new FlagLimit({name: 'flaggy', config, errors});

            const result = await limit.errorIfIsOverLimit();
            assert.equal(result, undefined);
        });

        it('throws if would go over limit', async function () {
            const config = {
                disabled: true
            };
            const limit = new FlagLimit({name: 'limitFlaggy', config, errors});

            try {
                await limit.errorIfWouldGoOverLimit();
                assert.fail('Should have errored');
            } catch (err) {
                assertThrownNamedError(err);
                assert.ok(err);

                assert.ok(err.errorType);
                assert.equal(err.errorType, 'HostLimitError');

                assert.ok(err.errorDetails);
                assert.equal(err.errorDetails.name, 'limitFlaggy');

                assert.ok(err.message);
                assert.equal(err.message, 'Your plan does not support flaggy. Please upgrade to enable flaggy.');
            }
        });

        describe('isDisabled', function () {
            it('returns true if limit is disabled', function () {
                const config = {
                    disabled: true
                };
                const limit = new FlagLimit({name: 'flaggy', config, errors});

                assert.equal(limit.isDisabled(), true);
            });

            it('returns false if limit is disabled', function () {
                const config = {
                    disabled: false
                };
                const limit = new FlagLimit({name: 'flaggy', config, errors});

                assert.equal(limit.isDisabled(), false);
            });

            it('returns false if limit is not defined', function () {
                const config = {
                    disabled: undefined
                };
                const limit = new FlagLimit({name: 'flaggy', config, errors});

                assert.equal(limit.isDisabled(), false);
            });
        });

        it('uses custom error message when error is provided', async function () {
            const config = {
                disabled: true,
                error: 'Custom flag limit error message'
            };
            const limit = new FlagLimit({name: 'limitFlaggy', config, errors});

            try {
                await limit.errorIfWouldGoOverLimit();
                assert.fail('Should have errored');
            } catch (err) {
                assertThrownError(err);
                assert.equal(err.errorType, 'HostLimitError');
                assert.equal(err.message, 'Custom flag limit error message');
            }
        });
    });

    describe('Max Limit', function () {
        describe('Constructor', function () {
            it('passes if within the limit and custom currentCount overriding currentCountQuery', async function () {
                const config = {
                    max: 5,
                    error: 'You have gone over the limit',
                    currentCountQuery: function () {
                        throw new Error('Should not be called');
                    }
                };

                try {
                    const limit = new MaxLimit({name: '', config, errors});
                    await limit.errorIfIsOverLimit({currentCount: 4});
                } catch (error) {
                    assertThrownError(error);
                    assert.fail('Should have not errored');
                }
            });

            it('throws if initialized without a max limit', function () {
                const config = {};

                try {
                    new MaxLimit({name: 'no limits!', config, errors});
                    assert.fail('Should have errored');
                } catch (err) {
                    assertThrownError(err);
                    assert.ok(err);
                    assert.ok(err.errorType);
                    assert.equal(err.errorType, 'IncorrectUsageError');
                    assert.match(err.message, /max limit without a limit/);
                }
            });

            it('throws if initialized without a current count query', function () {
                const config = {
                    max: 100
                };

                try {
                    new MaxLimit({name: 'no accountability!', config, errors});
                    assert.fail('Should have errored');
                } catch (err) {
                    assertThrownError(err);
                    assert.ok(err);
                    assert.ok(err.errorType);
                    assert.equal(err.errorType, 'IncorrectUsageError');
                    assert.match(err.message, /max limit without a current count query/);
                }
            });

            it('throws when would go over the limit and custom currentCount overriding currentCountQuery', async function () {
                const _5MB = 5000000;
                const config = {
                    max: _5MB,
                    formatter: (count: Count) => `${Number(count) / 1000000}MB`,
                    error: 'You have exceeded the maximum file size {{ max }}',
                    currentCountQuery: function () {
                        throw new Error('Should not be called');
                    }
                };

                try {
                    const limit = new MaxLimit({
                        name: 'fileSize',
                        config,
                        errors
                    });
                    const _10MB = 10000000;

                    await limit.errorIfIsOverLimit({currentCount: _10MB});
                } catch (error) {
                    assertThrownCountedError(error);
                    assert.equal(error.errorType, 'HostLimitError');
                    assert.equal(error.errorDetails.name, 'fileSize');
                    assert.equal(error.errorDetails.limit, 5000000);
                    assert.equal(error.errorDetails.total, 10000000);
                    assert.equal(error.message, 'You have exceeded the maximum file size 5MB');
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
                    assert.fail('Should have errored');
                } catch (err) {
                    assertThrownNamedError(err);
                    assert.ok(err);

                    assert.ok(err.errorType);
                    assert.equal(err.errorType, 'HostLimitError');

                    assert.ok(err.errorDetails);
                    assert.equal(err.errorDetails.name, 'maxy');

                    assert.ok(err.message);
                    assert.equal(err.message, 'This action would exceed the maxy limit on your current plan.');
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
                    assert.fail('Should have errored');
                } catch (err) {
                    assertThrownNamedError(err);
                    assert.ok(err);

                    assert.ok(err.errorType);
                    assert.equal(err.errorType, 'HostLimitError');

                    assert.ok(err.errorDetails);
                    assert.equal(err.errorDetails.name, 'maxy');

                    assert.ok(err.message);
                    assert.equal(err.message, 'This action would exceed the maxy limit on your current plan.');
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
                    assert.fail('Should have errored');
                } catch (err) {
                    assertThrownNamedError(err);
                    assert.ok(err);

                    assert.ok(err.errorType);
                    assert.equal(err.errorType, 'HostLimitError');

                    assert.ok(err.errorDetails);
                    assert.equal(err.errorDetails.name, 'maxy');

                    assert.ok(err.message);
                    assert.equal(err.message, 'This action would exceed the maxy limit on your current plan.');
                }
            });

            it('throws if would go over the limit with with custom added count', async function () {
                const config = {
                    max: 23,
                    currentCountQuery: () => 13
                };
                const limit = new MaxLimit({name: 'maxy', config, errors});

                try {
                    await limit.errorIfWouldGoOverLimit({addedCount: 11});
                    assert.fail('Should have errored');
                } catch (err) {
                    assertThrownNamedError(err);
                    assert.ok(err);

                    assert.ok(err.errorType);
                    assert.equal(err.errorType, 'HostLimitError');

                    assert.ok(err.errorDetails);
                    assert.equal(err.errorDetails.name, 'maxy');

                    assert.ok(err.message);
                    assert.equal(err.message, 'This action would exceed the maxy limit on your current plan.');
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
                    assert.fail('Should have errored');
                } catch (err) {
                    assertThrownNamedError(err);
                    assert.ok(err);

                    assert.ok(err.errorType);
                    assert.equal(err.errorType, 'HostLimitError');

                    assert.ok(err.errorDetails);
                    assert.equal(err.errorDetails.name, 'maxy');

                    assert.ok(err.message);
                    assert.equal(err.message, 'This action would exceed the maxy limit on your current plan.');
                }
            });
        });

        describe('Transactions', function () {
            it('passes undefined if no db or transacting option passed', async function () {
                const config = {
                    max: 5,
                    error: 'You have gone over the limit',
                    currentCountQuery: vi.fn()
                };

                config.currentCountQuery.mockResolvedValue(0);

                try {
                    const limit = new MaxLimit({name: '', config, errors});
                    await limit.errorIfIsOverLimit();
                    await limit.errorIfWouldGoOverLimit();
                } catch (error) {
                    assertThrownError(error);
                    assert.fail('Should have not errored');
                }

                expect(config.currentCountQuery).toHaveBeenCalledTimes(2);
                assertAlwaysCalledWith(config.currentCountQuery, undefined);
            });

            it('passes default db if no transacting option passed', async function () {
                const config = {
                    max: 5,
                    error: 'You have gone over the limit',
                    currentCountQuery: vi.fn()
                };

                const db = { knex: 'This is our connection' as unknown as Knex };
                config.currentCountQuery.mockResolvedValue(0);

                try {
                    const limit = new MaxLimit({name: '', config, db, errors});
                    await limit.errorIfIsOverLimit();
                    await limit.errorIfWouldGoOverLimit();
                } catch (error) {
                    assertThrownError(error);
                    assert.fail('Should have not errored');
                }

                expect(config.currentCountQuery).toHaveBeenCalledTimes(2);
                assertAlwaysCalledWith(config.currentCountQuery, db.knex);
            });

            it('passes transacting option', async function () {
                const config = {
                    max: 5,
                    error: 'You have gone over the limit',
                    currentCountQuery: vi.fn()
                };

                const db = { knex: 'This is our connection' as unknown as Knex };
                const transaction = 'Our transaction';
                config.currentCountQuery.mockResolvedValue(0);

                try {
                    const limit = new MaxLimit({name: '', config, db, errors});
                    await limit.errorIfIsOverLimit({transacting: transaction as unknown as Knex});
                    await limit.errorIfWouldGoOverLimit({transacting: transaction as unknown as Knex});
                } catch (error) {
                    assertThrownError(error);
                    assert.fail('Should have not errored');
                }

                expect(config.currentCountQuery).toHaveBeenCalledTimes(2);
                assertAlwaysCalledWith(config.currentCountQuery, transaction);
            });
        });

        describe('generateError', function () {
            it('includes help link when helpLink is provided', function () {
                const helpPreservingErrors = {
                    IncorrectUsageError: errors.IncorrectUsageError,
                    HostLimitError: class extends errors.HostLimitError {
                        help?: string;

                        constructor(options: GhostErrorOptions) {
                            super(options);
                            this.help = options.help;
                        }
                    }
                };
                const config = {
                    max: 5,
                    currentCountQuery: (() => {}) as unknown as CurrentCountQuery,
                    error: 'Over the limit of {{max}}'
                };
                const limit = new MaxLimit({name: 'maxy', config, helpLink: 'https://example.com/help', errors: helpPreservingErrors});
                const error = limit.generateError(10);
                assertThrownNamedError(error);

                assert.equal(error.errorDetails.name, 'maxy');
                assert.equal(error.help, 'https://example.com/help');
            });

            it('falls back to default message when error template throws', function () {
                const config = {
                    max: 5,
                    currentCountQuery: (() => {}) as unknown as CurrentCountQuery,
                    error: 'Limit reached',
                    formatter: () => {
                        throw new Error('formatter failed');
                    }
                };
                const limit = new MaxLimit({name: 'maxy', config, errors});
                const error = limit.generateError(10);

                assert.equal(error.message, 'This action would exceed the maxy limit on your current plan.');
            });
        });
    });

    describe('Periodic Max Limit', function () {
        describe('Constructor', function () {
            it('throws if initialized without a maxPeriodic limit', function () {
                const config = {};

                try {
                    new MaxPeriodicLimit({name: 'no limits!', config, errors});
                    assert.fail('Should have errored');
                } catch (err) {
                    assertThrownError(err);
                    assert.ok(err);
                    assert.ok(err.errorType);
                    assert.equal(err.errorType, 'IncorrectUsageError');
                    assert.match(err.message, /periodic max limit without a limit/gi);
                }
            });

            it('throws if initialized without a current count query', function () {
                const config = {
                    maxPeriodic: 100
                };

                try {
                    new MaxPeriodicLimit({name: 'no accountability!', config, errors});
                    assert.fail('Should have errored');
                } catch (err) {
                    assertThrownError(err);
                    assert.ok(err);
                    assert.ok(err.errorType);
                    assert.equal(err.errorType, 'IncorrectUsageError');
                    assert.match(err.message, /periodic max limit without a current count query/gi);
                }
            });

            it('throws if initialized without interval', function () {
                const config = {
                    maxPeriodic: 100,
                    currentCountQuery: (() => {}) as unknown as CurrentCountQuery
                };

                try {
                    new MaxPeriodicLimit({name: 'no accountability!', config, errors});
                    assert.fail('Should have errored');
                } catch (err) {
                    assertThrownError(err);
                    assert.ok(err);
                    assert.ok(err.errorType);
                    assert.equal(err.errorType, 'IncorrectUsageError');
                    assert.match(err.message, /periodic max limit without an interval/gi);
                }
            });

            it('throws if initialized with unsupported interval', function () {
                const config = {
                    maxPeriodic: 100,
                    currentCountQuery: (() => {}) as unknown as CurrentCountQuery,
                    // Deliberately unsupported: this test is checking it is refused
                    interval: 'week'
                } as unknown as LimitConfig;

                try {
                    new MaxPeriodicLimit({name: 'no accountability!', config, errors});
                    assert.fail('Should have errored');
                } catch (err) {
                    assertThrownError(err);
                    assert.ok(err);
                    assert.ok(err.errorType);
                    assert.equal(err.errorType, 'IncorrectUsageError');
                    assert.match(err.message, /periodic max limit without unsupported interval. Please specify one of: month/gi);
                }
            });

            it('throws if initialized without start date', function () {
                const config = {
                    maxPeriodic: 100,
                    currentCountQuery: (() => {}) as unknown as CurrentCountQuery,
                    interval: 'month' as const
                };

                try {
                    new MaxPeriodicLimit({name: 'no accountability!', config, errors});
                    assert.fail('Should have errored');
                } catch (err) {
                    assertThrownError(err);
                    assert.ok(err);
                    assert.ok(err.errorType);
                    assert.equal(err.errorType, 'IncorrectUsageError');
                    assert.match(err.message, /periodic max limit without a start date/gi);
                }
            });
        });

        describe('Is over limit', function () {
            it('throws if is over the limit', async function () {
                const currentCountyQueryMock = vi.fn().mockReturnValue(11);

                const config = {
                    maxPeriodic: 3,
                    error: 'You have exceeded the number of emails you can send within your billing period.',
                    interval: 'month' as const,
                    startDate: '2021-01-01T00:00:00Z',
                    currentCountQuery: currentCountyQueryMock
                };

                try {
                    const limit = new MaxPeriodicLimit({name: 'mailguard', config, errors});
                    await limit.errorIfIsOverLimit();
                } catch (error) {
                    assertThrownCountedError(error);
                    assert.equal(error.errorType, 'HostLimitError');
                    assert.equal(error.errorDetails.name, 'mailguard');
                    assert.equal(error.errorDetails.limit, 3);
                    assert.equal(error.errorDetails.total, 11);

                    assert.equal(currentCountyQueryMock.mock.calls.length, 1);
                    assert.notEqual(currentCountyQueryMock.mock.calls, undefined);
                    assert.equal((currentCountyQueryMock.mock.calls[0] ?? [])[0], undefined); //knex db connection

                    const nowDate = new Date();
                    const startOfTheMonthDate = new Date(Date.UTC(
                        nowDate.getUTCFullYear(),
                        nowDate.getUTCMonth()
                    )).toISOString();

                    assert.equal((currentCountyQueryMock.mock.calls[0] ?? [])[1], startOfTheMonthDate);
                }
            });
        });

        describe('Would go over limit', function () {
            it('passes if within the limit', async function () {
                const currentCountyQueryMock = vi.fn().mockReturnValue(4);

                const config = {
                    maxPeriodic: 5,
                    error: 'You have exceeded the number of emails you can send within your billing period.',
                    interval: 'month' as const,
                    startDate: '2021-01-01T00:00:00Z',
                    currentCountQuery: currentCountyQueryMock
                };

                try {
                    const limit = new MaxPeriodicLimit({name: 'mailguard', config, errors});
                    await limit.errorIfWouldGoOverLimit();
                } catch (error) {
                    assertThrownError(error);
                    assert.fail('MaxPeriodicLimit errorIfWouldGoOverLimit check should not have errored');
                }
            });

            it('throws if would go over limit', async function () {
                const currentCountyQueryMock = vi.fn().mockReturnValue(5);

                const config = {
                    maxPeriodic: 5,
                    error: 'You have exceeded the number of emails you can send within your billing period.',
                    interval: 'month' as const,
                    startDate: '2021-01-01T00:00:00Z',
                    currentCountQuery: currentCountyQueryMock
                };

                try {
                    const limit = new MaxPeriodicLimit({name: 'mailguard', config, errors});
                    await limit.errorIfWouldGoOverLimit();
                } catch (error) {
                    assertThrownCountedError(error);
                    assert.equal(error.errorType, 'HostLimitError');
                    assert.equal(error.errorDetails.name, 'mailguard');
                    assert.equal(error.errorDetails.limit, 5);
                    assert.equal(error.errorDetails.total, 5);

                    assert.equal(currentCountyQueryMock.mock.calls.length, 1);
                    assert.notEqual(currentCountyQueryMock.mock.calls, undefined);
                    assert.equal((currentCountyQueryMock.mock.calls[0] ?? [])[0], undefined); //knex db connection

                    const nowDate = new Date();
                    const startOfTheMonthDate = new Date(Date.UTC(
                        nowDate.getUTCFullYear(),
                        nowDate.getUTCMonth()
                    )).toISOString();

                    assert.equal((currentCountyQueryMock.mock.calls[0] ?? [])[1], startOfTheMonthDate);
                }
            });

            it('throws if would go over limit with custom added count', async function () {
                const currentCountyQueryMock = vi.fn().mockReturnValue(5);

                const config = {
                    maxPeriodic: 13,
                    error: 'You have exceeded the number of emails you can send within your billing period.',
                    interval: 'month' as const,
                    startDate: '2021-01-01T00:00:00Z',
                    currentCountQuery: currentCountyQueryMock
                };

                try {
                    const limit = new MaxPeriodicLimit({name: 'mailguard', config, errors});
                    await limit.errorIfWouldGoOverLimit({addedCount: 9});
                } catch (error) {
                    assertThrownCountedError(error);
                    assert.equal(error.errorType, 'HostLimitError');
                    assert.equal(error.errorDetails.name, 'mailguard');
                    assert.equal(error.errorDetails.limit, 13);
                    assert.equal(error.errorDetails.total, 5);

                    assert.equal(currentCountyQueryMock.mock.calls.length, 1);
                    assert.notEqual(currentCountyQueryMock.mock.calls, undefined);
                    assert.equal((currentCountyQueryMock.mock.calls[0] ?? [])[0], undefined); //knex db connection

                    const nowDate = new Date();
                    const startOfTheMonthDate = new Date(Date.UTC(
                        nowDate.getUTCFullYear(),
                        nowDate.getUTCMonth()
                    )).toISOString();

                    assert.equal((currentCountyQueryMock.mock.calls[0] ?? [])[1], startOfTheMonthDate);
                }
            });
        });

        describe('Transactions', function () {
            it('passes undefined if no db or transacting option passed', async function () {
                const config = {
                    maxPeriodic: 5,
                    error: 'You have exceeded the number of emails you can send within your billing period.',
                    interval: 'month' as const,
                    startDate: '2021-01-01T00:00:00Z',
                    currentCountQuery: vi.fn()
                };

                config.currentCountQuery.mockResolvedValue(0);

                try {
                    const limit = new MaxPeriodicLimit({name: 'mailguard', config, errors});
                    await limit.errorIfIsOverLimit();
                    await limit.errorIfWouldGoOverLimit();
                } catch (error) {
                    assertThrownError(error);
                    assert.fail('Should have not errored');
                }

                expect(config.currentCountQuery).toHaveBeenCalledTimes(2);
                assertAlwaysCalledWithLeading(config.currentCountQuery, undefined);
            });

            it('passes default db if no transacting option passed', async function () {
                const config = {
                    maxPeriodic: 5,
                    error: 'You have exceeded the number of emails you can send within your billing period.',
                    interval: 'month' as const,
                    startDate: '2021-01-01T00:00:00Z',
                    currentCountQuery: vi.fn()
                };

                const db = { knex: 'This is our connection' as unknown as Knex };
                config.currentCountQuery.mockResolvedValue(0);

                try {
                    const limit = new MaxPeriodicLimit({name: 'mailguard', config, db, errors});
                    await limit.errorIfIsOverLimit();
                    await limit.errorIfWouldGoOverLimit();
                } catch (error) {
                    assertThrownError(error);
                    assert.fail('Should have not errored');
                }

                expect(config.currentCountQuery).toHaveBeenCalledTimes(2);
                assertAlwaysCalledWithLeading(config.currentCountQuery, db.knex);
            });

            it('passes transacting option', async function () {
                const config = {
                    maxPeriodic: 5,
                    error: 'You have exceeded the number of emails you can send within your billing period.',
                    interval: 'month' as const,
                    startDate: '2021-01-01T00:00:00Z',
                    currentCountQuery: vi.fn()
                };

                const db = { knex: 'This is our connection' as unknown as Knex };
                const transaction = 'Our transaction';
                config.currentCountQuery.mockResolvedValue(0);

                try {
                    const limit = new MaxPeriodicLimit({name: 'mailguard', config, db, errors});
                    await limit.errorIfIsOverLimit({transacting: transaction as unknown as Knex});
                    await limit.errorIfWouldGoOverLimit({transacting: transaction as unknown as Knex});
                } catch (error) {
                    assertThrownError(error);
                    assert.fail('Should have not errored');
                }

                expect(config.currentCountQuery).toHaveBeenCalledTimes(2);
                assertAlwaysCalledWithLeading(config.currentCountQuery, transaction);
            });
        });

        describe('generateError', function () {
            it('falls back to default message when error template throws', function () {
                const config = {
                    maxPeriodic: 100,
                    currentCountQuery: (() => {}) as unknown as CurrentCountQuery,
                    interval: 'month' as const,
                    startDate: '2021-01-01T00:00:00Z',
                    error: '{{max.foo.bar}}'
                };
                const limit = new MaxPeriodicLimit({name: 'mailguard', config, errors});
                const error = limit.generateError(50);

                assert.equal(error.message, 'This action would exceed the mailguard limit on your current plan.');
            });
        });
    });

    describe('Allowlist limit', function () {
        it('rejects when the allowlist config isn\'t specified', async function () {
            try {
                new AllowlistLimit({name: 'test', config: {}, errors});
                throw new Error('Should have failed earlier...');
            } catch (error) {
                assertThrownError(error);
                assert.equal(error.errorType, 'IncorrectUsageError');
                assert.match(error.message, /allowlist limit without an allowlist/);
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
                assertThrownError(error);
                assert.equal(error.errorType, 'HostLimitError');
            }
        });

        it('uses custom error message in generateError when error is provided', async function () {
            const limit = new AllowlistLimit({name: 'test', config: {
                allowlist: ['test', 'ok'],
                error: 'Custom allowlist error'
            }, errors});

            try {
                await limit.errorIfIsOverLimit({value: 'unknown value'});
                assert.fail('Should have failed');
            } catch (error) {
                assertThrownError(error);
                assert.equal(error.errorType, 'HostLimitError');
                assert.equal(error.message, 'Custom allowlist error');
            }
        });

        describe('errorIfWouldGoOverLimit', function () {
            it('passes for values in the allowlist', async function () {
                const limit = new AllowlistLimit({name: 'test', config: {
                    allowlist: ['test', 'ok']
                }, errors});

                await limit.errorIfWouldGoOverLimit({value: 'test'});
            });

            it('throws for values not in the allowlist', async function () {
                const limit = new AllowlistLimit({name: 'test', config: {
                    allowlist: ['test', 'ok']
                }, errors});

                try {
                    await limit.errorIfWouldGoOverLimit({value: 'unknown'});
                    assert.fail('Should have failed');
                } catch (error) {
                    assertThrownError(error);
                    assert.equal(error.errorType, 'HostLimitError');
                }
            });

            it('throws IncorrectUsageError when metadata is missing', async function () {
                const limit = new AllowlistLimit({name: 'test', config: {
                    allowlist: ['test', 'ok']
                }, errors});

                try {
                    await limit.errorIfWouldGoOverLimit();
                    assert.fail('Should have failed');
                } catch (error) {
                    assertThrownError(error);
                    assert.equal(error.errorType, 'IncorrectUsageError');
                    assert.match(error.message, /allowlist limit without a value/);
                }
            });

            it('throws IncorrectUsageError when metadata.value is missing', async function () {
                const limit = new AllowlistLimit({name: 'test', config: {
                    allowlist: ['test', 'ok']
                }, errors});

                try {
                    await limit.errorIfWouldGoOverLimit({});
                    assert.fail('Should have failed');
                } catch (error) {
                    assertThrownError(error);
                    assert.equal(error.errorType, 'IncorrectUsageError');
                    assert.match(error.message, /allowlist limit without a value/);
                }
            });
        });
    });
});
