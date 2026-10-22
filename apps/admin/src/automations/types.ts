import type { SubscriptionTransition } from '@tryghost/admin-x-framework/api/automations';

type AutomationEditAction = 'save' | 'publish' | 'republish' | 'unpublish';
type ConfirmableAutomationEditAction = 'publish' | 'republish' | 'unpublish';

export type AutomationEditState =
  | { phase: 'idle'; action?: undefined }
  | { phase: 'submitting' | 'failed'; action: AutomationEditAction }
  | { phase: 'confirming'; action: ConfirmableAutomationEditAction };

export type RunSortDirection = 'asc' | 'desc';

// An empty list represents an unanswered picker.
export type TierSelection = SubscriptionTransition;
