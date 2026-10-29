export interface SupportRequestDraft {
  subject?: string;
  message?: string;
  source: string;
  pageUrl: string;
  context?: Record<string, string>;
}
