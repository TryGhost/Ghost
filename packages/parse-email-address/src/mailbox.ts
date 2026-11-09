import addressparser from 'nodemailer/lib/addressparser/index.js';

export type Mailbox = {
  /** The email address */
  address: string;
  /** Optional name associated with the email */
  name?: string;
};

/**
 * Parse one mailbox without validating or normalizing its address.
 * @param email Email string to parse
 * @returns Parsed mailbox, or null for empty input, lists and groups
 */
export const parseMailbox = (email: string): null | Mailbox => {
  if (!email || typeof email !== 'string' || !email.length) {
    return null;
  }

  const parsed = addressparser(email);

  if (parsed.length !== 1) {
    return null;
  }
  const first = parsed[0];

  // Check first has a group property
  if (!first || 'group' in first) {
    // Unsupported format
    return null;
  }

  return {
    address: first.address,
    name: first.name || undefined,
  };
};

/** Format mailbox text without validation, normalization or delivery workarounds. */
export const formatMailbox = (mailbox: Readonly<Mailbox>): string => {
  if (!mailbox.name) {
    return mailbox.address;
  }

  const escapedName = mailbox.name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escapedName}" <${mailbox.address}>`;
};
