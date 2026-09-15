import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { afterEach, beforeEach, describe, it } from 'vitest';
import LocalStorageBase from '../../../../../../../core/server/adapters/storage/LocalStorageBase';
import { createRowSpool } from '../../../../../../../core/server/services/members/import-export/import/spool';
import type { MemberImportRow } from '../../../../../../../core/server/services/members/import-export/import/row';

const row = (email: string): MemberImportRow => ({
  email,
  name: 'Test Member',
  note: undefined,
  subscribed: true,
  labels: [{ name: 'VIP' }],
  id: undefined,
  complimentary_plan: undefined,
  stripe_customer_id: 'cus_1',
  created_at: undefined,
  import_tier: undefined,
  gift_id: undefined,
});

describe('members import row spool', function () {
  let storagePath: string;
  // Configured the way storage:imports is by default.
  const importsStore = () =>
    new LocalStorageBase({ storagePath, staticFileURLPrefix: 'content/imports' });

  beforeEach(async function () {
    storagePath = await fs.mkdtemp(path.join(os.tmpdir(), 'members-spool-test-'));
  });

  afterEach(async function () {
    await fs.remove(storagePath);
  });

  it('writes the rows as one JSON file at the root of the imports store', async function () {
    const rows = [row('first@example.com'), row('second@example.com')];

    await createRowSpool(importsStore).write(rows);

    const files = await fs.readdir(storagePath);
    assert.equal(files.length, 1);
    assert.match(files[0], /^members-import-[0-9a-f-]{36}\.json$/);
    const filePath = path.join(storagePath, files[0]);
    assert.equal(await fs.readFile(filePath, 'utf8'), JSON.stringify(rows));
  });

  it('reads the rows back and removes the file', async function () {
    const rows = [row('first@example.com')];

    const spooled = await createRowSpool(importsStore).write(rows);

    assert.deepEqual(await spooled.read(), JSON.parse(JSON.stringify(rows)));
    await spooled.remove();
    assert.deepEqual(await fs.readdir(storagePath), []);
  });
});
