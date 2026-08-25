import { parse as parseCSV } from '../csv';
import { EDITORIAL_POST_FIELDS, postImportRowSchema, type PostImportRow } from './row';

const FIELD_BY_HEADER: Record<string, string> = Object.fromEntries(
  EDITORIAL_POST_FIELDS.map((field) => [field, field]),
);

export default async function readPostRows(
  path: string,
  mapping?: Record<string, string>,
): Promise<PostImportRow[]> {
  const rows = await parseCSV(path, mapping ?? FIELD_BY_HEADER);
  return rows.map((row) => postImportRowSchema.parse(row));
}
