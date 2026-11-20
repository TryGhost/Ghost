// The in-memory record of what a content import did: one run per upload, one
// outcome per row. Nothing is persisted; the durable job system milestone
// replaces this.

// skipped = an otherwise valid row required no write (for example a duplicate);
// failed = the row could not produce a post, including source validation errors.
export type Clock = () => Date;

export type RowStatus = 'created' | 'updated' | 'skipped' | 'failed';

export interface DuplicateMetadata {
  origin: 'this_import' | 'pre_existing';
  matchedBy: 'source_id' | 'slug';
}

export interface RowOutcome {
  // Source line number as a publisher sees it in a spreadsheet: the header is
  // line 1, so the first data row is line 2.
  line: number;
  title: string | null;
  status: RowStatus;
  reason?: string;
  duplicate?: DuplicateMetadata;
  mediaFailures?: Array<{ sourceUrl: string; reason: string }>;
  warnings?: string[];
  postId?: string;
  postType?: 'post' | 'page';
  url?: string;
  source?: Record<string, string>;
}

export interface ImportRun {
  id: string;
  status: 'running' | 'complete' | 'failed';
  startedAt: Date;
  finishedAt?: Date;
  failureReason?: string;
  total: number;
  sourceColumns: string[];
  rows: RowOutcome[];
}

export class ImportRunStore {
  private _runs = new Map<string, ImportRun>();
  private _now: Clock;

  constructor({ now = () => new Date() }: { now?: Clock } = {}) {
    this._now = now;
  }

  create(id: string, total: number, sourceColumns: string[] = []): ImportRun {
    const run: ImportRun = {
      id,
      status: 'running',
      startedAt: this._now(),
      total,
      sourceColumns,
      rows: [],
    };
    this._runs.set(id, run);
    return run;
  }

  record(id: string, outcome: RowOutcome): void {
    this._runs.get(id)?.rows.push(outcome);
  }

  finish(id: string): void {
    const run = this._runs.get(id);
    if (run) {
      run.status = 'complete';
      run.finishedAt = this._now();
    }
  }

  fail(id: string, reason: string): void {
    const run = this._runs.get(id);
    if (run) {
      run.status = 'failed';
      run.failureReason = reason;
      run.finishedAt = this._now();
    }
  }

  get(id: string): ImportRun | undefined {
    return this._runs.get(id);
  }

  release(id: string): void {
    this._runs.delete(id);
  }
}
