import type SendWebmentionsJob from './send-webmentions-job';

declare class MentionSendingService {
  sendWebmentions(job: SendWebmentionsJob): Promise<void>;
}

export = MentionSendingService;
