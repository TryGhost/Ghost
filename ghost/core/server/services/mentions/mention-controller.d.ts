import type ProcessWebmentionJob from './process-webmention-job';

declare class MentionController {
  processWebmention(job: ProcessWebmentionJob): Promise<void>;
}

export = MentionController;
