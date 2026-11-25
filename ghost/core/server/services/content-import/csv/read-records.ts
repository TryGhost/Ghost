import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import errors from '@tryghost/errors';
import papaparse from 'papaparse';
import { stripFormulaGuard } from './formula';
import { parseCSVStream } from './parse-stream';
import type { ParsedRow, Row } from './parse';

export const MAX_CSV_RECORD_BYTES = 8 * 1024 * 1024;
const DELIMITER_SAMPLE_BYTES = 64 * 1024;

type CSVRecord = { columns: string[] } | { cells: string[]; line: number };

function recordTooLarge() {
  return new errors.ValidationError({ message: 'A CSV record exceeds the 8 MiB limit.' });
}

// Bound raw records before parsing, including separators and quoted newlines,
// so neither a huge field nor millions of empty cells can grow memory unbounded.
function limitRecords(delimiter: string, maxBytes: number): Transform {
  let bytes = 0;
  let quoted = false;
  let quoteEnded = false;
  let fieldStart = true;
  const separator = delimiter.charCodeAt(0);
  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      for (const byte of chunk) {
        if (quoteEnded && byte === 34) {
          quoted = true;
          quoteEnded = false;
        } else {
          quoteEnded = false;
          if (byte === 34 && quoted) {
            quoteEnded = true;
            quoted = false;
          } else if (byte === 34 && fieldStart) {
            quoted = true;
          } else if (!quoted && (byte === 10 || byte === 13)) {
            bytes = 0;
            fieldStart = true;
            continue;
          }
        }
        fieldStart = !quoted && byte === separator;
        bytes += 1;
        if (bytes > maxBytes) {
          callback(recordTooLarge());
          return;
        }
      }
      callback(null, chunk);
    },
  });
}

function uniqueHeaders(headers: string[]): string[] {
  const reserved = new Set(headers);
  const used = new Set<string>();
  return headers.map((header) => {
    let name = header;
    if (used.has(name)) {
      let suffix = 1;
      do {
        name = `${header}_${suffix}`;
        suffix += 1;
      } while (used.has(name) || reserved.has(name));
    }
    used.add(name);
    return name;
  });
}

export async function* readCSVRecords(
  input: Readable,
  { maxRecordBytes = MAX_CSV_RECORD_BYTES }: { maxRecordBytes?: number } = {},
): AsyncGenerator<CSVRecord> {
  const iterator = input[Symbol.asyncIterator]();
  const buffered: Buffer[] = [];
  const sample: Buffer[] = [];
  let remaining = DELIMITER_SAMPLE_BYTES;

  try {
    while (remaining > 0) {
      const next = await iterator.next();
      if (next.done) {
        break;
      }
      const chunk = Buffer.isBuffer(next.value) ? next.value : Buffer.from(next.value);
      buffered.push(chunk);
      sample.push(chunk.subarray(0, remaining));
      remaining -= chunk.length;
    }

    // Retain the old delimiter guessing rules, but only inspect a bounded prefix.
    const { delimiter, linebreak } = papaparse.parse(Buffer.concat(sample).toString('utf8'), {
      preview: 10,
      skipEmptyLines: 'greedy',
    }).meta;
    const replay = Readable.from(
      (async function* () {
        const prefix = Buffer.concat(buffered);
        buffered.length = 0;
        // Strip a UTF-8 BOM even when it arrived in separate source chunks.
        yield prefix.subarray(prefix.subarray(0, 3).equals(Buffer.from('\ufeff')) ? 3 : 0);
        for (;;) {
          const next = await iterator.next();
          if (next.done) {
            return;
          }
          yield next.value;
        }
      })(),
    );
    const limited = limitRecords(delimiter, maxRecordBytes);
    const pumping = pipeline(replay, limited).catch(() => {
      // The async iterator receives the same stream error; don't reject in the background.
    });

    let line = 0;
    try {
      for await (const cells of parseCSVStream(limited, {
        delimiter,
        newline: linebreak === '\r\n' || linebreak === '\r' ? linebreak : '\n',
      })) {
        line += 1;
        if (line === 1) {
          yield { columns: uniqueHeaders(cells) };
        } else if (cells.some((cell) => cell.trim().length > 0)) {
          yield { cells, line };
        }
      }
    } finally {
      // Inspection can stop after 20 records without reading the remaining file.
      input.destroy();
      limited.destroy();
      await pumping;
    }
  } finally {
    await iterator.return?.();
    input.destroy();
  }
}

export function mapCSVRecord(
  columns: string[],
  { cells, line }: { cells: string[]; line: number },
  mapping?: Record<string, string>,
): ParsedRow | undefined {
  const source: Row = Object.create(null);
  const data: Row = {};
  for (let index = 0; index < columns.length && index < cells.length; index++) {
    const column = columns[index];
    const value = cells[index];
    source[column] = value;
    const target = mapping && Object.hasOwn(mapping, column) ? mapping[column] : column;
    if (target && !(target in Object.prototype)) {
      data[target] = stripFormulaGuard(value);
    }
  }
  return Object.keys(data).length ? { data, source, line } : undefined;
}
