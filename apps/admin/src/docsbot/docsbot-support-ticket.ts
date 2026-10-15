import { type DocsBotSupportRequest, formatDocsBotHistory } from './use-docsbot';
import type { SupportRequestDraft } from '@/support-request';

export const DOCSBOT_SUPPORT_REQUEST_THANKS_MESSAGE =
  'Thanks — your support request has been sent. Our team will follow up by email.';

export function toSupportRequestDraft(supportRequest: DocsBotSupportRequest): SupportRequestDraft {
  return {
    name: supportRequest.metadata.name,
    email: supportRequest.metadata.email,
    subject: supportRequest.ticket?.subject,
    message: supportRequest.ticket?.message,
    source: 'docsbot',
    pageUrl: supportRequest.currentUrl,
    conversationUrl: supportRequest.metadata.conversationUrl,
    transcript: formatDocsBotHistory(supportRequest.history),
  };
}
