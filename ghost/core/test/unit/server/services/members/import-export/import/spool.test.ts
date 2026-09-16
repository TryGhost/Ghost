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

  it('writes the rows as one JSON file at the root of the imports store and returns its key', async function () {
    const rows = [row('first@example.com'), row('second@example.com')];

    const key = await createRowSpool(importsStore()).write(rows);

    assert.match(key, /^members-import-[0-9a-f-]{36}\.json$/);
    assert.deepEqual(await fs.readdir(storagePath), [key]);
    assert.equal(await fs.readFile(path.join(storagePath, key), 'utf8'), JSON.stringify(rows));
  });

  it('reads the rows back by key and removes the file', async function () {
    const rows = [row('first@example.com')];
    const spool = createRowSpool(importsStore());

    const key = await spool.write(rows);

    assert.deepEqual(await spool.read(key), JSON.parse(JSON.stringify(rows)));
    await spool.remove(key);
    assert.deepEqual(await fs.readdir(storagePath), []);
  });

  // A job reads and removes the rows long after the request wrote them, on whichever
  // spool instance its process built, so nothing may hang off the instance that wrote.
  it('reads and removes rows written by another spool instance', async function () {
    const rows = [row('first@example.com')];

    const key = await createRowSpool(importsStore()).write(rows);
    const later = createRowSpool(importsStore());

    assert.deepEqual(await later.read(key), JSON.parse(JSON.stringify(rows)));
    await later.remove(key);
    assert.deepEqual(await fs.readdir(storagePath), []);
  });
});
