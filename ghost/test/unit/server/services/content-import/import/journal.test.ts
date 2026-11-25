import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import errors from '@tryghost/errors';
import {
  ImportJournal,
  readErrorParts,
  readJournalPosition,
  readOutcomeParts,
  journalRecord,
  type JournalStorage,
} from '../../../../../../core/server/services/content-import/import/journal';
import type { RowOutcome } from '../../../../../../core/server/services/content-import/import/store';

function storageFixture() {
  const files = new Map<string, Buffer>();
  const writes: string[] = [];
  const storage: JournalStorage = {
    async readStream({ path }) {
      const bytes = files.get(path);
      if (!bytes) {
        throw new errors.NotFoundError();
      }
      return Readable.from([bytes]);
    },
    async writeStream(key, source) {
      const chunks: Buffer[] = [];
      for await (const chunk of source) {
        chunks.push(Buffer.from(chunk));
      }
      files.set(key, Buffer.concat(chunks));
      writes.push(key);
    },
    async replaceMetadata(key, bytes) {
      files.set(key, bytes);
      writes.push(key);
    },
  };
  return { files, writes, storage };
}

function outcome(line: number, overrides: Partial<RowOutcome> = {}): RowOutcome {
  return { line, title: `Post ${line}`, status: 'created', ...overrides };
}

