import type { Readable } from 'node:stream';
import { StringDecoder } from 'node:string_decoder';
import errors from '@tryghost/errors';
import { readCSVRecords } from '../csv/read-records';

const SAMPLE_ROWS = 20;
const SAMPLE_BYTES = 256 * 1024;

export async function readCSVPreview(input: Readable): Promise<{
  columns: string[];
  rows: Array<Record<string, string>>;
  total: number;
}> {
  let remaining = SAMPLE_BYTES;
  let total = 0;
  let columns: string[] = [];
  const rows: Array<Record<string, string>> = [];

  for await (const record of readCSVRecords(input)) {
    if ('columns' in record) {
      columns = record.columns;
      continue;
    }
    total += 1;
    if (rows.length === SAMPLE_ROWS) {
      continue;
    }
    const row: Record<string, string> = Object.create(null);
    for (let index = 0; index < columns.length && remaining > 0; index++) {
      const value = record.cells[index];
      if (!value) {
        continue;
      }
      const keyBytes = Buffer.byteLength(columns[index]);
      if (keyBytes >= remaining) {
        continue;
      }
      const sample = new StringDecoder('utf8').write(
        Buffer.from(value).subarray(0, remaining - keyBytes),
      );
      row[columns[index]] = sample;
      remaining -= keyBytes + Buffer.byteLength(sample);
    }
    rows.push(row);
  }
  if (!rows.length) {
    throw new errors.ValidationError({
      message: 'File is empty, nothing to import. Please select a different file.',
    });
  }
  return { columns, rows, total };
}
