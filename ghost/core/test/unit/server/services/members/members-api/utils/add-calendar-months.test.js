const assert = require('node:assert/strict');
const addCalendarMonths = require('../../../../../../../core/server/services/members/members-api/utils/add-calendar-months');

describe('addCalendarMonths', function () {
    it('clamps to month end for non-leap years', function () {
        const currentPeriodEnd = new Date(Date.UTC(2025, 0, 31, 12, 34, 56));
        const result = addCalendarMonths(currentPeriodEnd, 1);

        assert.equal(result.toISOString(), '2025-02-28T12:34:56.000Z');
    });

    it('clamps to month end for leap years', function () {
        const currentPeriodEnd = new Date(Date.UTC(2024, 0, 31, 8, 15, 0));
        const result = addCalendarMonths(currentPeriodEnd, 1);

        assert.equal(result.toISOString(), '2024-02-29T08:15:00.000Z');
    });

    it('preserves day when target month has enough days', function () {
        const currentPeriodEnd = new Date(Date.UTC(2025, 0, 15, 23, 59, 59));
        const result = addCalendarMonths(currentPeriodEnd, 1);

        assert.equal(result.toISOString(), '2025-02-15T23:59:59.000Z');
    });

    it('preserves time and milliseconds', function () {
        const currentPeriodEnd = new Date(Date.UTC(2025, 7, 31, 1, 2, 3, 456));
        const result = addCalendarMonths(currentPeriodEnd, 6);

        assert.equal(result.toISOString(), '2026-02-28T01:02:03.456Z');
    });

    it('accepts numeric strings for months', function () {
        const currentPeriodEnd = new Date(Date.UTC(2025, 0, 31, 12, 0, 0));
        const result = addCalendarMonths(currentPeriodEnd, '1');

        assert.equal(result.toISOString(), '2025-02-28T12:00:00.000Z');
    });

    it('throws for invalid inputs', function () {
        assert.throws(() => addCalendarMonths('not-a-date', 1), /valid date/);
        assert.throws(() => addCalendarMonths(new Date(), 0), /positive integer/);
        assert.throws(() => addCalendarMonths(new Date(), 1.5), /positive integer/);
    });
});
