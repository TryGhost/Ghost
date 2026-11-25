import type { RowOutcome, RowStatus } from './store';

const PREVIEW_LIMIT = 10;
export type OutcomeCounts = Record<RowStatus, number> & { warningRows: number };

export interface ImportSummary {
  id: string;
  status: 'complete' | 'failed';
  failureReason?: string;
  total: number;
  counts: OutcomeCounts;
  previewRows: RowOutcome[];
  hasPages: boolean;
  hasPosts: boolean;
}

export function createSummary(
  id: string,
  status: ImportSummary['status'],
  failureReason?: string,
): ImportSummary {
  return {
    id,
    status,
    failureReason,
    total: 0,
    counts: { created: 0, updated: 0, skipped: 0, failed: 0, warningRows: 0 },
    previewRows: [],
    hasPages: false,
    hasPosts: false,
  };
}

export function addOutcome(summary: ImportSummary, row: RowOutcome): void {
  summary.total += 1;
  summary.counts[row.status] += 1;
  if (row.warnings?.length) {
    summary.counts.warningRows += 1;
  }
  if (row.status === 'created' || row.status === 'updated') {
    if (row.postType === 'page') {
      summary.hasPages = true;
    } else {
      summary.hasPosts = true;
    }
    if (row.url && summary.previewRows.length < PREVIEW_LIMIT) {
      summary.previewRows.push({
        line: row.line,
        title: row.title,
        status: row.status,
        url: row.url,
      });
    }
  }
}
