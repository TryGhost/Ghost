import { z } from 'zod';

/**
 * The metadata key of the stamp Ghost puts on each Checkout session it creates: the uuid of the
 * site that created the session. Stripe sends every event on an account to every site connected
 * to it, so the webhook reads the stamp to skip completed checkouts that another site created.
 *
 * Subscriptions aren't stamped. Subscription and invoice events are matched to members by Stripe
 * customer ID, which a members import keeps when a site moves to a new install, while the moved
 * site gets a new uuid. A subscription stamped with the old uuid would be skipped by its own site.
 */
const SITE_KEY = 'ghost_site_uuid';

/**
 * Stamps a Checkout session with the site's uuid, in the session metadata. The stamp is added
 * last, so metadata passed by a caller can't overwrite it.
 */
export function stamp<Session extends { metadata?: Record<string, unknown> }>(
  session: Session,
  siteUuid: string,
): Session & { metadata: Record<string, unknown> } {
  return { ...session, metadata: { ...session.metadata, [SITE_KEY]: siteUuid } };
}

const StampedSession = z.object({ metadata: z.object({ [SITE_KEY]: z.string() }).loose() }).loose();

/**
 * Returns the site uuid a Checkout session is stamped with, or undefined when the session isn't
 * stamped, such as a session created through a Stripe Payment Link.
 */
export function stampedSiteUuid(session: unknown): string | undefined {
  const stamped = StampedSession.safeParse(session);
  return stamped.success ? stamped.data.metadata[SITE_KEY] : undefined;
}