describe('CSV import journal', function () {
  it('streams quoted journal data across UTF-8 boundaries and skips empty records', async function () {
    const values = [outcome(2, { title: 'Café, "hello" 🌍\nNext line' }), outcome(3)];
    const bytes = Buffer.from(values.map(journalRecord).join('\r\n\r\n') + '\r\n');
    const source = Readable.from(Array.from(bytes, (byte) => Buffer.from([byte])));
    const { storage } = storageFixture();
    storage.readStream = async () => source;
    const rows: RowOutcome[] = [];
    for await (const row of readOutcomeParts(storage, { record: 2, part: 1 })) {
      rows.push(row);
    }
    assert.deepEqual(rows, values);
    assert.equal(source.destroyed, true);
  });

  it.each(['"unclosed', 'not-json', journalRecord(outcome(2)) + ',unexpected-cell'])(
    'rejects damaged journal data and closes its source: %s',
    async function (data) {
      const { storage } = storageFixture();
      const source = Readable.from([data]);
      storage.readStream = async () => source;
      await assert.rejects(async () => {
        for await (const _row of readOutcomeParts(storage, { record: 1, part: 1 })) {
          assert.fail('Damaged journal data must not produce an outcome');
        }
      });
      assert.equal(source.destroyed, true);
    },
  );

  it('closes journal input when reporting stops early', async function () {
    const { storage } = storageFixture();
    const source = Readable.from([journalRecord(outcome(2)) + '\r\n' + journalRecord(outcome(3))]);
    storage.readStream = async () => source;
    const rows = readOutcomeParts(storage, { record: 2, part: 1 });
    assert.deepEqual((await rows.next()).value, outcome(2));
    await rows.return(undefined);
    assert.equal(source.destroyed, true);
  });

  it('rejects damaged checkpoints, missing markers and oversized metadata', async function () {
    const { storage } = storageFixture();
    await storage.replaceMetadata('checkpoint.txt', Buffer.from('not-a-number'));
    await assert.rejects(readJournalPosition(storage), /Invalid CSV import checkpoint/);
    await storage.replaceMetadata('checkpoint.txt', Buffer.from('1'));
    await assert.rejects(readJournalPosition(storage), /Invalid CSV import checkpoint/);
    await storage.replaceMetadata('commits/1.txt', Buffer.from('2'));
    await assert.rejects(readJournalPosition(storage), /Invalid CSV import journal part/);
    await storage.replaceMetadata('checkpoint.txt', Buffer.alloc(16 * 1024 + 1, '0'));
    await assert.rejects(readJournalPosition(storage), /metadata exceeded its limit/);
    const error = new Error('storage unavailable');
    const unavailable = {
      ...storage,
      readStream: async () => {
        throw error;
      },
    };
    await assert.rejects(readJournalPosition(unavailable), (thrown) => thrown === error);
  });
  it('writes both parts and the marker before advancing the row checkpoint', async function () {
    const { storage, writes } = storageFixture();
    const origin = await readJournalPosition(storage);
    assert.deepEqual(origin, { record: 0, part: 0 });
    const journal = new ImportJournal(storage, ['Headline'], origin);
    for (let i = 1; i <= 24; i++) {
      await journal.append(outcome(i + 1));
    }
    assert.deepEqual(writes, []);
    await journal.append(
      outcome(26, { status: 'failed', reason: 'Invalid', source: { Headline: '=formula' } }),
    );
    assert.deepEqual(writes, [
      'outcomes/1.csv',
      'errors/1.csv',
      'commits/25.txt',
      'checkpoint.txt',
    ]);
    const position = await readJournalPosition(storage);
    assert.deepEqual(position, { record: 25, part: 1 });
    const rows: RowOutcome[] = [];
    for await (const row of readOutcomeParts(storage, position)) {
      rows.push(row);
    }
    assert.equal(rows.length, 25);
    assert.deepEqual(rows.at(-1), outcome(26, { status: 'failed', reason: 'Invalid' }));
    let data = '';
    for await (const chunk of readErrorParts(storage, position)) {
      data += chunk.toString();
    }
    assert.equal(data, `failed,Invalid,,"'=formula"\r\n`);
  });

  it.each(['outcomes/2.csv', 'errors/2.csv', 'commits/2.txt', 'checkpoint.txt'])(
    'leaves the previous checkpoint readable when %s fails',
    async function (failedKey) {
      const { storage } = storageFixture();
      const initial = new ImportJournal(storage, [], { record: 0, part: 0 });
      await initial.append(outcome(2));
      const checkpoint = await initial.flush();
      const fault = new Error('storage interrupted');
      const interrupted: JournalStorage = {
        ...storage,
        async writeStream(key, stream) {
          if (key === failedKey) {
            throw fault;
          }
          await storage.writeStream(key, stream);
        },
        async replaceMetadata(key, bytes) {
          if (key === failedKey) {
            throw fault;
          }
          await storage.replaceMetadata(key, bytes);
        },
      };
      const attempt = new ImportJournal(interrupted, [], checkpoint);
      await attempt.append(outcome(3));
      await assert.rejects(attempt.flush(), (thrown) => thrown === fault);
      assert.deepEqual(await readJournalPosition(storage), { record: 1, part: 1 });

      const replay = new ImportJournal(storage, [], checkpoint);
      await replay.append(outcome(3, { status: 'skipped' }));
      const resumed = await replay.flush();
      const rows: RowOutcome[] = [];
      for await (const row of readOutcomeParts(storage, resumed)) {
        rows.push(row);
      }
      assert.deepEqual(rows, [outcome(2), outcome(3, { status: 'skipped' })]);
    },
  );

  it('flushes after one second without waiting for the next row', async function () {
    vi.useFakeTimers();
    try {
      const { storage } = storageFixture();
      const journal = new ImportJournal(storage, [], { record: 0, part: 0 });
      await journal.append(outcome(2));
      await vi.advanceTimersByTimeAsync(1000);
      assert.deepEqual(await readJournalPosition(storage), { record: 1, part: 1 });
      assert.deepEqual(await journal.flush(), { record: 1, part: 1 });
    } finally {
      vi.useRealTimers();
    }
  });

  it('flushes before exceeding the byte budget and isolates a larger outcome', async function () {
    const { storage } = storageFixture();
    const journal = new ImportJournal(storage, [], { record: 0, part: 0 });
    await journal.append(outcome(2));
    await journal.append(outcome(3, { title: 'x'.repeat(8 * 1024 * 1024) }));
    const position = await journal.flush();
    assert.deepEqual(position, { record: 2, part: 2 });
    const rows: RowOutcome[] = [];
    for await (const row of readOutcomeParts(storage, position)) {
      rows.push(row);
    }
    // Encoded outcomes can exceed the source-record limit; replay must still read them.
    assert.equal(rows[1].title?.length, 8 * 1024 * 1024);
  });
});
