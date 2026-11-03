import { formatMailbox } from '@tryghost/parse-email-address/mailbox';
import type { Mailbox } from '@tryghost/parse-email-address/mailbox';

/** Format a sender for delivery, preserving the Gmail compatibility workaround. */
export function formatAddressForDelivery(mailbox: Readonly<Mailbox>): string {
  if (!mailbox.name) {
    return formatMailbox(mailbox);
  }

  // Gmail rejects these checkmarks in display names (ONC-969).
  const name = mailbox.name.replace(/[\u2705\u2713\u2714\u2611\u{1F5F8}]/gu, '').trim();
  // A nonempty name reduced to nothing historically retained an empty quoted name.
  return name ? formatMailbox({ ...mailbox, name }) : `"" <${mailbox.address}>`;
}
