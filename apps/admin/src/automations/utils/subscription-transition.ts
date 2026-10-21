import type { SubscriptionTransition } from '@/automations/types';

export const isTransitionSideUnanswered = (
  side: SubscriptionTransition['from'] | SubscriptionTransition['to'],
): boolean => Array.isArray(side) && side.length === 0;

export const isTransitionUnanswered = (transition: SubscriptionTransition): boolean =>
  isTransitionSideUnanswered(transition.from) || isTransitionSideUnanswered(transition.to);
