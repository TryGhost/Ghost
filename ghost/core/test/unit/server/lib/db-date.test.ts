import assert from 'node:assert/strict';
import {toDatabaseDate} from '../../../../core/server/lib/db-date';

describe('db-date', function () {
    it('formats dates as UTC database timestamps', function () {
        assert.equal(toDatabaseDate(new Date('2026-08-05T12:00:00.000Z')), '2026-08-05 12:00:00');
        assert.equal(toDatabaseDate(new Date('2026-08-05T23:45:30.999Z')), '2026-08-05 23:45:30');
    });
});
