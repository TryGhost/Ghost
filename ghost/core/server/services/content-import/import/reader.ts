import type { Row } from '../csv';
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
  rows: AsyncIterable<PreparedPostRow>;
  close(): Promise<void>;
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

export default async function readPostRows(
  input: Readable,
  mapping?: Record<string, string>,
): Promise<PreparedPostRows> {
  const records = streamPostRows(input, mapping);
  const header = await records.next();
  const columns = !header.done && 'columns' in header.value ? header.value.columns : [];

  return {
    columns,
    rows: (async function* () {
      for await (const record of records) {
        if ('row' in record) {
          yield record.row;
        }
      }
    })(),
    close: async () => {
      await records.return(undefined);
    },
  };
}
