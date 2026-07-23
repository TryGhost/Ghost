import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parse} from '../../../../../../../core/server/services/members/import-export/csv';

const snapshotDir = path.join(__dirname, 'fixtures', 'snapshots');

describe('snapshot', function () {
    describe('parse', function () {
        it('matches expected output for comprehensive CSV input', async function () {
            const csvPath = path.join(snapshotDir, 'comprehensive-members.csv');
            const mapping = {
                email: 'email',
                name: 'name',
                labels: 'labels',
                subscribed_to_emails: 'subscribed',
                complimentary_plan: 'complimentary_plan',
                note: 'note'
            };

            const result = await parse(csvPath, mapping);
            const expected = JSON.parse(
                fs.readFileSync(path.join(snapshotDir, 'comprehensive-members-expected.json'), 'utf8')
            );

            assert.deepEqual(result, expected);
        });

        it('matches expected output for each individual row', async function () {
            const csvPath = path.join(snapshotDir, 'comprehensive-members.csv');
            const mapping = {
                email: 'email',
                name: 'name',
                labels: 'labels',
                subscribed_to_emails: 'subscribed',
                complimentary_plan: 'complimentary_plan',
                note: 'note'
            };

            const result = await parse(csvPath, mapping);
            const expected = JSON.parse(
                fs.readFileSync(path.join(snapshotDir, 'comprehensive-members-expected.json'), 'utf8')
            );

            assert.equal(result.length, expected.length);
            for (let i = 0; i < expected.length; i++) {
                assert.deepEqual(result[i], expected[i], `Row ${i} (${expected[i].email}) mismatch`);
            }
        });
    });
});
