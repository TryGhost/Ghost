import papaparse from 'papaparse';

interface SerializeOptions {
  columns?: string[];
  header?: boolean;
}

// Import reports are opened in spreadsheets, so formula-shaped cells must never
// be emitted verbatim. Papa Parse prefixes them with an apostrophe when this
// option is enabled.
export default function serialize(
  rows: Array<Record<string, unknown>>,
  { columns, header = true }: SerializeOptions = {},
): string {
  return papaparse.unparse(rows, { columns, header, escapeFormulae: true });
}
