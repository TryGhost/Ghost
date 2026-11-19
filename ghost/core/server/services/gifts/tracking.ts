import type { Tracer } from '../../lib/tracing/tracer';
import type { AnswersPlanned, requirementOutcomes } from '../members/tracking';

// Defines the `gifts.redemption` span. The span's name and attributes are defined in this one file
// because dashboards query them by name, so renaming one breaks those dashboards. The gift service
// calls `redemption()` and reports events on the attempt object, and this file decides how each
// event is recorded on the span.

/** The events the gift service reports while a member redeems a gift. */
export interface GiftRedemptionAttempt {
  /**
   * Called after `answers` is validated and before the gift is redeemed. Receives the tier's
   * requirements, the values the redeemer sent keyed by checkout port, and the ports that are
   * bound to an active custom field.
   */
  answering(planned: AnswersPlanned): void;
}

export type GiftsTracking = ReturnType<typeof giftsTracking>;

export function giftsTracking({
  tracer,
  outcomes: outcomesFor,
}: {
  tracer: Tracer;
  /** Records each requirement's outcome on the span. Shared with the tier change span. */
  outcomes: typeof requirementOutcomes;
}) {
  return {
    /**
     * Records one `gifts.redemption` span for each redemption attempt.
     *
     * Attributes:
     * - `answers` is `given` when the request included `answers`, and `none` when it didn't, which
     *   is what an older Portal sends.
     * - Each of the tier's requirements has an attribute named after it, such as `shipping`. Its
     *   value is the outcome for that requirement's values (see `RequirementOutcome`). These are
     *   only set when the request included `answers` and the checkout collection flag is on.
     *
     * A requirement's outcome is never `failed` here. The values are saved in the redemption's
     * transaction, so if saving them fails the gift isn't redeemed either, and the outcome stays
     * `given`.
     *
     * The span fails when the gift isn't redeemed, for example when `answers` fails validation.
     */
    redemption<Result>(
      { answered }: { answered: boolean },
      redeem: (attempt: GiftRedemptionAttempt) => Promise<Result>,
    ): Promise<Result> {
      return tracer.track('gifts.redemption', async (span) => {
        span.setAttribute('answers', answered ? 'given' : 'none');
        const outcomes = outcomesFor((name, outcome) => span.setAttribute(name, outcome));
        const result = await redeem({ answering: outcomes.answering });
        outcomes.settled({ saved: true });
        return result;
      });
    },
  };
}
