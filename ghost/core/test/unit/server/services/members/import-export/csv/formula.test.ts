import assert from 'node:assert/strict';
import {stripFormulaGuard} from '../../../../../../../core/server/services/members/import-export/csv';

// The inverse of the export's papaparse escapeFormulae guard. Behaviour end-to-end is
// proven in the members import HTTP API tests; the trigger set is pinned here.
describe('stripFormulaGuard', function () {
    it('strips a lone apostrophe before a formula trigger', function () {
        for (const trigger of ['=', '+', '-', '@', '\t', '\r']) {
            assert.equal(stripFormulaGuard(`'${trigger}SUM(A1)`), `${trigger}SUM(A1)`);
        }
    });

    it('leaves an apostrophe before a non-trigger character alone', function () {
        assert.equal(stripFormulaGuard('\'tis'), '\'tis');
        assert.equal(stripFormulaGuard('\'\''), '\'\'');
    });

    it('leaves a value that is not guarded alone', function () {
        assert.equal(stripFormulaGuard('=SUM(A1)'), '=SUM(A1)');
        assert.equal(stripFormulaGuard('plain'), 'plain');
        assert.equal(stripFormulaGuard(''), '');
    });
});
