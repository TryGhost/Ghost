import { parseWithSource, type Row } from '../csv';
import { EDITORIAL_POST_FIELDS, postImportRowSchema, type PostImportRow } from './row';

const FIELD_BY_HEADER: Record<string, string> = Object.fromEntries(
  EDITORIAL_POST_FIELDS.map((field) => [field, field]),
);

export interface PreparedPostRow {
  data: PostImportRow;
  source?: Row;
}

export interface PreparedPostRows {
  columns: string[];
  rows: PreparedPostRow[];
}

export default async function readPostRows(
  path: string,
  mapping?: Record<string, string>,
): Promise<PreparedPostRows> {
  const parsed = await parseWithSource(path, mapping ?? FIELD_BY_HEADER);
  return {
    columns: parsed.columns,
    rows: parsed.rows.map(({ data, source }) => ({
      data: postImportRowSchema.parse(data),
      source,
    })),
  };
}
