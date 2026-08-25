import Papa from 'papaparse';
import { z } from 'zod';

export function parseCSV(text: string): Record<string, string>[] {
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
  }) as { data: Array<Record<string, unknown>> };

  if (!parsed.data || parsed.data.length < 1) {
    return [];
  }

  return parsed.data.map((row: Record<string, unknown>) => {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[key] =
        typeof value === 'string'
          ? value
          : typeof value === 'number' || typeof value === 'boolean'
            ? String(value)
            : '';
    }
    return normalized;
  });
}

// The API hands back the raw import rows, where labels and newsletters are arrays of
// {name} objects and field names are internal (subscribed, not subscribed_to_emails).
// Downloaded as-is they render as [object Object] and cannot be fixed and re-uploaded,
// so rows are shaped into the members export vocabulary first, matching the emailed
// error report. The newsletters column only appears when the submitted file carried
// one: an empty cell in that column reads back as an explicit "no newsletters".
const nameEntrySchema = z.union([z.string(), z.object({ name: z.string() })]);

const rawErrorRowSchema = z.object({ error: z.string().catch('') }).catchall(z.unknown());

type RawErrorRow = z.infer<typeof rawErrorRowSchema>;

function joinNames(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (!Array.isArray(value)) {
    return '';
  }
  return value
    .map((item) => {
      const parsed = nameEntrySchema.safeParse(item);
      if (!parsed.success) {
        return '';
      }
      return typeof parsed.data === 'string' ? parsed.data : parsed.data.name;
    })
    .filter(Boolean)
    .join(',');
}

function cell(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function toExportErrorRow(row: RawErrorRow): Record<string, string> {
  const shaped: Record<string, string> = {
    email: cell(row.email),
    name: cell(row.name),
    note: cell(row.note),
    ...(row.subscribed !== undefined ? { subscribed_to_emails: cell(row.subscribed) } : {}),
    ...(row.complimentary_plan !== undefined
      ? { complimentary_plan: cell(row.complimentary_plan) }
      : {}),
    stripe_customer_id: cell(row.stripe_customer_id),
    created_at: cell(row.created_at),
    labels: joinNames(row.labels),
  };

  // An absent subscription column must stay absent. The importer treats a present
  // blank subscribed_to_emails cell as true, so inventing this column would change
  // subscription state when the error report is re-uploaded.
  if (row.newsletters !== undefined) {
    shaped.newsletters = joinNames(row.newsletters);
  }

  for (const [key, value] of Object.entries(row)) {
    if (key.startsWith('custom_fields.')) {
      shaped[key] = cell(value);
    }
  }

  shaped.gift_id = cell(row.gift_id);
  shaped.error = cell(row.error);

  return shaped;
}

export function unparseErrorCSV(rows: unknown[]): string {
  if (rows.length === 0) {
    return '';
  }

  const shaped = rows.map((row) => toExportErrorRow(rawErrorRowSchema.parse(row)));

  // Columns come from every row, not just the first: Papa.unparse otherwise takes the
  // header from the first row's keys, dropping an optional column (newsletters, a
  // custom field) that only a later row carries. The error column stays last.
  const columns: string[] = [];
  for (const row of shaped) {
    for (const key of Object.keys(row)) {
      if (key !== 'error' && !columns.includes(key)) {
        columns.push(key);
      }
    }
  }
  columns.push('error');

  return Papa.unparse(shaped, {
    quotes: true,
    escapeFormulae: true,
    columns,
  });
}
