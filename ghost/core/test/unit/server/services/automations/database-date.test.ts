import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fromDatabaseDate, toDatabaseDate} from '../../../../../core/server/services/automations/database-date';

describe('database date utilities', function () {
    const timezones = [
        {tz: 'UTC', expectedNaive: '2020-01-01T12:34:56.000Z'},
        {tz: 'Africa/Cairo', expectedNaive: '2020-01-01T10:34:56.000Z'},
        {tz: 'Europe/London', expectedNaive: '2020-01-01T12:34:56.000Z'},
        {tz: 'Pacific/Auckland', expectedNaive: '2019-12-31T23:34:56.000Z'}
    ];

    /**
     * Run some code in another timezone.
     *
     * We need to do this in a separate process in order to change the system timezone.
     */
    const runInOtherTimezones = async (toRun: string) => {
        // JSON.stringify does a good job wrapping strings in quotes and escaping.
        const s = JSON.stringify;
        const modulePath = require.resolve('../../../../../core/server/services/automations/database-date');

        await Promise.all(timezones.map(async ({tz, expectedNaive}) => {
            const source = `
            const assert = require('node:assert/strict');
            const {fromDatabaseDate, toDatabaseDate} = require(${s(modulePath)});

            assert.deepEqual(new Date('2020-01-01 12:34:56'), new Date(${s(expectedNaive)}), 'test setup');

            ${toRun}
            `;

            const child = spawn(
                process.execPath,
                ['-e', source],
                {stdio: 'inherit', env: {...process.env, TZ: tz}}
            );
            const [code] = await once(child, 'exit');
            assert.equal(code, 0, `Child process exited with code ${code}. 0 was expected`);
        }));
    };

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

        it('converts unzoned strings to UTC date strings in your system timezone', function () {
            const input = '2020-01-01 12:34:56';
            const result = toDatabaseDate(input);
            assert.strictEqual(result, '2020-01-01 12:34:56');
        });

        it('converts unzoned strings to UTC date strings in other system timezones', async function () {
            await runInOtherTimezones(`
                assert.deepEqual(toDatabaseDate('2020-01-01 12:34:56'), '2020-01-01 12:34:56');
            `);
        });
    });

    describe('fromDatabaseDate', function () {
        it('clones Date objects', function () {
            const input = new Date('2020-01-01T12:34:56Z');
            const result = fromDatabaseDate(input);
            assert.deepEqual(result, input, 'they are deep equal');
            assert.notEqual(result, input, 'they are not the same object');
        });

        it('converts strings to Date objects, parsing as UTC, in your system timezone', async function () {
            assert.deepEqual(fromDatabaseDate('2020-01-01T12:34:56.000Z'), new Date('2020-01-01T12:34:56.000Z'));
        });

        it('converts strings to Date objects, parsing as UTC, in other system timezones', async function () {
            await runInOtherTimezones(`
                assert.deepEqual(fromDatabaseDate('2020-01-01 12:34:56'), new Date('2020-01-01T12:34:56.000Z'));
            `);
        });

        it('converts numbers to Date objects', function () {
            assert.deepEqual(fromDatabaseDate(1577882096000), new Date('2020-01-01T12:34:56.000Z'));
        });
    });
});
