export interface SupportRequestDraft {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  source: string;
  pageUrl: string;
  conversationUrl?: string;
  transcript?: string;
}
