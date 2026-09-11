import logging from '@tryghost/logging';
import { z } from 'zod';

export type ConfigReader = { get: (key: string) => unknown };

const MailgunConfig = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().min(1),
  domain: z.string().min(1),
});
type MailgunConfig = z.output<typeof MailgunConfig>;
// Only the Mailgun block is read here; the rest of `bulkEmail` belongs to sending.
const BulkEmailConfig = z.object({ mailgun: z.unknown().optional() });
const OptionalString = z.string().optional().nullable();
// An unexpected type in config or settings counts as absent rather than throwing.
const optionalString = (value: unknown): string | undefined => {
  const parsed = OptionalString.safeParse(value);
  return parsed.success ? (parsed.data ?? undefined) : undefined;
};

/**
 * Config takes precedence as a whole: a present `bulkEmail.mailgun` block is
 * used even when settings are complete, and an invalid block disables Mailgun
 * rather than silently falling back to settings. Settings are used only when
 * all three values exist.
 */
export function getMailgunConfig(
  config: ConfigReader,
  settings: ConfigReader,
): MailgunConfig | null {
  const bulkEmail = BulkEmailConfig.safeParse(config.get('bulkEmail'));
  if (bulkEmail.success && bulkEmail.data.mailgun !== undefined) {
    const configured = MailgunConfig.safeParse(bulkEmail.data.mailgun);
    if (!configured.success) {
      logging.warn(
        '[Mailgun] Ignoring invalid bulkEmail.mailgun config: apiKey, baseUrl and domain must be non-empty strings',
      );
      return null;
    }
    return configured.data;
  }
  const setting = (key: string) => optionalString(settings.get(key));
  const fromSettings = MailgunConfig.safeParse({
    apiKey: setting('mailgun_api_key'),
    domain: setting('mailgun_domain'),
    baseUrl: setting('mailgun_base_url'),
  });
  return fromSettings.success ? fromSettings.data : null;
}

/** During domain warming, both sources still contain events for the same site. */
export function getMailgunDomains(config: ConfigReader, primary: string): string[] {
  const fallback = optionalString(config.get('hostSettings:managedEmail:fallbackDomain'));
  return fallback && fallback !== primary ? [primary, fallback] : [primary];
}
