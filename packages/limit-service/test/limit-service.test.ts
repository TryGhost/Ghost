import { strict as assert } from 'node:assert';


import errors from './fixtures/errors.ts';
import { assertAlwaysCalledWith, assertExists, assertHasLimits, assertThrownCountedError, assertThrownError } from './utils/assertions.ts';

import type { CurrentCountQuery, LoadLimitsOptions } from '../src/types.ts';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { LimitService } from '../src/limit-service.ts';
import { FlagLimit, MaxLimit, MaxPeriodicLimit } from '../src/limits.ts';
// Imported for the side effect the assertion below is about: this package uses a custom
// template interpolation and must not leave it applied to everyone else's lodash.
import '../src/limits.ts';
import LimitServiceFromIndex from '../src/index.ts';
import _ from 'lodash';

const noLimits = LimitService.unlimited(errors);

describe('Limit Service', function () {
    it('is exported via the package index', function () {
        assert.equal(LimitServiceFromIndex, LimitService);
    });

    describe('Lodash Template', function () {
        it('Does not get clobbered by this lib', function () {
            assertExists(_.templateSettings.interpolate);
            assert.deepEqual(_.templateSettings.interpolate, /<%=([\s\S]+?)%>/g);
        });
    });

    describe('Error Messages', function () {
        it('Formats numbers correctly', function () {
            const limit = new MaxLimit({
                name: 'test',
                config: {
                    max: 35000000,
                    currentCountQuery: (() => {}) as unknown as CurrentCountQuery,
                    error: 'Your plan supports up to {{max}} staff users. Please upgrade to add more.'
                },
                errors
            });

            const error = limit.generateError(35000001);
            assertThrownCountedError(error);

            assert.deepEqual(error.message, 'Your plan supports up to 35,000,000 staff users. Please upgrade to add more.');
            assert.deepEqual(error.errorDetails.limit, 35000000);
            assert.deepEqual(error.errorDetails.total, 35000001);
        });

        it('Supports {{max}}, {{count}}, and {{name}} variables', function () {
            const limit = new MaxLimit({
                name: 'Test Resources',
                config: {
                    max: 5,
                    currentCountQuery: (() => {}) as unknown as CurrentCountQuery,
                    error: '{{name}} limit reached. Your plan supports up to {{max}} staff users. You are currently at {{count}} staff users.Please upgrade to add more.'
                },
                errors
            });

            const error = limit.generateError(7);
            assertThrownCountedError(error);

            assert.deepEqual(error.message, 'Test Resources limit reached. Your plan supports up to 5 staff users. You are currently at 7 staff users.Please upgrade to add more.');
            assert.deepEqual(error.errorDetails.name, 'Test Resources');
            assert.deepEqual(error.errorDetails.limit, 5);
            assert.deepEqual(error.errorDetails.total, 7);
        });
    });

    describe('Loader', function () {
        it('throws if errors configuration is not specified', function () {
            const limits = {staff: {max: 2}};

            try {
                new LimitService({ limits } as unknown as LoadLimitsOptions);
                assert.fail('Should have errored');
            } catch (err) {
                // A plain error, because what the caller failed to supply is the classes
                // this would otherwise be raised with.
                assert.ok(err instanceof Error);
                assert.deepEqual(err.message, `Config Missing: 'errors' is required.`);
            }
        });

        it('can load a max limit', function () {
            const limits = {staff: {max: 2}};

            const limitService = new LimitService({limits, errors});

            assertHasLimits(limitService.limits, ['staff']);
            assertExists(limitService.limits.staff);
            assert.ok(limitService.limits.staff instanceof MaxLimit);
            assert.equal(limitService.isLimited('staff'), true);
            assert.equal(limitService.isLimited('members'), false);
        });

        it('can load a periodic max limit', function () {
            const limits = {
                emails: {
                    maxPeriodic: 3
                }
            };

            const subscription = {
                interval: 'month' as const,
                startDate: '2021-09-18T19:00:52Z'
            };

            const limitService = new LimitService({limits, subscription, errors});

            assertHasLimits(limitService.limits, ['emails']);
            assertExists(limitService.limits.emails);
            assert.ok(limitService.limits.emails instanceof MaxPeriodicLimit);
            assert.equal(limitService.isLimited('emails'), true);
            assert.equal(limitService.isLimited('staff'), false);
        });

        it('throws when loadding a periodic max limit without a subscription', function () {
            const limits = {
                emails: {
                    maxPeriodic: 3
                }
            };

            try {
                new LimitService({limits, errors});
                throw new Error('Should have failed earlier...');
            } catch (error) {
                assertThrownError(error);
                assert.equal(error.errorType, 'IncorrectUsageError');
                assert.match(error.message, /periodic max limit without a subscription/);
            }
        });

        it('can load multiple limits', function () {
            const limits = {
                staff: {max: 2},
                members: {max: 100},
                emails: {disabled: true},
                limitStripeConnect: {disabled: true},
                limitSocialWeb: {disabled: true}
            };

            const limitService = new LimitService({limits, errors});

            assertHasLimits(limitService.limits, ['staff', 'members', 'emails', 'limitStripeConnect', 'limitSocialWeb']);
            assertExists(limitService.limits.staff);
            assert.ok(limitService.limits.staff instanceof MaxLimit);
            assertExists(limitService.limits.members);
            assert.ok(limitService.limits.members instanceof MaxLimit);
            assertExists(limitService.limits.emails);
            assert.ok(limitService.limits.emails instanceof FlagLimit);
            assertExists(limitService.limits.limitStripeConnect);
            assert.ok(limitService.limits.limitStripeConnect instanceof FlagLimit);
            assertExists(limitService.limits.limitSocialWeb);
            assert.ok(limitService.limits.limitSocialWeb instanceof FlagLimit);
            assert.equal(limitService.isLimited('staff'), true);
            assert.equal(limitService.isLimited('members'), true);
            assert.equal(limitService.isLimited('emails'), true);
            assert.equal(limitService.isLimited('limitStripeConnect'), true);
            assert.equal(limitService.isLimited('limitSocialWeb'), true);
        });

        it('can load publicSiteAccess flag limit', function () {
            const limits = {publicSiteAccess: {disabled: true}};

            const limitService = new LimitService({limits, errors});

            assertHasLimits(limitService.limits, ['publicSiteAccess']);
            assertExists(limitService.limits.publicSiteAccess);
            assert.ok(limitService.limits.publicSiteAccess instanceof FlagLimit);
            assert.equal(limitService.isLimited('publicSiteAccess'), true);
            assert.equal(limitService.isDisabled('publicSiteAccess'), true);
        });

        it('can load camel cased limits', function () {
            const limits = {customThemes: {disabled: true}};

            const limitService = new LimitService({limits, errors});

            assertHasLimits(limitService.limits, ['customThemes']);
            assertExists(limitService.limits.customThemes);
            assert.ok(limitService.limits.customThemes instanceof FlagLimit);
            assert.equal(limitService.isLimited('staff'), false);
            assert.equal(limitService.isLimited('members'), false);
            assert.equal(limitService.isLimited('custom_themes'), true);
            assert.equal(limitService.isLimited('customThemes'), true);
        });

        it('can load incorrectly cased limits', function () {
            const limits = {custom_themes: {disabled: true}};

            const limitService = new LimitService({limits, errors});

            assertHasLimits(limitService.limits, ['customThemes']);
            assertExists(limitService.limits.customThemes);
            assert.ok(limitService.limits.customThemes instanceof FlagLimit);
            assert.equal(limitService.isLimited('staff'), false);
            assert.equal(limitService.isLimited('members'), false);
            assert.equal(limitService.isLimited('custom_themes'), true);
            assert.equal(limitService.isLimited('customThemes'), true);
        });

        it('answers correctly when no limits are provided', function () {
            const limits = {};

            const limitService = new LimitService({limits, errors});

            assert.equal(limitService.isLimited('staff'), false);
            assert.equal(limitService.isLimited('members'), false);
            assert.equal(limitService.isLimited('custom_themes'), false);
            assert.equal(limitService.isLimited('customThemes'), false);
            assert.equal(limitService.isLimited('emails'), false);
        });

        it('carries only the limits it was built with', function () {
            const staffLimit = {staff: {max: 2}};

            const limitService = new LimitService({limits: staffLimit, errors});

            assertHasLimits(limitService.limits, ['staff']);
            assertExists(limitService.limits.staff);
            assert.ok(limitService.limits.staff instanceof MaxLimit);
            assert.equal(limitService.isLimited('staff'), true);
            assert.equal(limitService.isLimited('members'), false);

            const membersLimit = {members: {max: 3}};

            const rebuilt = new LimitService({limits: membersLimit, errors});

            assertHasLimits(rebuilt.limits, ['members']);
            assertExists(rebuilt.limits.members);
            assert.ok(rebuilt.limits.members instanceof MaxLimit);
            assert.equal(rebuilt.isLimited('staff'), false);
            assert.equal(rebuilt.isLimited('members'), true);
        });
    });

    describe('Custom limit count query configuration', function () {
        it('can use a custom implementation of max limit query', async function () {
            const limits = {
                staff: {
                    max: 2,
                    currentCountQuery: () => 5
                },
                members: {
                    max: 100,
                    currentCountQuery: () => 100
                }
            };

            const limitService = new LimitService({limits, errors});

            assert.equal(await limitService.checkIsOverLimit('staff'), true);
            assert.equal(await limitService.checkWouldGoOverLimit('staff'), true);

            assert.equal(await limitService.checkIsOverLimit('members'), false);
            assert.equal(await limitService.checkWouldGoOverLimit('members'), true);
        });
    });

    describe('Check if any of configured limits are acceded', function () {
        it('Confirms an acceded limit', async function () {
            const limits = {
                staff: {
                    max: 2,
                    currentCountQuery: () => 5
                },
                members: {
                    max: 100,
                    currentCountQuery: () => 100
                },
                emails: {
                    maxPeriodic: 3,
                    currentCountQuery: () => 5
                },
                customIntegrations: {
                    disabled: true
                },
                limitStripeConnect: {
                    disabled: true
                },
                limitSocialWeb: {
                    disabled: true
                }
            };

            const subscription = {
                interval: 'month' as const,
                startDate: '2021-09-18T19:00:52Z'
            };

            const limitService = new LimitService({limits, errors, subscription});

            assert.equal((await limitService.checkIfAnyOverLimit()), true);
        });

        it('Does not check flag limits when checking if any are over limit', async function () {
            const limits = {
                staff: {
                    max: 2,
                    currentCountQuery: () => 1
                },
                members: {
                    max: 100,
                    currentCountQuery: () => 2
                },
                emails: {
                    maxPeriodic: 3,
                    currentCountQuery: () => 2
                },
                // TODO: allowlist type of limits doesn't have "checkIsOverLimit" implemented yet!
                // customThemes: {
                //     allowlist: ['casper', 'dawn', 'lyra']
                // },
                customIntegrations: {
                    disabled: true
                },
                limitAnalytics: {
                    disabled: true
                },
                limitStripeConnect: {
                    disabled: true
                },
                limitSocialWeb: {
                    disabled: true
                }
            };

            const subscription = {
                interval: 'month' as const,
                startDate: '2021-09-18T19:00:52Z'
            };

            const limitService = new LimitService({limits, errors, subscription});

            // Should return false because flag limits' errorIfIsOverLimit does not throw
            assert.equal((await limitService.checkIfAnyOverLimit()), false);
        });

        it('Returns nothing if limit is not configured', async function () {
            const isOverLimitResult = await noLimits.checkIsOverLimit('unlimited');
            assert.equal(isOverLimitResult, false);

            const wouldGoOverLimitResult = await noLimits.checkWouldGoOverLimit('unlimited');
            assert.equal(wouldGoOverLimitResult, false);

            const errorIfIsOverLimitResult = await noLimits.errorIfIsOverLimit('unlimited');
            assert.equal(errorIfIsOverLimitResult, undefined);

            const errorIfWouldGoOverLimitResult = await noLimits.errorIfWouldGoOverLimit('unlimited');
            assert.equal(errorIfWouldGoOverLimitResult, undefined);
        });

        it('Throws an error when an allowlist limit is checked', async function () {
            const limits = {
                // TODO: allowlist type of limits doesn't have "checkIsOverLimit" implemented yet!
                customThemes: {
                    allowlist: ['casper', 'dawn', 'lyra']
                }
            };

            const limitService = new LimitService({limits, errors});

            try {
                await limitService.checkIfAnyOverLimit();
                assert.fail('Should have errored');
            } catch (err) {
                assertThrownError(err);
                assert.deepEqual(err.message, `Attempted to check an allowlist limit without a value`);
            }
        });
    });

    describe('checkWouldGoOverLimit', function () {
        it('rethrows non-HostLimitError from errorIfWouldGoOverLimit', async function () {
            const limits = {
                customThemes: {
                    allowlist: ['casper', 'dawn', 'lyra']
                }
            };

            const limitService = new LimitService({limits, errors});

            try {
                await limitService.checkWouldGoOverLimit('customThemes', {});
                assert.fail('Should have thrown');
            } catch (err) {
                assertThrownError(err);
                assert.equal(err.errorType, 'IncorrectUsageError');
                assert.match(err.message, /allowlist limit without a value/);
            }
        });
    });

    describe('Metadata', function () {
        afterEach(function () {
            vi.restoreAllMocks();
        });

        it('passes options for checkIsOverLimit', async function () {
            const limits = {
                staff: {
                    max: 2,
                    currentCountQuery: () => 1
                }
            };

            const maxSpy = vi.spyOn(MaxLimit.prototype, 'errorIfIsOverLimit');

            const subscription = {
                interval: 'month' as const,
                startDate: '2021-09-18T19:00:52Z'
            };

            const limitService = new LimitService({limits, errors, subscription});

            const options = {
                testData: 'true'
            };

            await limitService.checkIsOverLimit('staff', options);

            expect(maxSpy).toHaveBeenCalledTimes(1);
            assertAlwaysCalledWith(maxSpy, options);
        });

        it('passes options for checkWouldGoOverLimit', async function () {
            const limits = {
                staff: {
                    max: 2,
                    currentCountQuery: () => 1
                }
            };

            const maxSpy = vi.spyOn(MaxLimit.prototype, 'errorIfWouldGoOverLimit');

            const subscription = {
                interval: 'month' as const,
                startDate: '2021-09-18T19:00:52Z'
            };

            const limitService = new LimitService({limits, errors, subscription});

            const options = {
                testData: 'true'
            };

            await limitService.checkWouldGoOverLimit('staff', options);

            expect(maxSpy).toHaveBeenCalledTimes(1);
            assertAlwaysCalledWith(maxSpy, options);
        });

        it('passes options for errorIfIsOverLimit', async function () {
            const limits = {
                staff: {
                    max: 2,
                    currentCountQuery: () => 1
                }
            };

            const maxSpy = vi.spyOn(MaxLimit.prototype, 'errorIfIsOverLimit');

            const subscription = {
                interval: 'month' as const,
                startDate: '2021-09-18T19:00:52Z'
            };

            const limitService = new LimitService({limits, errors, subscription});

            const options = {
                testData: 'true'
            };

            await limitService.errorIfIsOverLimit('staff', options);

            expect(maxSpy).toHaveBeenCalledTimes(1);
            assertAlwaysCalledWith(maxSpy, options);
        });

        it('passes options for errorIfWouldGoOverLimit', async function () {
            const limits = {
                staff: {
                    max: 2,
                    currentCountQuery: () => 1
                }
            };

            const maxSpy = vi.spyOn(MaxLimit.prototype, 'errorIfWouldGoOverLimit');

            const subscription = {
                interval: 'month' as const,
                startDate: '2021-09-18T19:00:52Z'
            };

            const limitService = new LimitService({limits, errors, subscription});

            const options = {
                testData: 'true'
            };

            await limitService.errorIfWouldGoOverLimit('staff', options);

            expect(maxSpy).toHaveBeenCalledTimes(1);
            assertAlwaysCalledWith(maxSpy, options);
        });

        it('passes options for checkIfAnyOverLimit', async function () {
            const limits = {
                staff: {
                    max: 2,
                    currentCountQuery: () => 2
                },
                members: {
                    max: 100,
                    currentCountQuery: () => 100
                },
                emails: {
                    maxPeriodic: 3,
                    currentCountQuery: () => 3
                },
                customIntegrations: {
                    disabled: false // Not disabled, so won't be over limit
                },
                limitAnalytics: {
                    disabled: true,
                    // A flag limit with a count query, which is the grandfathered shape
                    currentCountQuery: (() => true) as unknown as CurrentCountQuery
                },
                limitStripeConnect: {
                    disabled: false // Not disabled, so won't be over limit
                },
                limitSocialWeb: {
                    disabled: false // Not disabled, so won't be over limit
                }
            };

            const flagSpy = vi.spyOn(FlagLimit.prototype, 'errorIfIsOverLimit');
            const maxSpy = vi.spyOn(MaxLimit.prototype, 'errorIfIsOverLimit');
            const maxPeriodSpy = vi.spyOn(MaxPeriodicLimit.prototype, 'errorIfIsOverLimit');

            const subscription = {
                interval: 'month' as const,
                startDate: '2021-09-18T19:00:52Z'
            };

            const limitService = new LimitService({limits, errors, subscription});

            const options = {
                testData: 'true'
            };

            // Should return false because no limits are exceeded
            assert.equal((await limitService.checkIfAnyOverLimit(options)), false);

            // We have 4 flag limits now: customIntegrations, limitAnalytics, limitStripeConnect, and limitSocialWeb
            expect(flagSpy).toHaveBeenCalledTimes(4);
            assertAlwaysCalledWith(flagSpy, options);

            expect(maxSpy).toHaveBeenCalledTimes(2);
            assertAlwaysCalledWith(maxSpy, options);

            expect(maxPeriodSpy).toHaveBeenCalledTimes(1);
            assertAlwaysCalledWith(maxPeriodSpy, options);
        });
    });

    describe('isDisabled', function () {
        it('is not disabled if the limit is not configured', function () {
            assert.equal(noLimits.isDisabled('test'), false);
        });

        it('throws if the limit does not implement .isDisabled()', function () {
            const limits = {
                staff: {
                    max: 2,
                    currentCountQuery: () => 1
                }
            };

            const limitService = new LimitService({limits, errors});

            try {
                limitService.isDisabled('staff');
                assert.fail('Should have thrown an error');
            } catch (err) {
                assertThrownError(err);
                assert.equal(err.message, `Limit staff does not support .isDisabled()`);
            }
        });

        it('returns true if the limit is disabled', function () {
            const limits = {
                limitSocialWeb: {
                    disabled: true
                }
            };

            const limitService = new LimitService({limits, errors});
            assert.equal(limitService.isDisabled('limitSocialWeb'), true);
        });

        it('returns false if the limit is not disabled', function () {
            const limits = {
                limitSocialWeb: {
                    disabled: false
                }
            };

            const limitService = new LimitService({limits, errors});
            assert.equal(limitService.isDisabled('limitSocialWeb'), false);
        });
    });
});

/**
 * A site can be limited in one way and not another, so every check has to answer for a
 * limit its host never configured. That is a different question to a site with no limits
 * at all, which an unlimited service answers.
 */
describe('A limit its host did not configure', function () {
    const limitService = new LimitService({limits: {staff: {max: 2}}, errors});

    it('is not limited', function () {
        assert.equal(limitService.isLimited('members'), false);
    });

    it('is not switched off', function () {
        assert.equal(limitService.isDisabled('members'), false);
    });

    it('answers the checks rather than refusing them', async function () {
        assert.equal(await limitService.checkIsOverLimit('members'), false);
        assert.equal(await limitService.checkWouldGoOverLimit('members'), false);
    });

    it('raises nothing', async function () {
        await limitService.errorIfIsOverLimit('members');
        await limitService.errorIfWouldGoOverLimit('members');
    });
});
