import type {
  AutomationLabelFilterRule,
  AutomationTriggerRule,
} from '@tryghost/admin-x-framework/api/automations';

type AutomationEditAction = 'save' | 'publish' | 'republish' | 'unpublish';
type ConfirmableAutomationEditAction = 'publish' | 'republish' | 'unpublish';

export type AutomationEditState =
  | { phase: 'idle'; action?: undefined }
  | { phase: 'submitting' | 'failed'; action: AutomationEditAction }
  | { phase: 'confirming'; action: ConfirmableAutomationEditAction };

export type RunSortDirection = 'asc' | 'desc';

export type AutomationEventRule = Exclude<AutomationTriggerRule, AutomationLabelFilterRule>;

export type LabelQuery = {
  labels: ReadonlyArray<{ id: string; name: string }>;
  isLoading: boolean;
  isError: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
};

export type LabelFilterOperator = AutomationLabelFilterRule['operator'];

// A condition card that has been added to the canvas but has no labels yet.
export type PendingCondition = { operator: LabelFilterOperator | null };

// The From and To selections for a paid subscription change; an empty list means no selection.
export type TierSelection = {
  from: 'any_paid' | string[];
  to: string[] | 'downgraded_to_free';
};
