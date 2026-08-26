import crypto from 'crypto';
const ghostVersion = require('@tryghost/version');

const REQUEST_TIMEOUT_MS = 30_000;

type SignedWebhookRequestOptions = {
  method: 'POST';
  body: string;
  headers: Record<string, string | number>;
  timeout: { request: number };
  retry: { limit: number };
};

/**
 * Wire format for webhooks Ghost posts to the host (e.g. email verification,
 * export archive requests). The receiver verifies
 * `X-Ghost-Signature: base64(HMAC-SHA256(secret, "{timestamp}:{rawBody}"))`
 * against the raw request body, so the body must be sent exactly as signed.
 */
export function computeWebhookSignature(timestamp: string, body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(`${timestamp}:${body}`).digest('base64');
}

/**
 * Reduces a webhook URL to its origin so logs never leak credentials or
 * tokens embedded in the path or query string.
 */
export function sanitizeWebhookUrl(webhookUrl: string): string {
  try {
    return new URL(webhookUrl).origin;
  } catch {
    return '[invalid webhook url]';
  }
}

/**
 * Builds the request options for a signed host webhook delivery. When no
 * secret is configured the payload is sent unsigned (the receiver decides
 * whether to accept that).
 */
export function buildSignedWebhookRequest({
  payload,
  secret,
  retryLimit,
}: {
  payload: unknown;
  secret?: string;
  retryLimit: number;
}): SignedWebhookRequestOptions {
  const body = JSON.stringify(payload);
  const timestamp = Date.now().toString();

  const headers: Record<string, string | number> = {
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'application/json',
    'Content-Version': `v${ghostVersion.safe}`,
    'X-Ghost-Request-Timestamp': timestamp,
  };

  if (secret) {
    headers['X-Ghost-Signature'] = computeWebhookSignature(timestamp, body, secret);
  }

  return {
    method: 'POST',
    body,
    headers,
    timeout: {
      request: REQUEST_TIMEOUT_MS,
    },
    retry: {
      limit: retryLimit,
    },
  };
}
