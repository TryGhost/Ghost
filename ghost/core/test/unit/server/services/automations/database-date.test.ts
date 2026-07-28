import assert from 'node:assert/strict';
import moment from 'moment-timezone';
import {toDatabaseDate} from '../../../../../core/server/services/automations/database-date';

describe('database date utilities', function () {
    beforeEach(function () {
        // Mirror the timezone behavior of production.
        moment.tz.setDefault('UTC');
    });

    afterEach(function () {
        moment.tz.setDefault();
    });

    describe('toDatabaseDate', function () {
        it('converts Dates to database date strings', function () {
            const input = new Date('2024-06-01T12:34:56Z');
            const result = toDatabaseDate(input);
            assert.strictEqual(result, '2024-06-01 12:34:56');
        });

        it('converts Zulu date strings to database date strings', function () {
            const input = '2024-06-01T12:34:56Z';
            const result = toDatabaseDate(input);
            assert.strictEqual(result, '2024-06-01 12:34:56');
        });

        it('converts timezoned date strings to database date strings', function () {
            const input = '2024-06-01T12:34:56-04:00';
            const result = toDatabaseDate(input);
            assert.strictEqual(result, '2024-06-01 16:34:56');
        });
    });
});
