import { hasFieldColumns, type CsvField } from '@tryghost/metafield-csv';
import type { Tracer } from '../../../lib/tracing/tracer';

// The outcome spans the members import and export record, in one place: each reports what it
// did in its own terms, and this decides the span names and attributes dashboards read.

/** What an import run reports about itself. */
export interface ImportAttempt {
  read(rows: number): void;
  /** The site's custom fields the run reads values for, from the rows it read. */
  readsFields(fields: readonly CsvField[], rows: readonly Record<string, unknown>[]): void;
  wrote(rows: { imported: number; rejected: number }): void;
}

export type ImportExportTracking = ReturnType<typeof importExportTracking>;

export function importExportTracking(tracer: Tracer) {
  return {
    /**
     * Each import run records one span, whichever way it ran: `inline` in its caller's own flow,
     * such as the request that uploaded the file or the Revue data import, or `background` in a
     * job after the request.
     */
    import<Result>(
      mode: 'inline' | 'background',
      run: (attempt: ImportAttempt) => Promise<Result>,
    ): Promise<Result> {
      return tracer.track('members.import.run', (span) => {
        span.setAttribute('mode', mode);
        return run({
          read(rows) {
            span.setAttribute('rows', rows);
          },
          readsFields(fields, rows) {
            span.setAttribute('has_custom_fields', hasFieldColumns(fields, rows));
          },
          wrote({ imported, rejected }) {
            span.setAttribute('imported', imported);
            span.setAttribute('rejected', rejected);
          },
        });
      });
    },
  };
}
