import { serialize } from '../csv';
import type { ImportRun, RowOutcome } from './store';

const ANNOTATION_NAMES = ['import_status', 'import_reason', 'import_media_failures'] as const;

function isActionable(row: RowOutcome): boolean {
  return Boolean(row.source) && row.status === 'failed';
}

function uniqueColumnName(preferred: string, used: Set<string>): string {
  let candidate = preferred;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${preferred}_${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

export default function buildErrorsFile(run: ImportRun): string | undefined {
  const rows = run.rows.filter(isActionable);
  if (!rows.length) {
    return undefined;
  }

  const usedColumns = new Set(run.sourceColumns);
  const [outcomeColumn, reasonColumn, mediaFailuresColumn] = ANNOTATION_NAMES.map((name) =>
    uniqueColumnName(name, usedColumns),
  );
  const columns = [outcomeColumn, reasonColumn, mediaFailuresColumn, ...run.sourceColumns];

  return serialize(
    rows.map((row) => {
      const sourceCells = Object.fromEntries(
        run.sourceColumns.map((column) => [column, row.source?.[column] ?? '']),
      );
      return {
        ...sourceCells,
        [outcomeColumn]: row.status,
        [reasonColumn]: row.reason ?? '',
        [mediaFailuresColumn]: row.mediaFailures?.length ? JSON.stringify(row.mediaFailures) : '',
      };
    }),
    { columns },
  );
}
