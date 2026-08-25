// The in-memory record of what a content import did: one run per upload, one
// outcome per row. Nothing is persisted; the durable job system milestone
// replaces this.

// skipped = the row was never attempted (the publisher can fix the file);
// failed = the write was attempted and lost.
export type Clock = () => Date;

export type RowStatus = 'created' | 'skipped' | 'failed';

export interface RowOutcome {
  // Source line number as a publisher sees it in a spreadsheet: the header is
  // line 1, so the first data row is line 2.
  line: number;
  title: string | null;
  status: RowStatus;
  reason?: string;
  postId?: string;
  url?: string;
}

export interface ImportRun {
  id: string;
  status: 'running' | 'complete' | 'failed';
  startedAt: Date;
  finishedAt?: Date;
  failureReason?: string;
  total: number;
  rows: RowOutcome[];
}

// Both bounds are applied lazily on create() so no timer keeps the process alive.
const MAX_RUNS = 10;
const MAX_RUN_AGE_MS = 60 * 60 * 1000;

export class ImportRunStore {
  // Insertion-ordered, so count-eviction drops the oldest run first.
  private _runs = new Map<string, ImportRun>();
  private _now: Clock;

  constructor({ now = () => new Date() }: { now?: Clock } = {}) {
    this._now = now;
  }

  create(id: string, total: number): ImportRun {
    this.evict();

    const run: ImportRun = {
      id,
      status: 'running',
      startedAt: this._now(),
      total,
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

  // A running run is never evicted, whatever its age: the job holds only the runId,
  // so evicting mid-import would silently turn its record()/finish() calls into
  // no-ops and lose the report. The count cap can briefly overshoot while several
  // imports run at once; the inline job queue bounds how many that can be.
  private evict(): void {
    const cutoff = this._now().getTime() - MAX_RUN_AGE_MS;
    for (const [id, run] of this._runs) {
      const lastTouched = (run.finishedAt ?? run.startedAt).getTime();
      if (run.status !== 'running' && lastTouched < cutoff) {
        this._runs.delete(id);
      }
    }

    while (this._runs.size >= MAX_RUNS) {
      const oldestEvictable = [...this._runs.values()].find((run) => run.status !== 'running');
      if (!oldestEvictable) {
        break;
      }
      this._runs.delete(oldestEvictable.id);
    }
  }
}
