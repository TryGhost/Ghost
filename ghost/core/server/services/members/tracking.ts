import { portsOf, type RequirementName } from '@tryghost/checkout';
import type { Tracer } from '../../lib/tracing/tracer';

// The span a member's change of tier records. Its name and attributes are defined here, in one
// place, because the Stripe Checkout dashboard in TryGhost/k8s queries them by name: renaming one
// or an attribute breaks the dashboard until it's changed to match. The members API's member
// controller records the span, and reports to an attempt object what happened, in terms of the
// change, and the function below decides how each report is recorded on the span.

/**
 * What became of the answers a member gave to one requirement of the tier they changed to, the
 * same way a completed checkout records what became of what it asked for:
 *
 * - `none`: they gave no answer to it, as a client may not know of the requirement.
 * - `dropped`: none of its answers has a custom field to go to, as each one's field is archived.
 * - `given`: its answers were given, and the change went no further, as it was refused, such as
 *   for an address outside the countries the tier ships to, or it failed.
 * - `saved`: its answers were saved once the tier changed.
 * - `partly_saved`: some of its answers were saved once the tier changed, and the rest had no
 *   field to go to.
 * - `failed`: the tier changed, but saving its answers failed.
 */
type RequirementOutcome = 'none' | 'dropped' | 'given' | 'saved' | 'partly_saved' | 'failed';

/** What the members API reports to a `members.tier_change` span while a member changes tier. */
export interface TierChangeAttempt {
  /**
   * Called once the answers are worked out, before the tier changes, with the requirements of the
   * tier the member is changing to, the answers they gave by port, and the ports with a custom
   * field to go to.
   */
  answering(planned: {
    required: readonly { name: RequirementName }[];
    answers: Readonly<Partial<Record<string, unknown>>>;
    kept: ReadonlySet<string>;
  }): void;
  /** Called when the tier changed but saving the answers failed. */
  answersNotSaved(): void;
}

export type MembersTracking = ReturnType<typeof membersTracking>;

export function membersTracking({ tracer }: { tracer: Tracer }) {
  return {
    /**
     * Records one `members.tier_change` span for each change of a member's plan to a price of a
     * tier through the members API, such as a member moving to another tier in Portal, from the
     * change starting to the member's subscription being on the new price and their answers
     * saved. A change that keeps the tier, such as one of billing period, is recorded too.
     *
     * The `answers` attribute is `given` when the change carried answers to what the tier
     * requires, as Portal sends them, and `none` when it didn't, as a client that doesn't know of
     * requirements changes tier without them. When answers come with a change onto another tier
     * while checkouts collect answers, each requirement of the new tier has an attribute, named as
     * the requirement, such as `shipping`, saying what became of its answers (see
     * `RequirementOutcome`). A change without answers, one that keeps the tier, or one while
     * checkouts don't collect answers, has none. The span fails with `AnswersRefused` when the
     * change is refused for its answers, which leaves the member on their plan to correct them.
     */
    tierChange<Result>(
      { answered }: { answered: boolean },
      change: (attempt: TierChangeAttempt) => Promise<Result>,
    ): Promise<Result> {
      return tracer.track('members.tier_change', async (span) => {
        const record = (name: RequirementName, outcome: RequirementOutcome) =>
          span.setAttribute(name, outcome);
        span.setAttribute('answers', answered ? 'given' : 'none');
        // The requirements whose answers are saved once the tier changes, each with whether only
        // some of them have a field to go to.
        const saving: { name: RequirementName; partly: boolean }[] = [];
        let notSaved = false;
        const result = await change({
          answering({ required, answers, kept }) {
            for (const { name } of required) {
              const given = portsOf(name).filter((port) => Object.hasOwn(answers, port));
              const keptOf = given.filter((port) => kept.has(port));
              if (given.length === 0) {
                record(name, 'none');
              } else if (keptOf.length === 0) {
                record(name, 'dropped');
              } else {
                record(name, 'given');
                saving.push({ name, partly: keptOf.length < given.length });
              }
            }
          },
          answersNotSaved() {
            notSaved = true;
          },
        });
        for (const { name, partly } of saving) {
          if (notSaved) {
            record(name, 'failed');
          } else {
            record(name, partly ? 'partly_saved' : 'saved');
          }
        }
        return result;
      });
    },
  };
}
