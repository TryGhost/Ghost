import errors from '@tryghost/errors';
import type { GhostAuth } from './create-auth';

type AuthContext = Awaited<GhostAuth['$context']>;

export type StripeConnectStateDeps = {
  /** Read per call: the instance is built by boot */
  getContext(): Promise<{
    internalAdapter: Pick<
      AuthContext['internalAdapter'],
      'createVerificationValue' | 'deleteVerificationByIdentifier' | 'findVerificationValue'
    >;
    adapter: Pick<AuthContext['adapter'], 'deleteMany'>;
  }>;
};

// Covers Stripe account onboarding and pasting the token back into Admin
export const STATE_TTL_MS = 60 * 60 * 1000;

const identifierFor = (userId: string) => `stripe-connect:${userId}`;

function requireUserId(userId: string | undefined): string {
  if (!userId) {
    throw new errors.NoPermissionError({ message: 'Stripe Connect requires a staff user.' });
  }
  return userId;
}

/**
 * Stripe Connect's OAuth state under `better-auth`, which has no
 * `req.session`: one `verifications` row per staff user, kept until a save
 * succeeds so a failed save can be retried, as on the legacy session.
 */
export function createStripeConnectState(deps: StripeConnectStateDeps) {
  return {
    /** Replaces any earlier state for the user */
    async set(userId: string | undefined, state: string): Promise<void> {
      const identifier = identifierFor(requireUserId(userId));
      const { internalAdapter } = await deps.getContext();
      await internalAdapter.deleteVerificationByIdentifier(identifier);
      await internalAdapter.createVerificationValue({
        identifier,
        value: state,
        expiresAt: new Date(Date.now() + STATE_TTL_MS),
      });
    },

    /** `null` when there is none or it has expired */
    async get(userId: string | undefined): Promise<string | null> {
      const identifier = identifierFor(requireUserId(userId));
      const { internalAdapter } = await deps.getContext();
      const row = await internalAdapter.findVerificationValue(identifier);
      return row && new Date(row.expiresAt) > new Date() ? row.value : null;
    },

    /**
     * Called once the token is saved, so the state works once. Deletes only
     * the row holding this state: a connection started meanwhile keeps its own.
     */
    async clear(userId: string | undefined, state: string): Promise<void> {
      const identifier = identifierFor(requireUserId(userId));
      const { adapter } = await deps.getContext();
      await adapter.deleteMany({
        model: 'verification',
        where: [
          { field: 'identifier', value: identifier },
          { field: 'value', value: state },
        ],
      });
    },
  };
}

export type StripeConnectState = ReturnType<typeof createStripeConnectState>;

let stripeConnectState: StripeConnectState | undefined;

/** Better Auth loads only under its engine, so callers check it first */
export default function getStripeConnectState(): StripeConnectState {
  if (!stripeConnectState) {
    const betterAuth = require('./index').default;

    stripeConnectState = createStripeConnectState({
      getContext: () => betterAuth.service.$context,
    });
  }
  return stripeConnectState;
}
