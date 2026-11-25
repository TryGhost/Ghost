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
