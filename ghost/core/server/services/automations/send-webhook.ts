import errors from '@tryghost/errors';
import type { SendWebhookConfig } from './automations-repository';

export const WEBHOOK_TIMEOUT_MS = 15_000;

type WebhookMember = Readonly<{ id: string; email: string }>;

/**
 * Replace `{{member.id}}` and `{{member.email}}` in a JSON body. Values are
 * JSON-escaped (without quotes) so they're safe inside JSON strings. Other
 * tags are left untouched.
 */
export const renderWebhookBody = (body: string, member: WebhookMember): string => {
  const values = new Map([
    ['member.id', member.id],
    ['member.email', member.email],
  ]);
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (tag, name: string) => {
    const value = values.get(name);
    return value === undefined ? tag : JSON.stringify(value).slice(1, -1);
  });
};

/**
 * Send a webhook. Resolves if the request succeeded with a 2xx response;
 * rejects otherwise, including for redirects and timeouts.
 */
export const sendWebhook = async (
  config: Readonly<SendWebhookConfig>,
  member: WebhookMember,
): Promise<void> => {
  const response = await fetch(config.url, {
    method: config.method,
    headers: { 'Content-Type': 'application/json' },
    body: renderWebhookBody(config.body, member),
    redirect: 'manual',
    signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
  });
  await response.body?.cancel();
  if (response.status < 200 || response.status > 299) {
    throw new errors.InternalServerError({
      message: `Webhook responded with HTTP ${response.status}`,
    });
  }
};
