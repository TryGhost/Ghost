import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { setImmediate } from 'node:timers/promises';
import { parseCSVStream } from '../../../../../../core/server/services/content-import/csv/parse-stream';

const options = { delimiter: ',', newline: '\n' } as const;

async function collect(input: Readable): Promise<string[][]> {
  const rows: string[][] = [];
  for await (const row of parseCSVStream(input, options)) {
    rows.push(row);
  }
  return rows;
}

describe('Papa Parse CSV stream', function () {
  it('preserves split UTF-8, multiline fields and escaped quotes', async function () {
    const bytes = Buffer.from('title,html\nCafé,"First\n""Second"" 🌍"');
    const source = Readable.from(Array.from(bytes, (byte) => Buffer.from([byte])));
    assert.deepEqual(await collect(source), [
      ['title', 'html'],
      ['Café', 'First\n"Second" 🌍'],
    ]);
    assert.equal(source.destroyed, true);
    assert.equal(source.listenerCount('close'), 0);
  });

  it.each([
    { cell: '"unfinished', message: 'Quoted field unterminated' },
    { cell: '"hello"world', message: 'Trailing quote on quoted field is malformed' },
  ])('rejects malformed quoting with its record number: $cell', async function ({ cell, message }) {
    const source = Readable.from(['title,html\nGood,"First\nSecond"\nBad,', cell]);
    await assert.rejects(collect(source), {
      name: 'ValidationError',
      message: `The CSV could not be parsed: ${message} (row 3).`,
    });
    assert.equal(source.destroyed, true);
  });

  it('pauses the input while a consumer is busy and closes it when the consumer stops', async function () {
    let pulled = 0;
    const source = Readable.from(
      (async function* () {
        while (pulled < 10000) {
          pulled += 1;
          yield `${pulled},value\n`;
        }
      })(),
      { highWaterMark: 1 },
    );
    const rows = parseCSVStream(source, options);
    assert.deepEqual((await rows.next()).value, ['1', 'value']);
    await setImmediate();
    assert.ok(pulled <= 4, `read ${pulled} rows while the consumer was busy`);
    await rows.return(undefined);
    assert.equal(source.destroyed, true);
  });

  it('propagates source errors before any rows and after processing has started', async function () {
    for (const initial of ['', 'first\nsecond\n']) {
      const failure = new Error('Storage read failed');
      const source = Readable.from(
        (async function* () {
          if (initial) {
            yield initial;
          }
          throw failure;
        })(),
      );
      await assert.rejects(collect(source), (error) => error === failure);
      assert.equal(source.destroyed, true);
    }
  });

  it('rejects a source that closes without ending instead of leaving the consumer waiting', async function () {
    const source = new Readable({ read() {} });
    const reading = collect(source);
    source.destroy();
    await assert.rejects(reading, /CSV input closed before parsing completed/);
  });

  it('closes the source when the consumer throws', async function () {
    const source = Readable.from(['one\ntwo\nthree']);
    const failure = new Error('Consumer failed');
    await assert.rejects(
      async () => {
        for await (const _row of parseCSVStream(source, options)) {
          throw failure;
        }
      },
      (error) => error === failure,
    );
    assert.equal(source.destroyed, true);
  });
});
