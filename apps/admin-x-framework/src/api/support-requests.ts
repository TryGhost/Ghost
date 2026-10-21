import { createMutation } from '../utils/api/hooks';

export type SupportRequest = {
  subject: string;
  message: string;
  source: string;
  pageUrl: string;
  context: Record<string, string>;
};

export const useSendSupportRequest = createMutation<unknown, SupportRequest>({
  method: 'POST',
  path: () => '/support_requests/',
  body: (request) => ({
    support_requests: [
      {
        subject: request.subject,
        message: request.message,
        source: request.source,
        page_url: request.pageUrl,
        context: request.context,
      },
    ],
  }),
  // Not idempotent: a lost response must not resend and duplicate the
  // support request.
  retry: false,
});
