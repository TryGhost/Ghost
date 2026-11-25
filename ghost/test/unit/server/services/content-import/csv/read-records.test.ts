import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { setImmediate } from 'node:timers/promises';
import {
  mapCSVRecord,
  readCSVRecords,
} from '../../../../../../core/server/services/content-import/csv/read-records';

async function collect<T>(records: AsyncIterable<T>): Promise<T[]> {
  const rows: T[] = [];
  for await (const row of records) {
    rows.push(row);
  }
  return rows;
}

describe('bounded CSV record reader', function () {
  it('handles UTF-8, alternate delimiters, multiline cells, blank and ragged records', async function () {
    const input = Buffer.from(
      '\uFEFFtitle,html\r\nFirst,"héllo\n""world"""\r\n,\r\nSecond\r\nThird,ok,overflow\r\n',
    );
    const records = await collect(
      readCSVRecords(Readable.from(Array.from(input, (byte) => Buffer.from([byte])))),
    );
    assert.deepEqual(records, [
      { columns: ['title', 'html'] },
      { cells: ['First', 'héllo\n"world"'], line: 2 },
      { cells: ['Second'], line: 4 },
      { cells: ['Third', 'ok', 'overflow'], line: 5 },
    ]);
  });

  it('accepts alternate delimiters detected in the bounded prefix', async function () {
    const input = Readable.from(['title;html\nOne;hello\nTwo;world\nThree;again\n']);
    const records = await collect(readCSVRecords(input));
    assert.deepEqual(records[0], { columns: ['title', 'html'] });
    assert.deepEqual(records[1], { cells: ['One', 'hello'], line: 2 });
  });

  it.each(['\n', '\r\n', '\r'])(
    'preserves %j record delimiters across source chunks',
    async function (newline) {
      const bytes = Buffer.from(['title,html', 'One,"First\nSecond"', 'Two,world'].join(newline));
      const source = Readable.from(Array.from(bytes, (byte) => Buffer.from([byte])));
      assert.deepEqual(await collect(readCSVRecords(source)), [
        { columns: ['title', 'html'] },
        { cells: ['One', 'First\nSecond'], line: 2 },
        { cells: ['Two', 'world'], line: 3 },
      ]);
    },
  );

  it('keeps duplicate headings distinct without overwriting existing suffixes', async function () {
    const records = await collect(readCSVRecords(Readable.from(['a,a,a_1\n1,2,3'])));
    assert.deepEqual(records[0], { columns: ['a', 'a_2', 'a_1'] });
  });

  it('bounds the raw record, including separators and quoted newlines', async function () {
    for (const input of ['title\n' + ','.repeat(13), 'title\n"first\nsecond"']) {
      await assert.rejects(
        collect(readCSVRecords(Readable.from([input]), { maxRecordBytes: 12 })),
        /record exceeds/,
      );
    }
    const boundary = await collect(
      readCSVRecords(Readable.from(['title\n123456789012']), { maxRecordBytes: 12 }),
    );
    assert.deepEqual(boundary.at(-1), { cells: ['123456789012'], line: 2 });
  });

  it('reports malformed quotes and propagates source errors', async function () {
    await assert.rejects(
      collect(readCSVRecords(Readable.from(['title\n"unfinished']))),
      /could not be parsed/,
    );
    const error = new Error('source unavailable');
    const input = Readable.from(
      (async function* () {
        yield 'title\n';
        throw error;
      })(),
    );
    await assert.rejects(collect(readCSVRecords(input)), (thrown) => thrown === error);
  });

  it('stops pulling a large input when inspection has enough records', async function () {
    let pulled = 0;
    const input = Readable.from(
      (async function* () {
        yield 'title\n';
        while (pulled < 10000) {
          pulled += 1;
          yield 'x'.repeat(1024) + '\n';
        }
      })(),
    );
    let sampled = 0;
    for await (const record of readCSVRecords(input)) {
      if ('cells' in record) {
        sampled += 1;
        if (sampled === 20) {
          break;
        }
      }
    }
    assert.equal(sampled, 20);
    assert.ok(pulled < 256, `read ${pulled} rows instead of buffering the file`);
    assert.equal(input.destroyed, true);
  });

  it('bounds read-ahead while a consumer is busy with a large record', async function () {
    const row = 'x'.repeat(256 * 1024 - 1) + '\n';
    let pulled = 0;
    const input = Readable.from(
      (async function* () {
        yield 'title\n';
        while (pulled < 200) {
          pulled += 1;
          yield row;
        }
      })(),
    );
    const records = readCSVRecords(input);
    try {
      assert.deepEqual((await records.next()).value, { columns: ['title'] });
      assert.deepEqual((await records.next()).value, { cells: [row.slice(0, -1)], line: 2 });
      await setImmediate();
      assert.ok(pulled <= 8, `buffered ${pulled} large records while waiting on one row`);
    } finally {
      await records.return(undefined);
    }
    assert.equal(input.destroyed, true);
  });

  it('maps cells without touching their original values or using unsafe keys', function () {
    const record = mapCSVRecord(
      ['Heading', '__proto__', 'ignored', 'short'],
      { cells: ["'=Example", 'source value', 'drop'], line: 5 },
      { Heading: 'title', ignored: '' },
    );
    assert.deepEqual(record?.data, { title: '=Example' });
    assert.equal(record?.source.Heading, "'=Example");
    assert.equal(record?.source.__proto__, 'source value');
    assert.equal(record?.source.ignored, 'drop');
    assert.equal(Object.hasOwn(record?.source ?? {}, 'short'), false);
    assert.equal(
      mapCSVRecord(['ignored'], { cells: ['skip'], line: 2 }, { ignored: '' }),
      undefined,
    );
  });
});
