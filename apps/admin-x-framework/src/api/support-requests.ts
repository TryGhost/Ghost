import { createMutation } from '../utils/api/hooks';

export type SupportRequest = {
  name: string;
  email: string;
  subject: string;
  message: string;
  source: string;
  pageUrl: string;
  conversationUrl: string | null;
  transcript: string | null;
};

export const useSendSupportRequest = createMutation<unknown, SupportRequest>({
  method: 'POST',
  path: () => '/support_requests/',
  body: (request) => ({
    support_requests: [
      {
        name: request.name,
        email: request.email,
        subject: request.subject,
        message: request.message,
        source: request.source,
        page_url: request.pageUrl,
        conversation_url: request.conversationUrl,
        transcript: request.transcript,
      },
    ],
  }),
  // Not idempotent: a lost response must not resend and duplicate the
  // support request.
  retry: false,
});
