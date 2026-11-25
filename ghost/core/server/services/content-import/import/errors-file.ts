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
  const format = createErrorsFileFormatter(run.sourceColumns);
  const rows = run.rows.flatMap((row) => {
    const error = format.row(row);
    return error ? [error] : [];
  });
  return rows.length ? [format.header, ...rows].join('\r\n') : undefined;
}

export function createErrorsFileFormatter(sourceColumns: string[]) {
  const usedColumns = new Set(sourceColumns);
  const [outcomeColumn, reasonColumn, mediaFailuresColumn] = ANNOTATION_NAMES.map((name) =>
    uniqueColumnName(name, usedColumns),
  );
  const columns = [outcomeColumn, reasonColumn, mediaFailuresColumn, ...sourceColumns];
  return {
    header: serialize([Object.fromEntries(columns.map((column) => [column, column]))], {
      columns,
      header: false,
    }),
    row(row: RowOutcome) {
      if (!isActionable(row)) {
        return undefined;
      }
      const sourceCells = Object.fromEntries(
        sourceColumns.map((column) => [column, row.source?.[column] ?? '']),
      );
      return serialize(
        [
          {
            ...sourceCells,
            [outcomeColumn]: row.status,
            [reasonColumn]: row.reason ?? '',
            [mediaFailuresColumn]: row.mediaFailures?.length
              ? JSON.stringify(row.mediaFailures)
              : '',
          },
        ],
        { columns, header: false },
      );
    },
  };
}
