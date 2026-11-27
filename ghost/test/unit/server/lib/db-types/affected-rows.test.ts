import assert from 'node:assert/strict';
import { getAffectedRows } from '../../../../../core/server/lib/db-types/affected-rows';

describe('getAffectedRows', function () {
  it('reads MySQL raw UPDATE results', function () {
    assert.equal(getAffectedRows([{ affectedRows: 3 }, undefined]), 3);
    assert.equal(getAffectedRows([{ affectedRows: 0 }, undefined]), 0);
  });

  it('reads SQLite raw UPDATE results', function () {
    assert.equal(getAffectedRows({ changes: 3, lastInsertRowid: 12 }), 3);
    assert.equal(getAffectedRows({ changes: 0, lastInsertRowid: 12 }), 0);
  });

  it('rejects unexpected result shapes rather than treating them as zero changes', function () {
    for (const result of [undefined, null, [], {}, [{ affectedRows: -1 }], { changes: 1.5 }]) {
      assert.throws(() => getAffectedRows(result));
    }
  });
});
