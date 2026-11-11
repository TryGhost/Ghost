import type { AutomationTriggerRule } from '@tryghost/admin-x-framework/api/automations';
import { LucideIcon } from '@tryghost/shade/utils';

export type PickedTrigger = AutomationTriggerRule['trigger_type'] | 'member_label_added';

// [trigger, icon, title, description], as listed in the new automation's trigger picker.
export type TriggerOption = readonly [
  PickedTrigger,
  React.ComponentType<{ className?: string }>,
  string,
  string,
];

export const FREE_SIGNUP_OPTION = [
  'free_signup',
  LucideIcon.UserPlus,
  'Free member signed up',
  'When someone signs up as a free member',
] as const satisfies TriggerOption;

export const PAID_STARTED_OPTION = [
  'paid_subscription_started',
  LucideIcon.CreditCard,
  'Paid subscription started',
  'When a new or free member starts a paid subscription',
] as const satisfies TriggerOption;

// Remains behind Labs while lifecycle enrollment and execution are being completed.
export const SUBSCRIPTION_CHANGED_OPTION = [
  'paid_subscription_changed',
  LucideIcon.ArrowRightLeft,
  'Paid subscription changed',
  "When a member's paid subscription moves to another tier or ends",
] as const satisfies TriggerOption;

// Behind the lead magnets flag until the API can save it (NY-1750). A label can be added to a free
// member, so it's offered with or without Stripe.
export const LABEL_ADDED_OPTION = [
  'member_label_added',
  LucideIcon.Tag,
  'Label added to a member',
  'When a label is added to a member',
] as const satisfies TriggerOption;
