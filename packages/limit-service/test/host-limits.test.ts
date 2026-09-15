import { strict as assert } from 'node:assert';

import { describe, it } from 'vitest';

import { readHostSettings } from '../src/index.ts';

const limitsOf = (raw: unknown) => readHostSettings(raw).settings.limits;
const setAside = (raw: unknown) => readHostSettings(raw).rejected.map(limit => limit.name);

describe('Reading a host\'s settings', function () {
    describe('what a host configured', function () {
        it('reads a site with no limits as having none', function () {
            assert.deepEqual(limitsOf(undefined), {});
            assert.deepEqual(limitsOf(null), {});
            assert.deepEqual(limitsOf({}), {});
            assert.deepEqual(limitsOf({limits: {}}), {});
        });

        it('reads the values a host sends as strings as the numbers they stand for', function () {
            // Ghost(Pro) keeps host settings in one string column, so this is the ordinary
            // case rather than the odd one. Everything downstream is typed as a number.
            assert.deepEqual(limitsOf({limits: {staff: {max: '5'}}}), {staff: {max: 5}});
            assert.deepEqual(limitsOf({limits: {staff: {max: '0'}}}), {staff: {max: 0}});
        });

        it('keeps a value a host sends as a number', function () {
            assert.deepEqual(limitsOf({limits: {staff: {max: 5}}}), {staff: {max: 5}});
        });

        it('reads a flag the way a host means it, including the string false', function () {
            // 'false' is truthy, so a host writing it switches the feature off. That is what
            // a site configured this way gets today, so it is what it keeps getting.
            assert.deepEqual(limitsOf({limits: {limitAnalytics: {disabled: 'false'}}}), {
                limitAnalytics: {disabled: true}
            });
            assert.deepEqual(limitsOf({limits: {limitAnalytics: {disabled: false}}}), {
                limitAnalytics: {disabled: false}
            });
        });

        it('reads a limit spelled the way a host spelled it', function () {
            assert.deepEqual(limitsOf({limits: {limit_stripe_connect: {disabled: true}}}), {
                limitStripeConnect: {disabled: true}
            });
        });

        it('keeps an allowlist and the wording a host wrote', function () {
            assert.deepEqual(
                limitsOf({limits: {customThemes: {allowlist: ['casper'], error: 'Upgrade.'}}}),
                {customThemes: {allowlist: ['casper'], error: 'Upgrade.'}}
            );
        });

        it('reads a limit with no custom wording, however the host says so', function () {
            // Every limit Ghost(Pro) sends carries this key, and most carry it empty.
            assert.deepEqual(limitsOf({limits: {staff: {max: 5, error: null}}}), {staff: {max: 5}});
        });
    });

    describe('a limit it cannot use', function () {
        it('sets that limit aside and keeps every other one', function () {
            const raw = {
                limits: {
                    staff: {max: 5},
                    members: {max: 'lots'},
                    limitAnalytics: {disabled: true}
                }
            };

            assert.deepEqual(limitsOf(raw), {staff: {max: 5}, limitAnalytics: {disabled: true}});
            assert.deepEqual(setAside(raw), ['members']);
        });

        it('sets aside a list with nothing on it, which would allow nothing', function () {
            assert.deepEqual(setAside({limits: {customThemes: {allowlist: []}}}), ['customThemes']);
        });

        it('sets aside a maximum on a limit with nothing to count', function () {
            assert.deepEqual(setAside({limits: {customIntegrations: {max: 5}}}), [
                'customIntegrations'
            ]);
        });

        it('sets aside a limit that resets on something with nothing to count', function () {
            assert.deepEqual(
                setAside({
                    limits: {customIntegrations: {maxPeriodic: 1}},
                    subscription: {start: '2026-01-01T00:00:00.000Z'}
                }),
                ['customIntegrations']
            );
        });

        it('sets aside a limit that resets with no period to reset against', function () {
            assert.deepEqual(setAside({limits: {emails: {maxPeriodic: 1}}}), ['emails']);
        });

        it('says what was wrong with it, so it can be found in a log', function () {
            const {rejected} = readHostSettings({limits: {members: {max: 'lots'}}});

            assert.equal(rejected.length, 1);
            assert.equal(rejected[0]?.name, 'members');
            assert.match(String(rejected[0]?.reason), /max/);
        });

        it('never refuses, whatever a host sends', function () {
            // Nothing a host can configure may stop a site starting.
            assert.doesNotThrow(() => readHostSettings('everything'));
            assert.doesNotThrow(() => readHostSettings({limits: {staff: 'yes'}}));
            assert.doesNotThrow(() => readHostSettings({limits: 'yes'}));
        });
    });

    describe('a limit this version has never heard of', function () {
        it('passes over it without complaint', function () {
            // A host may configure a limit a newer Ghost understands and this one does not,
            // and passing over it is not a misconfiguration worth reporting.
            const raw = {limits: {subdirectory: {disabled: 'true'}, staff: {max: 5}}};

            assert.deepEqual(limitsOf(raw), {staff: {max: 5}});
            assert.deepEqual(setAside(raw), []);
        });
    });

    describe('the period a limit that resets counts from', function () {
        it('reads a site without one as having none', function () {
            assert.equal(readHostSettings({}).settings.subscription, undefined);
            assert.equal(readHostSettings({subscription: null}).settings.subscription, undefined);
            assert.equal(readHostSettings({subscription: {}}).settings.subscription, undefined);
        });

        it('reads a subscription whose start date is empty as no subscription', function () {
            // A site that has no subscription date says so in more than one way, and none
            // of them is a mistake.
            assert.equal(
                readHostSettings({subscription: {start: null}}).settings.subscription,
                undefined
            );
            assert.equal(
                readHostSettings({subscription: {start: ''}}).settings.subscription,
                undefined
            );
        });

        it('reads the start date a host sent', function () {
            assert.deepEqual(
                readHostSettings({subscription: {start: '2026-01-01T00:00:00.000Z'}}).settings
                    .subscription,
                {startDate: '2026-01-01T00:00:00.000Z', interval: 'month'}
            );
        });

        it('sets aside a start date that is not a date, and the limits that needed it', function () {
            // A period is counted from this date. Counting from one nobody can read would
            // judge a site's whole history against an allowance meant for a single period.
            const raw = {
                limits: {emails: {maxPeriodic: 1}, staff: {max: 2}},
                subscription: {start: 'not a date'}
            };

            assert.equal(readHostSettings(raw).settings.subscription, undefined);
            assert.deepEqual(setAside(raw), ['subscription', 'emails']);
            assert.deepEqual(limitsOf(raw), {staff: {max: 2}});
        });
    });
});
