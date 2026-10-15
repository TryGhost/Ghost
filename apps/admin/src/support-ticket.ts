/** Replace with the real support-ticket webhook URL when available. */
export const SUPPORT_TICKET_WEBHOOK_URL = '';

export interface SupportTicketDraft {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  source: string;
  pageUrl: string;
  conversationUrl?: string;
  transcript?: string;
}

export interface SupportTicketPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
  source: string;
  siteUrl: string;
  pageUrl: string;
  conversationUrl: string | null;
  transcript: string | null;
}

export async function submitSupportTicket(payload: SupportTicketPayload): Promise<void> {
  if (!SUPPORT_TICKET_WEBHOOK_URL) {
    // eslint-disable-next-line no-console
    console.info('[Support ticket] Webhook is not configured', payload);
    throw new Error('Support ticket webhook is not configured');
  }

  // eslint-disable-next-line no-restricted-syntax -- external support webhook, not the Admin API
  const response = await fetch(SUPPORT_TICKET_WEBHOOK_URL, {
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
