import path from 'node:path';
import assert from 'node:assert/strict';
import readMemberRows from '../../../../../../../core/server/services/members/import-export/import/reader';

const fixturesPath = path.join(__dirname, '../csv/fixtures');

describe('member import reader', function () {
  it('carries a newsletters column through the default header mapping', async function () {
    const rows = await readMemberRows(path.join(fixturesPath, 'members-with-newsletters.csv'));

    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0].newsletters, [{ name: 'Daily News' }, { name: 'Weekly Digest' }]);
    assert.deepEqual(rows[1].newsletters, [], 'an empty cell reads as an explicit empty list');
  });

  it('reads the column when a mapping targets it, and drops it when a mapping empties it', async function () {
    const file = path.join(fixturesPath, 'members-with-newsletters.csv');

    const mapped = await readMemberRows(file, { email: 'email', newsletters: 'newsletters' });
    assert.deepEqual(mapped[0].newsletters, [{ name: 'Daily News' }, { name: 'Weekly Digest' }]);

    const emptied = await readMemberRows(file, { email: 'email', newsletters: '' });
    assert.equal(emptied[0].newsletters, undefined);
  });
});
