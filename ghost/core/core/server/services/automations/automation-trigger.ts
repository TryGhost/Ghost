import ObjectId from 'bson-objectid';
import type { ReadonlyDeep } from 'type-fest';
import { z } from 'zod';

/**
 * What makes a member enter an automation.
 *
 * This replaces the old hard-coded `automations.slug` lookup: an automation is
 * selected by matching this shape against the member, not by its name.
 */
export type AutomationTrigger = { type: 'free' } | { type: 'paid'; tiers: 'all' | string[] };

/**
 * The member facts a trigger is matched against.
 *
 * `tierIds` means different things depending on the caller: when enqueuing it is
 * the set of tiers the member just gained, and when checking whether a run should
 * continue it is the set of tiers the member currently holds.
 */
export type TriggerMemberContext = Readonly<{
  status: string;
  tierIds: ReadonlyArray<string>;
}>;

const PAID_STATUSES: ReadonlySet<string> = new Set(['paid', 'gift']);

const tierIdSchema = z.string().refine((value) => ObjectId.isValid(value), {
  message: 'Tier ids must be object ids.',
});

const freeTriggerSchema = z.strictObject({
  type: z.literal('free'),
});

const paidTriggerSchema = z.strictObject({
  type: z.literal('paid'),
  tiers: z.union([
    z.literal('all'),
    z
      .array(tierIdSchema)
      .min(1)
      .refine((tiers) => new Set(tiers).size === tiers.length, {
        message: 'Tiers must be unique.',
      }),
  ]),
});

export const automationTriggerSchema = z.discriminatedUnion('type', [
  freeTriggerSchema,
  paidTriggerSchema,
]) satisfies z.ZodType<AutomationTrigger, unknown>;

export function serializeAutomationTrigger(trigger: Readonly<AutomationTrigger>): string {
  return JSON.stringify(trigger);
}

/**
 * Read a trigger out of the database column.
 *
 * Returns `null` rather than throwing for anything unusable — a single
 * unparseable row should not break a poll for every other automation. Callers
 * treat a `null` trigger as "never matches".
 */
export function parseAutomationTrigger(raw: string | null | undefined): AutomationTrigger | null {
  if (typeof raw !== 'string') {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = automationTriggerSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

export function doesTriggerMatchMember(
  trigger: ReadonlyDeep<AutomationTrigger> | null,
  member: TriggerMemberContext,
): boolean {
  if (!trigger) {
    return false;
  }

  switch (trigger.type) {
    case 'free':
      return member.status === 'free';
    case 'paid': {
      if (!PAID_STATUSES.has(member.status)) {
        return false;
      }
      if (trigger.tiers === 'all') {
        return true;
      }
      const wanted = new Set(trigger.tiers);
      return member.tierIds.some((tierId) => wanted.has(tierId));
    }
  }
}
