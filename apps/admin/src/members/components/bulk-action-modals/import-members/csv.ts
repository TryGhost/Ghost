import Papa from 'papaparse';

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
type RawErrorRow = Record<string, unknown> & { error: string };

function joinNames(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item : ((item as { name?: string }).name ?? '')))
      .filter(Boolean)
      .join(',');
  }
  return '';
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
    subscribed_to_emails: cell(row.subscribed),
    complimentary_plan: cell(row.complimentary_plan),
    stripe_customer_id: cell(row.stripe_customer_id),
    created_at: cell(row.created_at),
    labels: joinNames(row.labels),
  };

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

export function unparseErrorCSV(rows: RawErrorRow[]): string {
  if (rows.length === 0) {
    return '';
  }

  return Papa.unparse(rows.map(toExportErrorRow), {
    quotes: true,
  });
}
