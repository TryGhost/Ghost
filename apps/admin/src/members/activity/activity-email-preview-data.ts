import type { Config } from '@tryghost/admin-x-framework/api/config';

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function string(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** Activity carries historical email objects, occasionally nested in a post. */
export function activityEmailPreviewData(value: unknown) {
  const source = record(value);
  const nested = record(source?.email);
  const stored = [source, nested].find(
    (candidate) => string(candidate?.html) && typeof candidate?.subject === 'string',
  );
  const newsletter = record(source?.newsletter) ?? record(nested?.newsletter);
  // An email id is not a post id. Only actual post-shaped objects may fall
  // back to their own id; welcome/automation ids must never hit this endpoint.
  const postId =
    string(source?.post_id) ||
    string(nested?.post_id) ||
    (typeof source?.title === 'string' ? string(source.id) : undefined);

  return {
    stored: stored ? { html: string(stored.html)!, subject: string(stored.subject)! } : undefined,
    postId,
    newsletter: newsletter
      ? {
          sender_name: string(newsletter.sender_name),
          sender_email: string(newsletter.sender_email),
        }
      : undefined,
  };
}

/** Matches Ember's sender-email-address helper, including managed domains. */
export function activitySenderAddress(
  sender: string | undefined,
  defaultAddress: string | undefined,
  config: Pick<Config, 'hostSettings'> | undefined,
): string {
  const managed = config?.hostSettings?.managedEmail;
  if (
    managed?.enabled &&
    (!managed.sendingDomain || sender?.split('@')[1] !== managed.sendingDomain)
  ) {
    return defaultAddress || '';
  }
  return sender || defaultAddress || '';
}

/** The document is additionally sandboxed; links in a historical preview are inert. */
export function activityPreviewDocument(html: string): string {
  const document = new DOMParser().parseFromString(html, 'text/html');
  document.querySelectorAll('a, area').forEach((link) => {
    link.removeAttribute('href');
    link.removeAttribute('target');
  });
  document.querySelectorAll('base, meta[http-equiv], form').forEach((element) => element.remove());
  const style = document.createElement('style');
  style.textContent = 'html { scrollbar-width: none; } html::-webkit-scrollbar { display: none; }';
  document.head.append(style);
  return `<!DOCTYPE html>${document.documentElement.outerHTML}`;
}
