import { type DocsBotSupportRequest, formatDocsBotHistory } from '@tryghost/admin-x-framework';
import type { SupportTicketDraft } from './support-ticket';

export const DOCSBOT_SUPPORT_TICKET_THANKS_MESSAGE =
  'Thanks — your support ticket has been sent. Our team will follow up by email.';

export function toSupportTicketDraft(supportRequest: DocsBotSupportRequest): SupportTicketDraft {
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
