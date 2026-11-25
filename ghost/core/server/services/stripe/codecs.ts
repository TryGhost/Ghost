/**
 * Codecs for single fields of Stripe objects, shared by every place Stripe's data enters Ghost:
 * the webhook's event readers and the Stripe client's response schemas.
 */
import { z } from 'zod';
import tables from '../../data/schema/schema';
import { truncateCharacters } from '../../lib/truncate-characters';

/**
 * The longest name Ghost stores for a person from Stripe: the shortest of the name columns those
 * names are saved to, which are the member's, their Stripe customer's and a donation's.
 */
const NAME_LENGTH = Math.min(
  tables.members.name.maxlength,
  tables.members_stripe_customers.name.maxlength,
  tables.donation_payment_events.name.maxlength,
);

function fitName(name: string): string {
  return truncateCharacters(name, NAME_LENGTH);
}

/**
 * A name from Stripe, shortened to the length Ghost stores. Stripe accepts longer names than
 * Ghost does, and no one in Ghost can shorten them: by the time Stripe sends the webhook for a
 * checkout the buyer has paid, and staff linking a Stripe customer to a member didn't write the
 * customer's name. Refusing the name would fail the webhook on every retry, or the link, so Ghost
 * shortens it. That includes the name a buyer typed into the site's signup form, which reaches
 * Ghost through Stripe after they've paid. Names entered in Ghost and saved directly, such as in
 * Admin or through the Admin API, are still refused when they're too long.
 */
export const StripeName = z.string().transform(fitName);

/**
 * A reference from one Stripe object to another, such as a subscription's customer: the other
 * object's id, or the object itself when the request expanded it. Ghost reads only the id.
 */
export const ExpandableId = z
  .union([z.string(), z.object({ id: z.string() }).loose()])
  .transform((reference) => (typeof reference === 'string' ? reference : reference.id));
