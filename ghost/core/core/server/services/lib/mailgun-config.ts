export type ConfigReader = { get: (key: string) => unknown };

type MailgunConfig = { apiKey: string; baseUrl: string; domain: string };

/** Config takes precedence as a whole; settings are used only when all three exist. */
export function getMailgunConfig(
  config: ConfigReader,
  settings: ConfigReader,
): MailgunConfig | null {
  const bulkEmailConfig = config.get('bulkEmail') as { mailgun?: MailgunConfig } | undefined;
  const bulkEmailSetting = {
    apiKey: settings.get('mailgun_api_key') as string,
    domain: settings.get('mailgun_domain') as string,
    baseUrl: settings.get('mailgun_base_url') as string,
  };
  if (bulkEmailConfig?.mailgun) {
    return bulkEmailConfig.mailgun;
  }
  return bulkEmailSetting.apiKey && bulkEmailSetting.domain && bulkEmailSetting.baseUrl
    ? bulkEmailSetting
    : null;
}

/** During domain warming, both sources still contain events for the same site. */
export function getMailgunDomains(config: ConfigReader, primary: string): string[] {
  const fallback = config.get('hostSettings:managedEmail:fallbackDomain') as string | undefined;
  return fallback && fallback !== primary ? [primary, fallback] : [primary];
}
