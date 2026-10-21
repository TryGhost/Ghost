type AutomationEditAction = 'save' | 'publish' | 'republish' | 'unpublish';
type ConfirmableAutomationEditAction = 'publish' | 'republish' | 'unpublish';

export type AutomationEditState =
  | { phase: 'idle'; action?: undefined }
  | { phase: 'submitting' | 'failed'; action: AutomationEditAction }
  | { phase: 'confirming'; action: ConfirmableAutomationEditAction };

export type RunSortDirection = 'asc' | 'desc';

// The `paid_subscription_changed` trigger's tiers; an empty list is unanswered.
// Local until the API can hold it (NY-1733).
export type SubscriptionTransition = {
  from: 'any_paid' | string[];
  to: string[] | 'downgraded_to_free';
};
