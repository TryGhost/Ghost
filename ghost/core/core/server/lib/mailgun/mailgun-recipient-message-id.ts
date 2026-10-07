/**
 * Per-recipient Message-Id values for Mailgun batch sends. Mailgun mints one Message-Id per
 * API call, so without these every recipient shares it and readers' replies thread together.
 * Not to be confused with `./mailgun-message-id`, which normalizes the id Mailgun returns.
 */
import crypto from 'node:crypto';

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

/** Returns a new recipient-variables map with a `message_id` per recipient; the input is not mutated */
export function addRecipientMessageIds(
  recipientData: RecipientData,
  { emailId, domain }: MessageIdOptions,
): RecipientData {
  const result: RecipientData = {};

  for (const [recipientEmail, variables] of Object.entries(recipientData)) {
    result[recipientEmail] = {
      ...variables,
      [RECIPIENT_MESSAGE_ID_VARIABLE]: buildRecipientMessageId({ emailId, recipientEmail, domain }),
    };
  }

  return result;
}
