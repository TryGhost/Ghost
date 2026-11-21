/**
 * Per-recipient Message-Id values for Mailgun batch sends. Mailgun mints one Message-Id per
 * API call, so without these every recipient shares it and readers' replies thread together.
 * Not to be confused with `./mailgun-message-id`, which normalizes the id Mailgun returns.
 */
import crypto from 'node:crypto';
import errors from '@tryghost/errors';

export const RECIPIENT_MESSAGE_ID_VARIABLE = 'message_id';

type RecipientVariables = Record<string, unknown>;
type RecipientData = Record<string, RecipientVariables>;

type MessageIdOptions = {
  emailId?: string | null;
  domain: string;
};

/**
 * Deterministic per (email, recipient) so a resubmitted batch reuses the same ids; the address
 * is hashed rather than exposed. Test emails have no email id and get a random prefix instead.
 * No angle brackets: the header template adds them.
 */
export function buildRecipientMessageId({
  emailId,
  recipientEmail,
  domain,
}: MessageIdOptions & { recipientEmail: string }): string {
  const prefix = emailId || crypto.randomUUID();
  const digest = crypto
    .createHash('sha256')
    .update(`${prefix}:${recipientEmail}`)
    .digest('hex')
    .slice(0, 32);

  return `${prefix}.${digest}@${domain}`;
}

/**
 * Mailgun returns the Message-Id it was given, so when the header is a per-recipient template it
 * comes back unsubstituted and identifies nothing.
 */
export function isTemplatedRecipientMessageId(messageId: unknown): boolean {
  return (
    typeof messageId === 'string' &&
    messageId.includes(`%recipient.${RECIPIENT_MESSAGE_ID_VARIABLE}%`)
  );
}

/**
 * Returns a new recipient-variables map with a `message_id` per recipient, built by `buildId`; the
 * input is not mutated. Each sender decides how its ids are built, such as from the newsletter
 * email id or the automation run step. Throws when an id is empty, which would leave the header
 * empty, or holds angle brackets or whitespace, which would break the `<%recipient.message_id%>`
 * header template.
 */
export function setRecipientMessageIds(
  recipientData: RecipientData,
  buildId: (recipientEmail: string) => string,
): RecipientData {
  const result: RecipientData = {};

  for (const [recipientEmail, variables] of Object.entries(recipientData)) {
    const messageId = buildId(recipientEmail);
    if (typeof messageId !== 'string' || messageId === '') {
      throw new errors.IncorrectUsageError({
        message: 'Every recipient needs a Message-Id',
      });
    }
    if (/[<>\s]/.test(messageId)) {
      throw new errors.IncorrectUsageError({
        message: 'Recipient Message-Ids must not contain angle brackets or whitespace',
      });
    }
    result[recipientEmail] = { ...variables, [RECIPIENT_MESSAGE_ID_VARIABLE]: messageId };
  }

  return result;
}
