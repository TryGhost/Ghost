/** Replace with the real support-request webhook URL when available. */
export const SUPPORT_REQUEST_WEBHOOK_URL = '';

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

export interface SupportRequestPayload {
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

export async function submitSupportRequest(payload: SupportRequestPayload): Promise<void> {
  if (!SUPPORT_REQUEST_WEBHOOK_URL) {
    // eslint-disable-next-line no-console
    console.info('[Support request] Webhook is not configured', payload);
    throw new Error('Support request webhook is not configured');
  }

  // eslint-disable-next-line no-restricted-syntax -- external support webhook, not the Admin API
  const response = await fetch(SUPPORT_REQUEST_WEBHOOK_URL, {
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
