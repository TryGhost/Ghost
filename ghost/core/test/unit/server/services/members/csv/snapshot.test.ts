import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import assert from 'node:assert/strict';
import {parse, unparse} from '../../../../../../core/server/services/members/csv';

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

    describe('round-trip (unparse then re-parse)', function () {
        let tmpFile: string | undefined;

        afterEach(function () {
            if (tmpFile && fs.existsSync(tmpFile)) {
                fs.unlinkSync(tmpFile);
            }
        });

        it('unparse -> re-parse produces expected snapshot', async function () {
            const input = JSON.parse(
                fs.readFileSync(path.join(snapshotDir, 'roundtrip-input.json'), 'utf8')
            );

            const csv = unparse(input);
            tmpFile = path.join(os.tmpdir(), `members-csv-roundtrip-${Date.now()}.csv`);
            fs.writeFileSync(tmpFile, csv);

            const mapping = {
                id: 'id',
                email: 'email',
                name: 'name',
                note: 'note',
                subscribed_to_emails: 'subscribed',
                complimentary_plan: 'complimentary_plan',
                stripe_customer_id: 'stripe_customer_id',
                created_at: 'created_at',
                deleted_at: 'deleted_at',
                labels: 'labels',
                tiers: 'tiers'
            };

            const result = await parse(tmpFile, mapping);
            const expected = JSON.parse(
                fs.readFileSync(path.join(snapshotDir, 'roundtrip-expected.json'), 'utf8')
            );

            assert.deepEqual(result, expected);
        });

        it('unparse -> re-parse matches for each individual row', async function () {
            const input = JSON.parse(
                fs.readFileSync(path.join(snapshotDir, 'roundtrip-input.json'), 'utf8')
            );

            const csv = unparse(input);
            tmpFile = path.join(os.tmpdir(), `members-csv-roundtrip-row-${Date.now()}.csv`);
            fs.writeFileSync(tmpFile, csv);

            const mapping = {
                id: 'id',
                email: 'email',
                name: 'name',
                note: 'note',
                subscribed_to_emails: 'subscribed',
                complimentary_plan: 'complimentary_plan',
                stripe_customer_id: 'stripe_customer_id',
                created_at: 'created_at',
                deleted_at: 'deleted_at',
                labels: 'labels',
                tiers: 'tiers'
            };

            const result = await parse(tmpFile, mapping);
            const expected = JSON.parse(
                fs.readFileSync(path.join(snapshotDir, 'roundtrip-expected.json'), 'utf8')
            );

            assert.equal(result.length, expected.length);
            for (let i = 0; i < expected.length; i++) {
                assert.deepEqual(result[i], expected[i], `Row ${i} (${expected[i].email}) mismatch`);
            }
        });

        it('unparse output is stable CSV string', function () {
            const input = JSON.parse(
                fs.readFileSync(path.join(snapshotDir, 'roundtrip-input.json'), 'utf8')
            );

            const csv1 = unparse(input);
            const csv2 = unparse(input);

            assert.equal(csv1, csv2);
        });
    });
});
