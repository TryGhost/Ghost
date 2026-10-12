import type { DocsBotHistoryEntry, DocsBotMetadata } from '@tryghost/admin-x-framework';

/** Replace with the real support-ticket webhook URL when available. */
export const DOCSBOT_SUPPORT_WEBHOOK_URL = '';

export const DOCSBOT_SUPPORT_TICKET_THANKS_MESSAGE =
  'Thanks — your support ticket has been sent. Our team will follow up by email.';

export interface DocsBotSupportTicketPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
  history: string;
  rawHistory: DocsBotHistoryEntry[];
  siteUrl: string;
  currentUrl: string;
  metadata: DocsBotMetadata;
}

export async function submitDocsBotSupportTicket(
  payload: DocsBotSupportTicketPayload,
): Promise<void> {
  if (!DOCSBOT_SUPPORT_WEBHOOK_URL) {
    // eslint-disable-next-line no-console
    console.info('[DocsBot] Support ticket webhook is not configured', payload);
    throw new Error('Support ticket webhook is not configured');
  }

  // eslint-disable-next-line no-restricted-syntax -- external support webhook, not the Admin API
  const response = await fetch(DOCSBOT_SUPPORT_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Something went wrong, please try again later.');
  }
}
