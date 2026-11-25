import { parseWithSource, type Row } from '../csv';
import type { Readable } from 'node:stream';
import { mapCSVRecord, readCSVRecords } from '../csv/read-records';
import { EDITORIAL_POST_FIELDS, postImportRowSchema, type PostImportRow } from './row';

const FIELD_BY_HEADER: Record<string, string> = Object.fromEntries(
  EDITORIAL_POST_FIELDS.map((field) => [field, field]),
);

export interface PreparedPostRow {
  data: PostImportRow;
  source?: Row;
  line: number;
}

export interface PreparedPostRows {
  columns: string[];
  rows: PreparedPostRow[];
}

export async function* streamPostRows(
  input: Readable,
  mapping: Record<string, string> = FIELD_BY_HEADER,
): AsyncGenerator<{ columns: string[] } | { row: PreparedPostRow }> {
  let columns: string[] = [];
  for await (const record of readCSVRecords(input)) {
    if ('columns' in record) {
      columns = record.columns;
      yield { columns };
    } else {
      const mapped = mapCSVRecord(columns, record, mapping);
      if (mapped) {
        yield { row: { ...mapped, data: postImportRowSchema.parse(mapped.data) } };
      }
    }
  }
}

export async function countPostRows(input: Readable, mapping?: Record<string, string>) {
  let columns: string[] = [];
  let total = 0;
  for await (const entry of streamPostRows(input, mapping)) {
    if ('columns' in entry) {
      columns = entry.columns;
    } else {
      total += 1;
    }
  }
  return { columns, total };
}

export default async function readPostRows(
  path: string,
  mapping?: Record<string, string>,
): Promise<PreparedPostRows> {
  const parsed = await parseWithSource(path, mapping ?? FIELD_BY_HEADER);
  return {
    columns: parsed.columns,
    rows: parsed.rows.map(({ data, source, line }) => ({
      data: postImportRowSchema.parse(data),
      source,
      line,
    })),
  };
}
