import type { AutomationSendWebhookAction } from '@tryghost/admin-x-framework/api/automations';

const TAG_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;
const SUPPORTED_TAGS = new Set(['member.id', 'member.email']);

const isHttpUrl = (url: string): boolean => {
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol);
  } catch {
    return false;
  }
};

const isJsonTemplate = (body: string): boolean => {
  try {
    // Tags are only valid inside JSON strings, so a placeholder keeps them there.
    JSON.parse(body.replace(TAG_PATTERN, 'x'));
    return true;
  } catch {
    return false;
  }
};

// The API doesn't validate webhooks, so this is the only check before publishing.
export const getWebhookError = (data: AutomationSendWebhookAction['data']): string | undefined => {
  if (!isHttpUrl(data.url.trim())) {
    return 'Enter an HTTP or HTTPS URL.';
  }
  if (!isJsonTemplate(data.body)) {
    return 'Enter a valid JSON body.';
  }
  const unsupportedTag = [...data.body.matchAll(TAG_PATTERN)].find(
    ([, name]) => !SUPPORTED_TAGS.has(name),
  );
  if (unsupportedTag) {
    return `${unsupportedTag[0]} isn’t supported. Use {{member.id}} or {{member.email}}.`;
  }
  return undefined;
};
